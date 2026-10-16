/**
 * API Response Helpers
 *
 * Standardized response envelopes for all API routes.
 */

import { NextResponse } from 'next/server';
import type { ApiSuccessResponse, ApiErrorResponse } from '@/types';

export function successResponse<T>(data: T, status = 200): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

export function errorResponse(
  code: string,
  message: string,
  status = 400,
  details?: unknown
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: { code, message, details },
    },
    { status }
  );
}
