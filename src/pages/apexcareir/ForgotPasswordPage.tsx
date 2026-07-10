import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { ADMIN_ROUTES } from '../../constants/adminRoutes';
import { forgotPassword, type ForgotPasswordInput } from '../../services';
import { z } from 'zod';

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export default function ForgotPasswordPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const forgotMutation = useMutation({
    mutationFn: forgotPassword,
  });

  const onSubmit = (data: ForgotPasswordInput) => forgotMutation.mutate(data);

  return (
    <section className="flex min-h-screen items-center justify-center bg-apex-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Forgot Password</h1>
        <p className="mt-1 text-sm text-slate-600">Enter your email to receive a secure reset link.</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input
              {...register('email')}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-apex-primary"
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>
          <button
            type="submit"
            disabled={forgotMutation.isPending}
            className="w-full rounded-lg bg-apex-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-60"
          >
            {forgotMutation.isPending ? 'Sending...' : 'Send reset link'}
          </button>
        </form>

        {forgotMutation.isSuccess && (
          <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            If the email exists, a reset link has been sent.
          </p>
        )}

        <Link to={ADMIN_ROUTES.login} className="mt-4 inline-block text-xs text-apex-primary hover:underline">
          Back to sign in
        </Link>
      </div>
    </section>
  );
}
