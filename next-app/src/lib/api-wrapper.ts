import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './jwt';
import User from '../modules/users/user.model';
import dbConnect from './dbConnect';
import { checkRateLimit, RateLimitOptions } from './rate-limit';

export class ApiError extends Error {
  statusCode: number;
  code?: number;
  errors?: any;
  data?: any;

  constructor(statusCode: number, message: string, data?: any) {
    super(message);
    this.statusCode = statusCode;
    this.data = data;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export function handleError(err: any) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid format for field: ${err.path}`;
  }

  if (err.code === 11000) {
    statusCode = 400;
    const fieldName = err.keyValue ? Object.keys(err.keyValue)[0] : 'field';
    message = `Duplicate value error: ${fieldName} already exists`;
  }

  if (err.name === 'ZodError' || err.issues) {
    statusCode = 400;
    message = 'Validation failed';
    return NextResponse.json({
      status: 'error',
      statusCode,
      message,
      errors: err.errors || err.issues,
    }, { status: statusCode });
  }

  // Never leak raw internal error messages (DB drivers, stack context) to the
  // client in production. Deliberate ApiError instances (4xx) keep their message;
  // any unexpected 5xx is masked with a generic message.
  const isProd = process.env.NODE_ENV === 'production';
  const clientMessage =
    isProd && statusCode >= 500 && !(err instanceof ApiError)
      ? 'Internal Server Error'
      : message;

  const response: any = {
    status: 'error',
    statusCode,
    message: clientMessage,
    ...(err.code && { code: err.code }),
    ...(err.errors && { errors: err.errors }),
    ...(err.data && { data: err.data }),
    ...(!isProd && { stack: err.stack }),
  };

  // Always log the real error server-side (both dev and prod) for 5xx.
  if (!isProd) {
    console.error(`[API Error]`, err.stack || err);
  } else if (statusCode >= 500) {
    console.error(`[API Error]`, err.message || err);
  }

  return NextResponse.json(response, { status: statusCode });
}

type HandlerParams = {
  params?: Record<string, string>;
  user?: any; // The authenticated Mongoose user document
};

type ApiRouteHandler = (req: NextRequest, ctx: any) => Promise<NextResponse> | NextResponse;

export function apiHandler(handler: ApiRouteHandler, options: { protect?: boolean, restrictTo?: string[], rateLimit?: RateLimitOptions } = {}) {
  return async (req: NextRequest, context: any) => {
    try {
      if (options.rateLimit) {
        const result = await checkRateLimit(req, options.rateLimit);
        if (!result.success) {
          const retryAfterSeconds = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
          return NextResponse.json(
            { status: 'error', statusCode: 429, message: 'Too many requests. Please try again later.' },
            { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
          );
        }
      }

      await dbConnect();
      let user = null;

      if (options.protect) {
        const authHeader = req.headers.get('authorization');
        let token;
        
        if (authHeader && authHeader.startsWith('Bearer')) {
          token = authHeader.split(' ')[1];
        }

        if (!token) {
          throw new ApiError(401, 'You are not logged in. Please login to proceed.');
        }

        let decoded;
        try {
          decoded = verifyToken(token);
        } catch (err) {
          throw new ApiError(401, 'Invalid or expired authentication token. Please login again.');
        }

        // @ts-ignore
        user = await (User as any).findById(decoded.id);
        if (!user) {
          throw new ApiError(401, 'The user associated with this credentials no longer exists.');
        }

        if (options.restrictTo && options.restrictTo.length > 0) {
          if (!options.restrictTo.includes(user.role)) {
            throw new ApiError(403, 'Access Denied: Unauthorized role credentials.');
          }
        }
      }

      const params = context?.params ? await context.params : {}; return await handler(req, { params, user });
    } catch (err) {
      return handleError(err);
    }
  };
}

export async function parseBody(req: NextRequest) {
  try {
    const text = await req.text();
    // L3 fix: Explicitly throw on malformed JSON rather than silently returning
    // {} which produces confusing downstream 'required field missing' Zod errors.
    if (!text || text.trim() === '') return {};
    return JSON.parse(text);
  } catch (err) {
    throw new ApiError(400, 'Invalid or malformed request body. Please send valid JSON.');
  }
}


export function validate(schema: any, data: any) {
  return schema.parse(data);
}
