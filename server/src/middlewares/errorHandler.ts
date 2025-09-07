import { Request, Response, NextFunction } from 'express';
import { ZodError } from  'zod'
import { zodIssues, zodStatus } from '../utils/zod';

interface AppError extends Error {
  statusCode?: number;
  details?: any;
}

export const errorHandler = (
  err: AppError | any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {

  if (err instanceof ZodError) {
    const statusCode = zodStatus(err);
    const details = { issues: zodIssues(err) };
    return res.status(statusCode).json({
      message: statusCode === 422 ? 'Business rule violation' : 'Invalid request data',
      details,
    });
  }
  
  console.error(`[ERROR] ${err.message || 'Unknown error'}`);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  const details = err.details || undefined;

  if (details?._errors && Array.isArray(details._errors) && details._errors.length === 0) {
    delete details._errors; // remove empty _errors array
  }

  res.status(statusCode).json({ message, details });
};

export const createError = (message: string, statusCode: number = 500, details?: any) => {
  return { message, statusCode, details };
};
