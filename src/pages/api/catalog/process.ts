import { type NextApiRequest, type NextApiResponse } from 'next';
import { ObjectId } from 'mongodb';
import { CatalogDocumentService } from '@/auth/services/catalog-document.service';

// Netlify Background Function config — returns 202 immediately and keeps running.
// This is only supported in the Pages Router (`pages/api/`), not the App Router.
export const config: any = {
  type: 'experimental-background',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Authenticate with the internal secret — never expose this to the browser.
  const secret = process.env.CATALOG_PROCESS_SECRET ?? '';
  const provided = req.headers['x-catalog-secret'] ?? req.headers['X-Catalog-Secret'];
  if (!secret || provided !== secret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const body = req.body as { catalogId?: string; publicId?: string; actorUserId?: string };
  const { catalogId, publicId, actorUserId } = body;
  
  if (
    typeof catalogId !== 'string' || !catalogId ||
    typeof publicId !== 'string' || !publicId ||
    typeof actorUserId !== 'string' || !ObjectId.isValid(actorUserId)
  ) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Acknowledge immediately (background functions return before work is done).
  // On Netlify, work continues asynchronously after this response.
  res.status(202).json({ accepted: true });

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
}
