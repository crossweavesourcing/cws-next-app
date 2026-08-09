import { type NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { CatalogDocumentService } from '@/auth/services/catalog-document.service';

// This route is protected by an internal HMAC secret, not cookie auth.
// It is intended to be called only by the Server Action (fire-and-forget)
// and runs as a Netlify Background Function on production (up to 15 minutes).
export const maxDuration = 300; // 5 minutes max on platforms that support it (e.g. Vercel Pro)
// On Netlify this runs as a regular function; use Netlify Background Functions config
// in netlify.toml if you need longer execution (up to 15 min).

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Authenticate with the internal secret — never expose this to the browser.
  const secret = process.env.CATALOG_PROCESS_SECRET ?? '';
  if (!secret || request.headers.get('x-catalog-secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { catalogId?: string; publicId?: string; actorUserId?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { catalogId, publicId, actorUserId } = body;
  if (
    typeof catalogId !== 'string' || !catalogId ||
    typeof publicId !== 'string' || !publicId ||
    typeof actorUserId !== 'string' || !ObjectId.isValid(actorUserId)
  ) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Acknowledge immediately (background functions return before work is done).
  // On Netlify, work continues asynchronously after this response.
  const response = NextResponse.json({ accepted: true }, { status: 202 });

  // Run the heavy PDF parsing in the background.
  // On non-Netlify runtimes this executes synchronously before the response sends,
  // but the 202 status correctly signals to the caller not to wait for the result.
  try {
    await new CatalogDocumentService().finalizeProcessing(catalogId, publicId, new ObjectId(actorUserId));
  } catch (error) {
    // Errors are logged and stored on the catalog document in finalizeProcessing.
    // This catch prevents an unhandled rejection from crashing the runtime.
    console.error(JSON.stringify({
      level: 'error',
      event: 'catalog.process.route.error',
      catalogId,
      errorMessage: error instanceof Error ? error.message : 'Unknown',
    }));
  }

  return response;
}
