/**
 * Shared API response types.
 * All API routes should return data wrapped in these envelopes.
 */

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    requestId?: string;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    requestId?: string;
  };
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Pagination parameters.
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

/**
 * Base entity with common audit fields.
 */
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User roles (extend per domain as needed).
 */
export type UserRole = 'user' | 'admin' | 'staff';
