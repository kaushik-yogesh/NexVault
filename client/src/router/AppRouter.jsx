/**
 * NexVault — Application Router
 */

import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import AppLayout from '../shared/components/layout/AppLayout.jsx';
import Spinner from '../shared/components/ui/Spinner.jsx';

// Lazy-load pages
const Welcome = lazy(() => import('../features/onboarding/components/Welcome.jsx'));
const ImportWallet = lazy(() => import('../features/onboarding/components/ImportWallet.jsx'));
const SeedPhraseDisplay = lazy(() => import('../features/onboarding/components/SeedPhraseDisplay.jsx'));
const SeedPhraseVerify = lazy(() => import('../features/onboarding/components/SeedPhraseVerify.jsx'));
const SetPassword = lazy(() => import('../features/onboarding/components/SetPassword.jsx'));
const UnlockScreen = lazy(() => import('../features/auth/components/UnlockScreen.jsx'));
const Dashboard = lazy(() => import('../features/portfolio/components/Dashboard.jsx'));
const SendForm = lazy(() => import('../features/send/components/SendForm.jsx'));
const ReceiveModal = lazy(() => import('../features/receive/components/ReceiveModal.jsx'));
const ExplorePage = lazy(() => import('../features/explore/components/ExplorePage.jsx'));
const TransactionHistory = lazy(() => import('../features/history/components/TransactionHistory.jsx'));
const SettingsPage = lazy(() => import('../features/settings/components/SettingsPage.jsx'));
const AddAccountPage = lazy(() => import('../features/wallet/components/AddAccountPage.jsx'));
const ImportAccountPage = lazy(() => import('../features/wallet/components/ImportAccountPage.jsx'));
const ConnectHardware = lazy(() => import('../features/wallet/components/ConnectHardware.jsx'));
const AddressBookPage = lazy(() => import('../features/contacts/components/AddressBookPage.jsx'));
const ApprovalManagerPage = lazy(() => import('../features/approvals/components/ApprovalManagerPage.jsx'));
const ConnectedSitesPage = lazy(() => import('../features/permissions/components/ConnectedSitesPage.jsx'));
const NFTDetailsPage = lazy(() => import('../features/nfts/components/NFTDetailsPage.jsx'));
const SwapForm = lazy(() => import('../features/swap/components/SwapForm.jsx'));
const StakingPage = lazy(() => import('../features/portfolio/components/StakingPage.jsx'));
const TokenDetailsPage = lazy(() => import('../features/tokens/components/TokenDetailsPage.jsx'));

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-full">
    <Spinner size="lg" />
  </div>
);

/** Route guard for authenticated/unlocked routes */
function ProtectedRoute({ children }) {
  const { isInitialized, isUnlocked } = useSelector((state) => state.wallet);
  const location = useLocation();

  if (!isInitialized) {
    return <Navigate to={`/welcome${location.search}`} replace />;
  }
  if (!isUnlocked) {
    return <Navigate to={`/unlock${location.search}`} replace />;
  }
  return children;
}

/** Route guard for unauthenticated routes */
function PublicRoute({ children }) {
  const { isInitialized, isUnlocked } = useSelector((state) => state.wallet);
  const location = useLocation();

  if (isInitialized && isUnlocked) {
    return <Navigate to={`/dashboard${location.search}`} replace />;
  }
  return children;
}

export default function AppRouter() {
  const { isBooting, isInitialized, isUnlocked } = useSelector((state) => state.wallet);

  if (isBooting) {
    return <LoadingFallback />;
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* Onboarding (public) */}
        <Route
          path="/welcome"
          element={
            <PublicRoute>
              <Welcome />
            </PublicRoute>
          }
        />

        <Route path="/create" element={<SetPassword />} />
        <Route path="/create/seed" element={<SeedPhraseDisplay />} />
        <Route path="/create/verify" element={<SeedPhraseVerify />} />
        <Route
          path="/import"
          element={
            <PublicRoute>
              <ImportWallet />
            </PublicRoute>
          }
        />

        {/* Unlock */}
        <Route path="/unlock" element={<UnlockScreen />} />

        {/* Protected routes (require unlocked wallet) */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/swap" element={<SwapForm />} />
          <Route path="/staking" element={<StakingPage />} />
          <Route path="/send" element={<SendForm />} />
          <Route path="/receive" element={<ReceiveModal />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/history" element={<TransactionHistory />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/add-account" element={<AddAccountPage />} />
          <Route path="/import-account" element={<ImportAccountPage />} />
          <Route path="/connect-hardware" element={<ConnectHardware />} />
          <Route path="/contacts" element={<AddressBookPage />} />
          <Route path="/connected-sites" element={<ConnectedSitesPage />} />
          <Route path="/approvals" element={<ApprovalManagerPage />} />
          <Route path="/nft/:id" element={<NFTDetailsPage />} />
          <Route path="/token/:address" element={<TokenDetailsPage />} />
        </Route>

        {/* Default redirect */}
        <Route
          path="*"
          element={<DefaultRedirect />}
        />
      </Routes>
    </Suspense>
  );
}

function DefaultRedirect() {
  const { isInitialized, isUnlocked } = useSelector((state) => state.wallet);
  const location = useLocation();
  const dest = !isInitialized ? '/welcome' : !isUnlocked ? '/unlock' : '/dashboard';
  return <Navigate to={`${dest}${location.search}`} replace />;
}
