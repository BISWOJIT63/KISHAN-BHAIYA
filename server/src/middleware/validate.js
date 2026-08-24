import { HttpError } from '../utils/http.js';
export const validate = (schema) => (req,_res,next) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return next(new HttpError(400,'Please check the submitted fields',parsed.error.flatten()));
  req.body=parsed.data; next();
};
