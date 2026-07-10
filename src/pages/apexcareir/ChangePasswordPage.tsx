import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { changePassword, type ChangePasswordInput } from '../../services';

const changePasswordFormSchema = z
  .object({
    current_password: z.string().min(1),
    new_password: z.string().min(8),
    confirm_password: z.string().min(8),
  })
  .refine((values) => values.new_password === values.confirm_password, {
    path: ['confirm_password'],
    message: 'Passwords do not match.',
  });

type ChangePasswordFormValues = z.infer<typeof changePasswordFormSchema>;

export default function ChangePasswordPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordFormSchema),
  });

  const mutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => reset(),
  });

  const onSubmit = (data: ChangePasswordFormValues) => {
    const payload: ChangePasswordInput = {
      current_password: data.current_password,
      new_password: data.new_password,
    };
    mutation.mutate(payload);
  };

  return (
    <div className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Change Password</h2>
      <form className="mt-4 space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Current Password</label>
          <input
            type="password"
            {...register('current_password')}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-apex-primary"
          />
          {errors.current_password && (
            <p className="mt-1 text-xs text-red-600">{errors.current_password.message}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">New Password</label>
          <input
            type="password"
            {...register('new_password')}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-apex-primary"
          />
          {errors.new_password && <p className="mt-1 text-xs text-red-600">{errors.new_password.message}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Confirm New Password</label>
          <input
            type="password"
            {...register('confirm_password')}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-apex-primary"
          />
          {errors.confirm_password && (
            <p className="mt-1 text-xs text-red-600">{errors.confirm_password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-lg bg-apex-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {mutation.isPending ? 'Changing...' : 'Change password'}
        </button>

        {mutation.isSuccess && <p className="text-xs text-emerald-700">Password changed successfully.</p>}
        {mutation.isError && (
          <p className="text-xs text-red-700">Could not change password. Verify current password and try again.</p>
        )}
      </form>
    </div>
  );
}
