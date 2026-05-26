import { Response } from 'express';

interface SuccessPayload {
  res: Response;
  statusCode?: number;
  message: string;
  data?: unknown;
  meta?: Record<string, unknown>;
}

interface ErrorPayload {
  res: Response;
  statusCode?: number;
  message: string;
  errors?: unknown;
}

export const successResponse = ({
  res,
  statusCode = 200,
  message,
  data,
  meta,
}: SuccessPayload): Response => {
  return res.status(statusCode).json({
    success: true,
    message,
    ...(data !== undefined && { data }),
    ...(meta && { meta }),
  });
};

export const errorResponse = ({
  res,
  statusCode = 500,
  message,
  errors,
}: ErrorPayload): Response => {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(errors !== undefined && { errors }),
  });
};
