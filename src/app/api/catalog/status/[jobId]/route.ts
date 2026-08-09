import { type NextRequest, NextResponse } from 'next/server';
import { requireActiveSession } from '@/auth/dal';
import { CatalogDocumentService } from '@/auth/services/catalog-document.service';

/**
 * GET /api/catalog/status/[jobId]
 *
 * Lightweight polling endpoint for the async catalog creation flow.
 * Returns the current status of the background processing job.
 * Requires a valid admin cookie session.
 *
 * Response body:
 *   { status: 'processing' | 'ready' | 'error' | 'not_found', error?: string }
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
): Promise<NextResponse> {
  try {
    await requireActiveSession();
    const { jobId } = await params;

    if (!jobId || typeof jobId !== 'string') {
      return NextResponse.json({ status: 'not_found', error: null }, { status: 400 });
    }

    const result = await new CatalogDocumentService().getJobStatus(jobId);
    return NextResponse.json(result);
  } catch {
    // requireActiveSession throws when unauthenticated — return 401 without detail.
    return NextResponse.json({ status: 'not_found', error: null }, { status: 401 });
  }
}
