
import { ObjectId } from 'mongodb';
import { CatalogDocumentService } from '../../src/auth/services/catalog-document.service';

export default async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });
  }

  // Authenticate with the internal secret — never expose this to the browser.
  const secret = process.env.CATALOG_PROCESS_SECRET ?? '';
  const provided = req.headers.get('x-catalog-secret');
  if (!secret || provided !== secret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const { catalogId, publicId, actorUserId } = body;
  
  if (
    typeof catalogId !== 'string' || !catalogId ||
    typeof publicId !== 'string' || !publicId ||
    typeof actorUserId !== 'string' || !ObjectId.isValid(actorUserId)
  ) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
  }

  // Run the heavy PDF parsing/Cloudinary processing in the background.
  try {
    await new CatalogDocumentService().finalizeProcessing(catalogId, publicId, new ObjectId(actorUserId));
  } catch (error) {
    // Errors are logged and stored on the catalog document in finalizeProcessing.
    console.error(JSON.stringify({
      level: 'error',
      event: 'catalog.process.route.error',
      catalogId,
      errorMessage: error instanceof Error ? error.message : 'Unknown',
    }));
  }
};
