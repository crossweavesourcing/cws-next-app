import type { NextRequest } from 'next/server';
import { authenticateBearerRequest, mobileJson } from '@/auth/lib/mobile';
import { UserIdParamSchema } from './openapi';

export const runtime = 'nodejs';

export async function OPTIONS(request: Request) {
  const { mobileOptions } = await import('@/auth/lib/mobile');
  return mobileOptions(request);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const paramResult = UserIdParamSchema.safeParse({ id });
  if (!paramResult.success) {
    return mobileJson(
      request,
      {
        error: 'Validation failed',
        details: paramResult.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
          code: i.code,
        })),
      },
      { status: 400 },
    );
  }

  const auth = await authenticateBearerRequest(request);
  if (!auth) {
    return mobileJson(request, { error: 'Unauthorized.' }, { status: 401 });
  }

  const { UserRepository } = await import('@/auth/repositories');
  const { ObjectId } = await import('mongodb');

  const repo = new UserRepository();
  const user = await repo.findById(new ObjectId(id));
  if (!user) {
    return mobileJson(request, { error: 'User not found.' }, { status: 404 });
  }

  if (auth.user.role !== 'admin' && !auth.user._id.equals(user._id)) {
    return mobileJson(request, { error: 'Forbidden.' }, { status: 403 });
  }

  return mobileJson(request, {
    id: user._id.toHexString(),
    role: user.role,
    status: user.status,
    profile: {
      displayName: user.profile.displayName,
      fullName: user.profile.fullName,
      employeeId: user.profile.employeeId,
      department: user.profile.department,
    },
    createdAt: user.createdAt.toISOString(),
  });
}
