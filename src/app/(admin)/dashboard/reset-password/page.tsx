import { redirect } from 'next/navigation';
import ResetPasswordForm from './ResetPasswordForm';

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) {
    redirect('/dashboard/forgot-password');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100 p-6">
      <div className="w-full max-w-md border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-black uppercase tracking-tight text-neutral-900">
          Set New Password
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Choose a strong new password for your account.
        </p>
        <ResetPasswordForm token={token} />
      </div>
    </main>
  );
}
