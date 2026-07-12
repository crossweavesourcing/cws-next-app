import { NextResponse } from 'next/server';
import { checkDatabaseHealth } from '@/database';

/**
 * Database health check endpoint.
 * GET /api/health
 */
export async function GET() {
  const result = await checkDatabaseHealth();
  const statusCode = result.status === 'healthy' ? 200 : 503;
  return NextResponse.json(result, { status: statusCode });
}
