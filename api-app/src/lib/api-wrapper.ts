import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './jwt';
import User from '../modules/users/user.model';
import dbConnect from './dbConnect';

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

  const response: any = {
    status: 'error',
    statusCode,
    message,
    ...(err.code && { code: err.code }),
    ...(err.errors && { errors: err.errors }),
    ...(err.data && { data: err.data }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  };

  if (process.env.NODE_ENV === 'development') {
    console.error(`[API Error]`, err.stack || err);
  }

  return NextResponse.json(response, { status: statusCode });
}

type HandlerParams = {
  params?: Record<string, string>;
  user?: any; // The authenticated Mongoose user document
};

type ApiRouteHandler = (req: NextRequest, ctx: any) => Promise<NextResponse> | NextResponse;

export function apiHandler(handler: ApiRouteHandler, options: { protect?: boolean, restrictTo?: string[] } = {}) {
  return async (req: NextRequest, context: any) => {
    try {
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

        user = await User.findById(decoded.id);
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
    return await req.json();
  } catch (err) {
    return {};
  }
}

export function validate(schema: any, data: any) {
  return schema.parse(data);
}
