import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ErrorResponseSchema } from '../contracts';
import { IdempotencyService } from '../integrations/idempotency';
import { auditService } from '../audit';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { decideAccess, DEMO_PRINCIPAL_ID, isDemoAllowed, parseList } from '@/modules/auth/access';

export interface ApiContext {
  userId: string | null;
  role: string;
  permissions: string[];
  requestId: string;
}

export interface ApiHandlerOptions<TReq = unknown> {
  req: Request;
  requireAuth?: boolean;
  requiredPermissions?: string[];
  idempotencyKey?: string | null;
  schema?: z.ZodType<TReq>;
  rateLimit?: {
    limit: number;
    windowSeconds: number;
    keyGen?: (req: Request, userId: string | null) => string;
  };
}

export type ApiHandler<TReq, TRes> = (ctx: ApiContext, input: TReq) => Promise<TRes>;

export class ApiRouteError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export function isClerkConfigured() {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  return Boolean(key && (key.startsWith('pk_test_') || key.startsWith('pk_live_')));
}

const profileCache = new Map<string, { email: string | null; role: unknown; expires: number }>();

async function clerkProfile(userId: string) {
  const cached = profileCache.get(userId);
  if (cached && cached.expires > Date.now()) return cached;
  try {
    const user = await (await clerkClient()).users.getUser(userId);
    const email = user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? null;
    const profile = { email, role: user.publicMetadata?.role, expires: Date.now() + 60_000 };
    profileCache.set(userId, profile);
    return profile;
  } catch {
    return { email: null, role: undefined, expires: 0 };
  }
}

async function resolveAccess(userId: string | null) {
  const demoAllowed = isDemoAllowed();
  const allowedUserIds = parseList(process.env.EXAMOPT_ADMIN_USER_IDS);
  const allowedEmails = parseList(process.env.EXAMOPT_ADMIN_EMAILS);
  const needsProfile = Boolean(userId && userId !== DEMO_PRINCIPAL_ID && !demoAllowed && !allowedUserIds.includes(userId.toLowerCase()));
  const profile = needsProfile ? await clerkProfile(userId!) : null;
  return decideAccess({ userId, demoAllowed, email: profile?.email, metadataRole: profile?.role, allowedUserIds, allowedEmails });
}

/**
 * Universal API Route Wrapper
 * Handles:
 * - Next.js Request / Response formatting
 * - Clerk Authentication (supports Mobile Bearer tokens via Clerk's middleware)
 * - Schema validation
 * - Error normalization
 * - Idempotency
 * - Request IDs
 */
export async function createApiRoute<TReq, TRes>(
  options: ApiHandlerOptions<TReq>,
  handler: ApiHandler<TReq, TRes>
): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  let userId: string | null = null;
  let role = 'guest';
  let permissions: string[] = [];

  try {
    // 1. Authentication
    try {
      if (isClerkConfigured()) {
        const authResult = await auth();
        userId = authResult?.userId || null;
      }
      
      // Anonymous demo principal: only in non-production demo mode.
      if (!userId && isDemoAllowed()) {
        userId = DEMO_PRINCIPAL_ID;
      }
    } catch {
      userId = isDemoAllowed() ? DEMO_PRINCIPAL_ID : null;
    }

    ({ role, permissions } = await resolveAccess(userId));

    if (options.requireAuth && !userId) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }

    if (options.requiredPermissions && options.requiredPermissions.length > 0) {
      const hasPermission = options.requiredPermissions.every(p => permissions.includes(p));
      if (!hasPermission) {
        return errorResponse('FORBIDDEN', 'Insufficient permissions', 403);
      }
    }

    // 1.5 Rate Limiting
    if (options.rateLimit) {
      const { rateLimiter } = await import('../rate-limit');
      const rlKey = options.rateLimit.keyGen 
        ? options.rateLimit.keyGen(options.req, userId)
        : `default:${userId || 'ip'}`;
      
      const rlResult = await rateLimiter.check(rlKey, options.rateLimit.limit, options.rateLimit.windowSeconds);
      if (!rlResult.allowed) {
        return errorResponse('TOO_MANY_REQUESTS', 'Rate limit exceeded', 429, { resetAt: rlResult.resetAt });
      }
    }

    // 2. Body Parsing & Validation
    let input: TReq = {} as TReq;
    if (options.schema && ['POST', 'PUT', 'PATCH'].includes(options.req.method)) {
      let body;
      try {
        body = await options.req.json();
      } catch (e) {
        return errorResponse('INVALID_JSON', 'Malformed JSON body', 400);
      }
      const parsed = options.schema.safeParse(body);
      if (!parsed.success) {
        return errorResponse('VALIDATION_ERROR', 'Invalid request payload', 400, parsed.error.format());
      }
      input = parsed.data;
    } else if (options.schema && options.req.method === 'GET') {
      const { searchParams } = new URL(options.req.url);
      const params = Object.fromEntries(searchParams.entries());
      const parsed = options.schema.safeParse(params);
      if (!parsed.success) {
        return errorResponse('VALIDATION_ERROR', 'Invalid query parameters', 400, parsed.error.format());
      }
      input = parsed.data;
    }

    const ctx: ApiContext = {
      userId,
      role,
      permissions,
      requestId,
    };

    // 3. Execution (with Idempotency)
    const execute = () => handler(ctx, input);

    let result: TRes;
    if (options.idempotencyKey) {
      result = await IdempotencyService.execute(`api-${options.idempotencyKey}`, execute);
    } else {
      result = await execute();
    }

    // 4. Success Response
    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      }
    });

  } catch (error: unknown) {
    console.error(`[API Error] ${options.req.method} ${options.req.url} - ${requestId}:`, error);
    if (error instanceof ApiRouteError) {
      return errorResponse(error.code, error.message, error.status, error.details);
    }
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      'status' in error &&
      typeof (error as { code?: unknown }).code === 'string' &&
      typeof (error as { status?: unknown }).status === 'number'
    ) {
      const repositoryError = error as { code: string; message: string; status: number };
      return errorResponse(repositoryError.code, repositoryError.message, repositoryError.status);
    }
    return errorResponse('INTERNAL_ERROR', 'The request could not be completed.', 500);
  }
}

function errorResponse(code: string, message: string, status: number, details?: unknown) {
  const payload = {
    success: false,
    error: {
      code,
      message,
      details,
    }
  };
  return NextResponse.json(payload, { status });
}
