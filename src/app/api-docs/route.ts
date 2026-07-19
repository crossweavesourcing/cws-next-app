import { NextResponse } from 'next/server';
import { ApiReference } from '@scalar/nextjs-api-reference';

const DOCS_PRIVATE = process.env.DOCS_VISIBILITY === 'private';

const referenceHandler = ApiReference({
  url: '/openapi.json',
  title: 'CWS API Reference',
  theme: 'kepler',
  hiddenClients: true,
  cdn: 'https://cdn.jsdelivr.net/npm/@scalar/api-reference@latest',
});

export async function GET() {
  if (DOCS_PRIVATE && process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'API documentation is not publicly available' },
      { status: 404 },
    );
  }

  return referenceHandler();
}
