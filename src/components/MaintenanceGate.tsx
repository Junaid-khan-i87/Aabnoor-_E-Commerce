import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useSite } from '../SiteContext';

export function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const { isAdmin, settings, siteName } = useSite();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  if (!settings.maintenanceMode || isAdmin || isAdminRoute) {
    return <>{children}</>;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#faf6f0] px-6 pt-32 pb-20">
      <section className="w-full max-w-2xl rounded-[8px] border border-[#2d2426]/10 bg-[#fffaf7] p-8 text-center shadow-xl sm:p-12">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-[#c97a82]/10 text-[#c97a82]">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <p className="mb-3 font-sans text-[10px] font-bold uppercase tracking-[0.28em] text-[#8a7070]">
          {siteName}
        </p>
        <h1 className="font-serif text-5xl font-light leading-none text-[#2d2426]">
          {settings.maintenanceTitle}
        </h1>
        <p className="mx-auto mt-5 max-w-lg font-sans text-sm leading-7 text-[#8a7070]">
          {settings.maintenanceMessage}
        </p>
        {settings.maintenanceEta && (
          <p className="mt-6 font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-[#c97a82]">
            {settings.maintenanceEta}
          </p>
        )}
        <Link
          to="/admin"
          className="mt-8 inline-flex rounded-full border border-[#2d2426]/15 px-6 py-3 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-[#2d2426] transition-colors hover:bg-[#2d2426] hover:text-white"
        >
          Admin Login
        </Link>
      </section>
    </main>
  );
}
