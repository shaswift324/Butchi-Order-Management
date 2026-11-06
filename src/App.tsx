import React from 'react';
import { StoreProvider, useStore } from './context/StoreContext.tsx';
import { ToastProvider } from './ui/Toast.tsx';
import { Header } from './components/header.tsx';
import { OwnerDashboard } from './components/owner/OwnerDashboard.tsx';
import { RiderDashboard } from './components/Rider/RiderDashboard.tsx';

const AppContent: React.FC = () => {
  const { activeRole, loading, apiConnected } = useStore();

  if (loading) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center p-4">
        <span className="animate-bounce text-5xl">🥟</span>
        <h2 className="mt-3 text-lg font-bold text-stone-900">Loading Butchi…</h2>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      {!apiConnected && (
        <div className="mx-auto mt-2 w-full max-w-6xl px-4">
          <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
            Offline mode: changes are saved on this device only. Start the shared server to sync Owner and Rider devices.
          </p>
        </div>
      )}
      {/* Bottom padding keeps content clear of the tab bar and any sticky action bar */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-[calc(8.5rem+var(--safe-bottom))] pt-4">
        {activeRole === 'owner' ? <OwnerDashboard /> : <RiderDashboard />}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </StoreProvider>
  );
}
