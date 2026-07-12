// ─────────────────────────────────────────────────────────────────────────────
// Next.js Instrumentation hook
//
// Registers global runtime hooks (Node.js environment).
// Used to register the database connection graceful shutdown handlers.
// ─────────────────────────────────────────────────────────────────────────────

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { registerShutdownHandlers } = await import('@/database/shutdown');
    registerShutdownHandlers();
  }
}
