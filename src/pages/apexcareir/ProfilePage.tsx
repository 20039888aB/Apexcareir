import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { getMe, updateProfile, type ProfileUpdateInput } from '../../services';
import { useAuthStore } from '../../store';

const profileSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);

  const profileQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: getMe,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    if (profileQuery.data) {
      reset({
        first_name: profileQuery.data.first_name,
        last_name: profileQuery.data.last_name,
        email: profileQuery.data.email,
      });
    }
  }, [profileQuery.data, reset]);

  const profileMutation = useMutation({
    mutationFn: (payload: ProfileUpdateInput) => updateProfile(payload),
    onSuccess: async (updatedUser) => {
      setUser(updatedUser);
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });

  return (
    <div className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">My Profile</h2>
      <form className="mt-4 space-y-4" onSubmit={handleSubmit((data) => profileMutation.mutate(data))}>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">First Name</label>
          <input
            {...register('first_name')}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-apex-primary"
          />
          {errors.first_name && <p className="mt-1 text-xs text-red-600">{errors.first_name.message}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Last Name</label>
          <input
            {...register('last_name')}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-apex-primary"
          />
          {errors.last_name && <p className="mt-1 text-xs text-red-600">{errors.last_name.message}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
          <input
            {...register('email')}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-apex-primary"
          />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
        </div>

        <button
          type="submit"
          disabled={profileMutation.isPending}
          className="rounded-lg bg-apex-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {profileMutation.isPending ? 'Saving...' : 'Save changes'}
        </button>

        {profileMutation.isSuccess && <p className="text-xs text-emerald-700">Profile updated successfully.</p>}
      </form>
    </div>
  );
}
