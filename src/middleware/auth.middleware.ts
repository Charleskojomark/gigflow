import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, isTokenBlacklisted } from '../utils/token';
import { errorResponse } from '../utils/apiResponse';

declare global {
  namespace Express {
    interface Request {
      user?: { userId: string; role: string; email: string };
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    errorResponse({ res, statusCode: 401, message: 'No token provided' });
    return;
  }
  const token = authHeader.split(' ')[1];
  try {
    if (await isTokenBlacklisted(token)) {
      errorResponse({ res, statusCode: 401, message: 'Token has been revoked' });
      return;
    }
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch {
    errorResponse({ res, statusCode: 401, message: 'Invalid or expired token' });
  }
};

export const authorize = (...roles: string[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      errorResponse({ res, statusCode: 403, message: 'Forbidden: insufficient permissions' });
      return;
    }
    next();
  };
