import React from 'react';
import { Routes, Route } from 'react-router-dom';
import SearchPage from './pages/SearchPage';
import SettingsPage from './pages/SettingsPage';
import TermsPage from './pages/TermsPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import LandingPage from './pages/LandingPage';
import { DosarProvider } from './context/DosarContext';
import DosarDrawer from './components/DosarDrawer';
import DosarToast from './components/DosarToast';

const TestAnalysisPage = React.lazy(() => import('./pages/TestAnalysisPage'));

const App: React.FC = () => {
  return (
    <DosarProvider>
      <DosarDrawer />
      <DosarToast />
      <Routes>
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/" element={<SearchPage />} />
        <Route path="/setari" element={<SettingsPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/test-analysis" element={<React.Suspense fallback={<div>Loading...</div>}><TestAnalysisPage /></React.Suspense>} />
      </Routes>

    </DosarProvider>
  );
};

export default App;
