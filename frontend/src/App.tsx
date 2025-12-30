import React from 'react';
import { Routes, Route } from 'react-router-dom';
import SearchPage from './pages/SearchPage';
import SettingsPage from './pages/SettingsPage';
import TermsPage from './pages/TermsPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import CookiePolicyPage from './pages/CookiePolicyPage';
import HelpCenterPage from './pages/HelpCenterPage';
import GDPRPage from './pages/GDPRPage';
import LandingPage from './pages/LandingPage';
import { DosarProvider } from './context/DosarContext';
import DosarDrawer from './components/DosarDrawer';
import DosarToast from './components/DosarToast';
import TestAnalysisPage from './pages/TestAnalysisPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CompleteProfilePage from './pages/CompleteProfilePage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';

import { AuthProvider } from './context/AuthContext';
import GridTestsPage from './pages/GridTestsPage';
import PaymentReturnPage from './pages/PaymentReturnPage';
import PricingPage from './pages/PricingPage';
import TaxaTimbruPage from './pages/TaxaTimbruPage';
import LawyerAssistancePage from './pages/LawyerAssistancePage';
import ContactPage from './pages/ContactPage';


import LegalNewsPage from './pages/LegalNews/LegalNewsPage';
import ArticleDetailPage from './pages/LegalNews/ArticleDetailPage';
import CookieConsent from './components/CookieConsent';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <DosarProvider>
        <DosarDrawer />
        <DosarToast />
        <CookieConsent />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/complete-profile" element={<CompleteProfilePage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />

          <Route path="/landing" element={<LandingPage />} />
          <Route path="/" element={<SearchPage />} />
          <Route path="/grid-tests" element={<GridTestsPage />} />
          <Route path="/setari" element={<SettingsPage />} />

          {/* Legal & Support Routes */}
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/cookies" element={<CookiePolicyPage />} />
          <Route path="/gdpr" element={<GDPRPage />} />
          <Route path="/help-center" element={<HelpCenterPage />} />

          <Route path="/test-analysis" element={<TestAnalysisPage />} />
          <Route path="/payment-return" element={<PaymentReturnPage />} />
          <Route path="/abonamente" element={<PricingPage />} />
          <Route path="/taxa-timbru" element={<TaxaTimbruPage />} />
          <Route path="/asistenta-avocat" element={<LawyerAssistancePage />} />
          <Route path="/contact" element={<ContactPage />} />

          {/* Legal News Routes */}
          {/* Legal News Routes */}
          <Route path="/stiri" element={<LegalNewsPage />} />
          <Route path="/stiri/articol/:slug" element={<ArticleDetailPage />} />
          <Route path="/evenimente" element={<LegalNewsPage />} />
          <Route path="/editura" element={<LegalNewsPage />} />
          <Route path="/cariere" element={<LegalNewsPage />} />
          <Route path="/profesionisti" element={<LegalNewsPage />} />
        </Routes>
      </DosarProvider>
    </AuthProvider>
  );
};

export default App;
