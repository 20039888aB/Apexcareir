import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Activity, Building2, Eye, EyeOff, HeartPulse, ShieldPlus, Stethoscope } from 'lucide-react';
import Logo from '../../components/Logo';
import { ADMIN_ROUTES } from '../../constants/adminRoutes';
import { login, type LoginInput } from '../../services';
import { useAuthStore } from '../../store';
import { loginSchema } from '../../services/authService';

const backgroundIcons = [
  { Icon: Building2, left: '10%', top: '16%', delay: 0.2, duration: 8.5, size: 22 },
  { Icon: Activity, left: '82%', top: '14%', delay: 1, duration: 7.8, size: 20 },
  { Icon: ShieldPlus, left: '14%', top: '72%', delay: 1.6, duration: 9.2, size: 22 },
  { Icon: HeartPulse, left: '84%', top: '74%', delay: 0.7, duration: 8.8, size: 22 },
  { Icon: Stethoscope, left: '50%', top: '10%', delay: 1.2, duration: 10, size: 20 },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const setTokens = useAuthStore((state) => state.setTokens);
  const setUser = useAuthStore((state) => state.setUser);
  const from = (location.state as { from?: { pathname?: string } } | undefined)?.from?.pathname;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  const emailField = register('email');
  const passwordField = register('password');

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      queryClient.removeQueries({ queryKey: ['auth', 'me'] });
      setTokens(data.access, data.refresh);
      setUser(data.user);
      navigate(from ?? ADMIN_ROUTES.dashboard, { replace: true });
    },
  });

  const onSubmit = (data: LoginInput) => loginMutation.mutate(data);

  return (
    <section className="apexcareir-ui relative flex min-h-screen items-center justify-center overflow-hidden bg-apex-background px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(110,44,62,0.22),_transparent_35%),linear-gradient(135deg,rgba(10,20,18,0.88),rgba(27,77,62,0.72)_45%,rgba(79,31,45,0.82))]" />
      <motion.div
        className="pointer-events-none absolute -left-16 top-12 h-72 w-72 rounded-full bg-[rgba(110,44,62,0.22)] blur-3xl"
        animate={{ scale: [1, 1.15, 1], opacity: [0.35, 0.55, 0.35] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="pointer-events-none absolute -right-12 bottom-8 h-80 w-80 rounded-full bg-[rgba(184,149,47,0.14)] blur-3xl"
        animate={{ scale: [1.12, 1, 1.12], opacity: [0.22, 0.38, 0.22] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.95) 1px, transparent 1px)',
          backgroundSize: '38px 38px',
        }}
      />
      {backgroundIcons.map(({ Icon, left, top, delay, duration, size }, index) => (
        <motion.div
          key={index}
          className="pointer-events-none absolute rounded-2xl border border-white/10 bg-white/5 p-3 text-white/40 backdrop-blur-sm"
          style={{ left, top }}
          animate={{
            y: [0, -12, 0, 8, 0],
            rotate: [0, 4, -4, 0],
            opacity: [0.25, 0.45, 0.25],
          }}
          transition={{ duration, delay, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Icon size={size} />
        </motion.div>
      ))}

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md rounded-[1.1rem] bg-gradient-to-br from-[rgba(110,44,62,0.55)] via-[rgba(139,58,80,0.3)] to-[rgba(184,149,47,0.18)] p-[1.5px] shadow-[0_22px_52px_rgba(8,12,20,0.38)]"
      >
        <div className="rounded-[1rem] border border-white/10 bg-[linear-gradient(180deg,rgba(22,28,38,0.92),rgba(33,38,48,0.88))] p-8 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl">
          <div className="mb-6 text-center">
            <div className="mb-4 flex justify-center">
              <div className="rounded-[1.85rem] bg-gradient-to-br from-[rgba(110,44,62,0.4)] via-[rgba(139,58,80,0.24)] to-[rgba(184,149,47,0.16)] p-[1.5px] shadow-sm">
                <div className="rounded-[1.75rem] bg-white/90 p-3 backdrop-blur-sm">
                  <Logo size="lg" />
                </div>
              </div>
            </div>
            <p className="mb-2 inline-flex items-center rounded-full border border-[rgba(184,149,47,0.3)] bg-[rgba(184,149,47,0.08)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-apex-primary">
              ApexcareIR Main
            </p>
            <h1 className="text-2xl font-semibold text-white">Admin / SuperAdmin Sign in</h1>
            <p className="mt-1 text-sm text-white/65">
              Access the ApexcareIR business system control panel securely.
            </p>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="mb-1 block text-sm font-medium text-white/80">Email or Username</label>
              <input
                {...emailField}
                type="text"
                autoComplete="username"
                placeholder="e.g. Apexcare or admin@example.com"
                className="w-full !border-white/20 !bg-[rgba(15,23,42,0.55)] !text-white caret-white placeholder:!text-white/40"
              />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-white/80">Password</label>
              <div className="relative">
                <input
                  {...passwordField}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className="w-full !border-white/20 !bg-[rgba(15,23,42,0.55)] !pr-12 !text-white caret-white placeholder:!text-white/40"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-2 top-1/2 z-10 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-[rgba(15,23,42,0.72)] text-white/85 shadow-sm transition-colors hover:bg-[rgba(15,23,42,0.88)] hover:text-gold-light"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
            </div>

            {loginMutation.error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
                Unable to sign in. Check credentials and try again.
              </p>
            )}

            <button type="submit" disabled={loginMutation.isPending} className="w-full !py-2.5 !text-sm">
              {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </motion.div>
    </section>
  );
}
