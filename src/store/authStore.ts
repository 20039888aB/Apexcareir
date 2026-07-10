import { create } from 'zustand';

export type UserRole = 'superadmin' | 'staff';

export type SidebarNavigationMode = 'accordion' | 'multi_expand';

export type AuthUser = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: UserRole;
  permissions: string[];
  sidebar_navigation_mode?: SidebarNavigationMode;
  is_active: boolean;
};

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: AuthUser | null) => void;
  clearTokens: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: localStorage.getItem('apexcareir_access_token'),
  refreshToken: localStorage.getItem('apexcareir_refresh_token'),
  user: null,
  setTokens: (accessToken, refreshToken) => {
    localStorage.setItem('apexcareir_access_token', accessToken);
    localStorage.setItem('apexcareir_refresh_token', refreshToken);
    set({ accessToken, refreshToken });
  },
  setUser: (user) => set({ user }),
  clearTokens: () => {
    localStorage.removeItem('apexcareir_access_token');
    localStorage.removeItem('apexcareir_refresh_token');
    set({ accessToken: null, refreshToken: null, user: null });
  },
}));
