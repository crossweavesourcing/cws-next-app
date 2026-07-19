import { NextResponse } from 'next/server';
import { assembleOpenApiDocument } from '@/lib/api/assemble';

const DOCS_PRIVATE = process.env.DOCS_VISIBILITY === 'private';

export async function GET() {
  if (DOCS_PRIVATE && process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'API documentation is not publicly available' },
      { status: 404 },
    );
  }

  const document = assembleOpenApiDocument();

  return NextResponse.json(document, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
