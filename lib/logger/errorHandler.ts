import { logger } from ".";

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const logAndThrow = (error: Error | AppError | unknown) => {
  if (error instanceof AppError) {
    logger.error({
      err: error,
      code: error.code,
      statusCode: error.statusCode,
      stack: error.stack,
      message: error.message,
    });
    throw error;
  } else if (error instanceof Error) {
    logger.error({
      err: error,
      stack: error.stack,
      message: error.message,
    });
    throw error;
  } else {
    logger.error("Unknown error:", error);
    throw new AppError("Internal Server Error");
  }
};

export const handleError = (error: Error | AppError | unknown) => {
  if (error instanceof AppError) {
    logger.error({
      err: error,
      code: error.code,
      statusCode: error.statusCode,
      stack: error.stack,
      message: error.message,
    });
  } else if (error instanceof Error) {
    logger.error({
      err: error,
      stack: error.stack,
      message: error.message,
    });
  } else {
    logger.error("Unknown error:", error);
  }
};
