export type ApiSuccess<T> = {
  success: true;
  data: T;
  requestId: string;
};

export type ApiError = {
  success: false;
  error: {
    code: string;
    message: string;
    retryable?: boolean;
  };
  requestId: string;
};

export type ApiResult<T> = ApiSuccess<T> | ApiError;
