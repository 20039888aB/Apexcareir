import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router-dom';
import { resetPassword, type ResetPasswordInput } from '../../services';
import { z } from 'zod';

const resetFormSchema = z
  .object({
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  });

type ResetFormInput = z.infer<typeof resetFormSchema>;

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const uid = searchParams.get('uid') ?? '';
  const token = searchParams.get('token') ?? '';
  const resetLinkValid = Boolean(uid && token);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetFormInput>({
    resolver: zodResolver(resetFormSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const resetMutation = useMutation({
    mutationFn: resetPassword,
  });

  const onSubmit = (data: ResetFormInput) => {
    const payload: ResetPasswordInput = { uid, token, password: data.password };
    resetMutation.mutate(payload);
  };

  return (
    <section className="flex min-h-screen items-center justify-center bg-apex-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Reset Password</h1>

        {!resetLinkValid ? (
          <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
            Invalid reset link. Request a new password reset.
          </p>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">New Password</label>
              <input
                type="password"
                {...register('password')}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-apex-primary"
              />
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Confirm Password</label>
              <input
                type="password"
                {...register('confirmPassword')}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-apex-primary"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={resetMutation.isPending}
              className="w-full rounded-lg bg-apex-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-60"
            >
              {resetMutation.isPending ? 'Resetting...' : 'Reset password'}
            </button>
          </form>
        )}

        {resetMutation.isSuccess && (
          <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            Password reset successful. You can now sign in.
          </p>
        )}

        {resetMutation.isError && (
          <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
            Unable to reset password. The token may be invalid or expired.
          </p>
        )}

        <Link to="/apexcareir-main/login" className="mt-4 inline-block text-xs text-apex-primary hover:underline">
          Back to sign in
        </Link>
      </div>
    </section>
  );
}
