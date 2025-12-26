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
import TestAnalysisPage from './pages/TestAnalysisPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CompleteProfilePage from './pages/CompleteProfilePage';

import { AuthProvider } from './context/AuthContext';
import GridTestsPage from './pages/GridTestsPage';
import PaymentReturnPage from './pages/PaymentReturnPage';
import PricingPage from './pages/PricingPage';
import TaxaTimbruPage from './pages/TaxaTimbruPage';


import LegalNewsPage from './pages/LegalNews/LegalNewsPage';
import ArticleDetailPage from './pages/LegalNews/ArticleDetailPage';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <DosarProvider>
        <DosarDrawer />
        <DosarToast />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/complete-profile" element={<CompleteProfilePage />} />

          <Route path="/landing" element={<LandingPage />} />
          <Route path="/" element={<SearchPage />} />
          <Route path="/grid-tests" element={<GridTestsPage />} />
          <Route path="/setari" element={<SettingsPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/test-analysis" element={<TestAnalysisPage />} />
          <Route path="/payment-return" element={<PaymentReturnPage />} />
          <Route path="/abonamente" element={<PricingPage />} />
          <Route path="/taxa-timbru" element={<TaxaTimbruPage />} />

          {/* Legal News Routes */}
          <Route path="/stiri" element={<LegalNewsPage />} />
          <Route path="/stiri/articol/:slug" element={<ArticleDetailPage />} />
        </Routes>
      </DosarProvider>
    </AuthProvider>
  );
};

export default App;
