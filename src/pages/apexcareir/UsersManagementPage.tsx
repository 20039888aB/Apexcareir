import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import PermissionChecklist from '../../components/apexcareir/PermissionChecklist';
import AdminConfirmButton from '../../components/apexcareir/AdminConfirmButton';
import {
  adminResetPassword,
  createUser,
  deleteUser,
  getPermissionMatrix,
  listUsers,
  toggleUserActive,
  updateUser,
  type ManagedUser,
  type UserCreateInput,
  type UserUpdateInput,
} from '../../services';
import { useAuthStore } from '../../store';

const userFormSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8).optional(),
  role: z.enum(['superadmin', 'staff']),
  is_active: z.boolean(),
});

type UserFormValues = z.infer<typeof userFormSchema>;

export default function UsersManagementPage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [adminResetTargetId, setAdminResetTargetId] = useState<number | null>(null);
  const [adminResetPasswordValue, setAdminResetPasswordValue] = useState('');

  const usersQuery = useQuery({
    queryKey: ['accounts', 'users'],
    queryFn: listUsers,
  });
  const permissionsQuery = useQuery({
    queryKey: ['accounts', 'permission-matrix'],
    queryFn: getPermissionMatrix,
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      role: 'staff',
      is_active: true,
    },
  });

  const invalidateUsers = async () => {
    await queryClient.invalidateQueries({ queryKey: ['accounts', 'users'] });
  };

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: async () => {
      await invalidateUsers();
      reset();
      setSelectedPermissions([]);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UserUpdateInput }) => updateUser(id, payload),
    onSuccess: async () => {
      await invalidateUsers();
      setEditingUser(null);
      reset();
      setSelectedPermissions([]);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: toggleUserActive,
    onSuccess: invalidateUsers,
  });

  const adminResetPasswordMutation = useMutation({
    mutationFn: ({ userId, password }: { userId: number; password: string }) => adminResetPassword(userId, password),
    onSuccess: () => {
      setAdminResetPasswordValue('');
      setAdminResetTargetId(null);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: async () => {
      await invalidateUsers();
      clearEdit();
    },
  });

  const onSubmit = (values: UserFormValues) => {
    if (editingUser) {
      const payload: UserUpdateInput = {
        first_name: values.first_name,
        last_name: values.last_name,
        email: values.email,
        role: values.role,
        permissions: selectedPermissions,
        is_active: values.is_active,
      };
      updateMutation.mutate({ id: editingUser.id, payload });
      return;
    }

    if (!values.password) {
      return;
    }

    const payload: UserCreateInput = {
      first_name: values.first_name,
      last_name: values.last_name,
      email: values.email,
      password: values.password,
      confirm_password: values.password,
      role: values.role,
      permissions: selectedPermissions,
      is_active: values.is_active,
    };
    createMutation.mutate(payload);
  };

  const startEdit = (user: ManagedUser) => {
    setEditingUser(user);
    setSelectedPermissions(user.permissions);
    setValue('first_name', user.first_name);
    setValue('last_name', user.last_name);
    setValue('email', user.email);
    setValue('role', user.role);
    setValue('is_active', user.is_active);
    setValue('password', '');
  };

  const clearEdit = () => {
    setEditingUser(null);
    setSelectedPermissions([]);
    reset();
  };

  const togglePermission = (permissionCode: string) => {
    setSelectedPermissions((current) =>
      current.includes(permissionCode)
        ? current.filter((permission) => permission !== permissionCode)
        : [...current, permissionCode],
    );
  };

  const permissionGroups = permissionsQuery.data?.groups ?? {};

  const canManageUsers = currentUser?.role === 'superadmin';
  const sortedUsers = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);

  if (!canManageUsers) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Only SuperAdmin can manage users.
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">{editingUser ? 'Edit User' : 'Create User'}</h2>
        <form className="mt-4 space-y-3" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <input
              placeholder="First Name"
              {...register('first_name')}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            {errors.first_name && <p className="mt-1 text-xs text-red-600">{errors.first_name.message}</p>}
          </div>
          <div>
            <input
              placeholder="Last Name"
              {...register('last_name')}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            {errors.last_name && <p className="mt-1 text-xs text-red-600">{errors.last_name.message}</p>}
          </div>
          <div>
            <input
              placeholder="Email"
              {...register('email')}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>
          {!editingUser && (
            <div>
              <input
                type="password"
                placeholder="Temporary Password"
                {...register('password')}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          )}
          <div>
            <select {...register('role')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="staff">Staff</option>
              <option value="superadmin">SuperAdmin</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" {...register('is_active')} />
            Account active
          </label>

          <PermissionChecklist
            groups={permissionGroups}
            selectedPermissions={selectedPermissions}
            onToggle={togglePermission}
          />

          <div className="flex gap-2">
            <button type="submit" className="rounded-lg bg-apex-primary px-4 py-2 text-xs font-semibold text-white">
              {editingUser ? 'Update User' : 'Create User'}
            </button>
            {editingUser && (
              <button
                type="button"
                onClick={clearEdit}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Users</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map((user) => (
                <tr key={user.id} className="border-b border-slate-100">
                  <td className="py-2 pr-4">{`${user.first_name} ${user.last_name}`.trim()}</td>
                  <td className="py-2 pr-4">{user.email}</td>
                  <td className="py-2 pr-4">{user.role}</td>
                  <td className="py-2 pr-4">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        user.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {user.is_active ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="py-2 pr-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => startEdit(user)}
                        className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => toggleMutation.mutate(user.id)}
                        className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700"
                      >
                        {user.is_active ? 'Suspend' : 'Activate'}
                      </button>
                      <button
                        onClick={() => setAdminResetTargetId(user.id)}
                        className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700"
                      >
                        Reset Password
                      </button>
                      {user.id !== currentUser?.id ? (
                        <AdminConfirmButton
                          label="Delete"
                          confirmMessage={`Permanently delete user ${user.email}?`}
                          onConfirm={() => deleteUserMutation.mutateAsync(user.id)}
                          disabled={deleteUserMutation.isPending}
                        />
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {adminResetTargetId && (
          <div className="mt-4 rounded-lg border border-slate-200 p-3">
            <p className="mb-2 text-xs text-slate-600">Set a new password for selected user.</p>
            <div className="flex gap-2">
              <input
                type="password"
                value={adminResetPasswordValue}
                onChange={(event) => setAdminResetPasswordValue(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="New password"
              />
              <button
                onClick={() =>
                  adminResetPasswordMutation.mutate({
                    userId: adminResetTargetId,
                    password: adminResetPasswordValue,
                  })
                }
                className="rounded-lg bg-apex-primary px-3 py-2 text-xs font-semibold text-white"
              >
                Save
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
