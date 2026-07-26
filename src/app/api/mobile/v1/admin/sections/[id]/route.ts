import type { NextRequest } from 'next/server';
import { SectionService, SectionValidationError, type SectionUpdateInput } from '@/auth/services/section.service';
import { authenticateBearerRequest, mobileJson, mobileOptions, hasCmsPermission } from '@/auth/lib/mobile';
import type { SectionContent } from '@/lib/section-definitions';
import { SECTION_DEFINITION_MAP } from '@/lib/section-definitions';

export async function OPTIONS(request: NextRequest) {
  return mobileOptions(request);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateBearerRequest(request);
  if (!auth) return mobileJson(request, { error: 'Unauthorized' }, { status: 401 });
  if (!hasCmsPermission(auth.user, 'page_content')) return mobileJson(request, { error: 'Forbidden' }, { status: 403 });
  try {
    const { id } = await params;
    const actor = { userId: auth.user._id, sessionId: auth.session._id, source: 'mobile' as const };
    const service = new SectionService();
    const contentType = request.headers.get('content-type') ?? '';
    let input: SectionUpdateInput = {};
    const files = new Map<string, File>();

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const slotKey = String(formData.get('mediaSlot') || SECTION_DEFINITION_MAP.get(id)?.mediaSlots[0]?.key || 'background');
      const media = formData.get('media');
      if (media instanceof File && media.size > 0) files.set(slotKey, media);
      const paused = formData.get('paused');
      const content = formData.get('content');
      input = {
        ...(paused === null ? {} : { paused: paused === 'true' }),
        ...(typeof content === 'string' ? { content: JSON.parse(content) as SectionContent } : {}),
      };
    } else {
      const body = await request.json() as { paused?: unknown; content?: unknown; resetMediaSlot?: unknown };
      if (body.paused !== undefined && typeof body.paused !== 'boolean') throw new SectionValidationError('Paused must be a boolean.');
      if (body.content !== undefined && (!body.content || typeof body.content !== 'object' || Array.isArray(body.content))) throw new SectionValidationError('Content must be an object.');
      input = {
        ...(typeof body.paused === 'boolean' ? { paused: body.paused } : {}),
        ...(body.content ? { content: body.content as SectionContent } : {}),
        ...(typeof body.resetMediaSlot === 'string' ? { resetMediaSlots: [body.resetMediaSlot] } : {}),
      };
    }

    await service.updateSection(id, input, files, actor);
    return mobileJson(request, { success: true }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof SectionValidationError || error instanceof SyntaxError) return mobileJson(request, { error: error instanceof SectionValidationError ? error.message : 'Invalid JSON.' }, { status: 400 });
    return mobileJson(request, { error: 'Internal server error' }, { status: 500 });
  }
}
