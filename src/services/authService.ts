import { z } from 'zod';
import { httpClient } from '../api/httpClient';
import type { AuthUser } from '../store/authStore';

export const loginSchema = z.object({
  email: z.string().min(1, 'Email or username is required'),
  password: z.string().min(8),
});

export type LoginInput = z.infer<typeof loginSchema>;

type LoginResponse = {
  access: string;
  refresh: string;
  user: AuthUser;
};

export async function login(payload: LoginInput) {
  const validatedPayload = loginSchema.parse(payload);
  const response = await httpClient.post<LoginResponse>('/auth/login/', validatedPayload);
  return response.data;
}

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export async function forgotPassword(payload: ForgotPasswordInput) {
  const validatedPayload = forgotPasswordSchema.parse(payload);
  const response = await httpClient.post<{ detail: string }>('/auth/forgot-password/', validatedPayload);
  return response.data;
}

const resetPasswordSchema = z.object({
  uid: z.string().min(1),
  token: z.string().min(1),
  password: z.string().min(8),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export async function resetPassword(payload: ResetPasswordInput) {
  const validatedPayload = resetPasswordSchema.parse(payload);
  const response = await httpClient.post<{ detail: string }>('/auth/reset-password/', validatedPayload);
  return response.data;
}

const changePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export async function changePassword(payload: ChangePasswordInput) {
  const validatedPayload = changePasswordSchema.parse(payload);
  const response = await httpClient.post<{ detail: string }>('/auth/change-password/', validatedPayload);
  return response.data;
}

export async function logout(refresh: string) {
  const response = await httpClient.post<{ detail: string }>('/auth/logout/', { refresh });
  return response.data;
}

export async function getMe() {
  const response = await httpClient.get<AuthUser>('/auth/me/');
  return response.data;
}

const profileUpdateSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

export async function updateProfile(payload: ProfileUpdateInput) {
  const validatedPayload = profileUpdateSchema.parse(payload);
  const response = await httpClient.patch<AuthUser>('/auth/me/', validatedPayload);
  return response.data;
}

type PermissionOption = {
  code: string;
  label: string;
};

export type PermissionMatrixResponse = {
  groups: Record<string, PermissionOption[]>;
};

export async function getPermissionMatrix() {
  const response = await httpClient.get<PermissionMatrixResponse>('/auth/permission-matrix/');
  return response.data;
}

export type ManagedUser = AuthUser;

const userCreateSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  confirm_password: z.string().min(8),
  role: z.enum(['superadmin', 'staff']),
  permissions: z.array(z.string()),
  is_active: z.boolean().default(true),
});

export type UserCreateInput = z.infer<typeof userCreateSchema>;

export async function listUsers() {
  const response = await httpClient.get<{ results?: ManagedUser[] } | ManagedUser[]>('/users/');
  if (Array.isArray(response.data)) {
    return response.data;
  }
  return response.data.results ?? [];
}

export async function createUser(payload: UserCreateInput) {
  const validatedPayload = userCreateSchema.parse(payload);
  const response = await httpClient.post<ManagedUser>('/users/', validatedPayload);
  return response.data;
}

const userUpdateSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['superadmin', 'staff']),
  permissions: z.array(z.string()),
  is_active: z.boolean(),
});

export type UserUpdateInput = z.infer<typeof userUpdateSchema>;

export async function updateUser(userId: number, payload: UserUpdateInput) {
  const validatedPayload = userUpdateSchema.parse(payload);
  const response = await httpClient.patch<ManagedUser>(`/users/${userId}/`, validatedPayload);
  return response.data;
}

export async function toggleUserActive(userId: number) {
  const response = await httpClient.post<ManagedUser>(`/users/${userId}/toggle-active/`);
  return response.data;
}

export async function deleteUser(userId: number) {
  await httpClient.delete(`/users/${userId}/`);
}

export async function adminResetPassword(userId: number, newPassword: string) {
  const response = await httpClient.post<{ detail: string }>(`/users/${userId}/reset-password/`, {
    new_password: newPassword,
  });
  return response.data;
}
