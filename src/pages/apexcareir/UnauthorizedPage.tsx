import { Link } from 'react-router-dom';

export default function UnauthorizedPage() {
  return (
    <section className="flex min-h-screen items-center justify-center bg-apex-background px-4">
      <div className="max-w-md rounded-xl border border-red-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-red-700">Access Denied</h1>
        <p className="mt-2 text-sm text-slate-600">
          Your account does not have permission to access this page.
        </p>
        <Link
          to="/apexcareir-main/app/dashboard"
          className="mt-4 inline-block rounded-lg bg-apex-primary px-4 py-2 text-sm font-semibold text-white"
        >
          Go to Dashboard
        </Link>
      </div>
    </section>
  );
}
