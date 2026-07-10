import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Crown, Settings, ShieldCheck, UserCheck, UserPlus, Users, UserX } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  AdminPageHero,
  AdminPanel,
  AdminQuickLinks,
  AdminRoleBadge,
  AdminStatCard,
  AdminStatusBadge,
  AdminUserAvatar,
} from '../../components/apexcareir/AdminUi';
import PermissionChecklist from '../../components/apexcareir/PermissionChecklist';
import AdminConfirmButton from '../../components/apexcareir/AdminConfirmButton';
import { ADMIN_ROUTES } from '../../constants/adminRoutes';
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

  const userStats = useMemo(() => {
    const total = sortedUsers.length;
    const active = sortedUsers.filter((user) => user.is_active).length;
    const superadmins = sortedUsers.filter((user) => user.role === 'superadmin').length;
    return {
      total,
      active,
      suspended: total - active,
      superadmins,
    };
  }, [sortedUsers]);

  if (!canManageUsers) {
    return (
      <div className="apex-admin-message apex-admin-message--error">
        Only SuperAdmin can manage users.
      </div>
    );
  }

  return (
    <div className="apexcareir-ui space-y-5">
      <AdminPageHero
        title="Administration"
        subtitle="Manage users, permissions, and platform access for Apex Care IR."
      >
        <AdminStatCard label="Total Users" value={userStats.total} icon={Users} tone="gold" />
        <AdminStatCard label="Active Accounts" value={userStats.active} hint={`${userStats.suspended} suspended`} icon={UserCheck} />
        <AdminStatCard label="SuperAdmins" value={userStats.superadmins} icon={Crown} tone="burgundy" />
        <AdminStatCard label="Permission Groups" value={Object.keys(permissionGroups).length} icon={ShieldCheck} tone="sky" />
      </AdminPageHero>

      <AdminQuickLinks
        links={[
          {
            to: ADMIN_ROUTES.users,
            label: 'User Management',
            description: 'Create, edit, and control staff access.',
            icon: Users,
            tone: 'forest',
          },
          {
            to: ADMIN_ROUTES.settings,
            label: 'Company Settings',
            description: 'Branding, logo, and invoice details.',
            icon: Settings,
            tone: 'gold',
          },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[390px_1fr]">
        <AdminPanel
          title={editingUser ? 'Edit User' : 'Create User'}
          description={editingUser ? 'Update account details and permissions.' : 'Add a new team member to the platform.'}
          icon={UserPlus}
          tone="gold"
        >
          <form className="apex-admin-form-grid" onSubmit={handleSubmit(onSubmit)}>
            <div className="apex-admin-field">
              <label>First Name</label>
              <input placeholder="First Name" {...register('first_name')} />
              {errors.first_name && <p className="mt-1 text-xs text-red-600">{errors.first_name.message}</p>}
            </div>
            <div className="apex-admin-field">
              <label>Last Name</label>
              <input placeholder="Last Name" {...register('last_name')} />
              {errors.last_name && <p className="mt-1 text-xs text-red-600">{errors.last_name.message}</p>}
            </div>
            <div className="apex-admin-field">
              <label>Email</label>
              <input placeholder="Email" {...register('email')} />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>
            {!editingUser && (
              <div className="apex-admin-field">
                <label>Temporary Password</label>
                <input type="password" placeholder="Temporary Password" {...register('password')} />
              </div>
            )}
            <div className="apex-admin-field">
              <label>Role</label>
              <select {...register('role')}>
                <option value="staff">Staff</option>
                <option value="superadmin">SuperAdmin</option>
              </select>
            </div>
            <label className="apex-admin-permission-option">
              <input type="checkbox" {...register('is_active')} />
              Account active
            </label>

            <PermissionChecklist
              groups={permissionGroups}
              selectedPermissions={selectedPermissions}
              onToggle={togglePermission}
              variant="admin"
            />

            <div className="flex flex-wrap gap-2 pt-1">
              <button type="submit" className="apex-admin-submit">
                {editingUser ? 'Update User' : 'Create User'}
              </button>
              {editingUser && (
                <button
                  type="button"
                  onClick={clearEdit}
                  className="apex-admin-action-btn apex-admin-action-btn--neutral"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </AdminPanel>

        <AdminPanel
          title="Team Directory"
          description="Live overview of every account in the system."
          icon={Users}
          tone="burgundy"
        >
          <div className="apex-admin-table-wrap">
            <table className="apex-admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map((user) => {
                  const fullName = `${user.first_name} ${user.last_name}`.trim();
                  return (
                    <tr key={user.id}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <AdminUserAvatar name={fullName || user.email} role={user.role} />
                          <span className="font-medium text-slate-800">{fullName || 'Unnamed User'}</span>
                        </div>
                      </td>
                      <td>{user.email}</td>
                      <td>
                        <AdminRoleBadge role={user.role} />
                      </td>
                      <td>
                        <AdminStatusBadge active={user.is_active} />
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => startEdit(user)}
                            className="apex-admin-action-btn apex-admin-action-btn--edit"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => toggleMutation.mutate(user.id)}
                            className="apex-admin-action-btn apex-admin-action-btn--warn"
                          >
                            {user.is_active ? 'Suspend' : 'Activate'}
                          </button>
                          <button
                            onClick={() => setAdminResetTargetId(user.id)}
                            className="apex-admin-action-btn apex-admin-action-btn--neutral"
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
                  );
                })}
              </tbody>
            </table>
          </div>

          {adminResetTargetId && (
            <div className="mt-4 rounded-xl border border-[rgba(184,149,47,0.2)] bg-gradient-to-r from-[rgba(184,149,47,0.08)] to-[rgba(110,44,62,0.06)] p-4">
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <UserX size={16} className="text-burgundy" />
                Set a new password for the selected user
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
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
                  className="apex-admin-submit whitespace-nowrap"
                >
                  Save Password
                </button>
              </div>
            </div>
          )}
        </AdminPanel>
      </div>
    </div>
  );
}
