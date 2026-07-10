import { PropsWithChildren } from 'react';

export default function ApexCareIRShell({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-apex-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
    </div>
  );
}
