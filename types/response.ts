export interface ApiError {
  message: string;
  details?: any;
}

export interface ApiResponse<T = any> {
  error: ApiError | null;
  success: boolean;
  data: T;
  code: number;
}

export enum HttpStatusCode {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503,
}

export function SuccessResponse<T>(
  data: T,
  code: number = HttpStatusCode.OK
): ApiResponse<T> {
  return {
    error: null,
    success: true,
    data,
    code,
  };
}

export function ErrorResponse(
  message: string,
  code: number = HttpStatusCode.INTERNAL_SERVER_ERROR,
  details?: any
): ApiResponse<null> {
  return {
    error: {
      message,
      details,
    },
    success: false,
    data: null,
    code,
  };
}
