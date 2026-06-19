/**
 * Validation Middleware using Zod Schema
 * @param {object} schema - Zod validation schema
 */
export const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    // Assign validated/sanitized data back to request
    if (parsed.body) {
      req.body = parsed.body; // Usually req.body is settable
    }
    if (parsed.query) {
      Object.keys(req.query).forEach(k => delete req.query[k]);
      Object.assign(req.query, parsed.query);
    }
    if (parsed.params) {
      Object.keys(req.params).forEach(k => delete req.params[k]);
      Object.assign(req.params, parsed.params);
    }

    next();
  } catch (error) {
    // Forward error to error middleware (which will format Zod errors properly)
    next(error);
  }
};

export default validate;
