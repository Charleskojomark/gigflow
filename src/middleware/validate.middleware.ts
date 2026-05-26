import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { errorResponse } from '../utils/apiResponse';

export const validate = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    errorResponse({
      res,
      statusCode: 422,
      message: 'Validation failed',
      errors: errors.array(),
    });
    return;
  }
  next();
};
