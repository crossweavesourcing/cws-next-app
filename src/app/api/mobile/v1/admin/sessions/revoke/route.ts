import { NextResponse } from 'next/server';
import { AdminService } from '@/auth/services/admin.service';
import { InsufficientRoleError } from '@/auth/dal';
import { z } from 'zod';

const bodySchema = z.object({
  userId: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 });
    }

    const { userId } = parsed.data;
    const adminService = new AdminService();

    if (userId) {
      await adminService.revokeUserSessions(userId);
    } else {
      await adminService.revokeAllSessions();
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    console.error('[API] Error revoking sessions:', error);
    
    if (error instanceof InsufficientRoleError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if ((error instanceof Error ? error.message : String(error)).includes('own account') || (error instanceof Error ? error.message : String(error)).includes('Invalid user')) {
      return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 400 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
