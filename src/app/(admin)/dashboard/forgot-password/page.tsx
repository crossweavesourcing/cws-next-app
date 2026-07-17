import ForgotPasswordForm from './ForgotPasswordForm';

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100 p-6">
      <div className="w-full max-w-md border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-black uppercase tracking-tight text-neutral-900">
          Reset Password
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Enter your account email and we&apos;ll send a reset link.
        </p>
        <ForgotPasswordForm />
      </div>
    </main>
  );
}
