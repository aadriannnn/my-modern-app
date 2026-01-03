import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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
import AboutPage from './pages/AboutPage';

import { AuthProvider } from './context/AuthContext';
import GridTestsPage from './pages/GridTestsPage';
import PaymentReturnPage from './pages/PaymentReturnPage';
import PricingPage from './pages/PricingPage';
import TaxaTimbruPage from './pages/TaxaTimbruPage';
import LawyerAssistancePage from './pages/LawyerAssistancePage';
import ContactPage from './pages/ContactPage';
import Sitemap from './pages/Sitemap';


import LegalNewsPage from './pages/LegalNews/LegalNewsPage';
import ArticleDetailPage from './pages/LegalNews/ArticleDetailPage';
import CookieConsent from './components/CookieConsent';
import LegislatiePage from './pages/LegislatiePage';
import LegislatieCategoryPage from './pages/LegislatieCategoryPage';
import LegislatieDetailPage from './pages/LegislatieDetailPage';
import PredictiveReportPage from './pages/PredictiveReportPage';


const App: React.FC = () => {
  return (
    <AuthProvider>
      <DosarProvider>

        <DosarDrawer />
        <DosarToast />
        <CookieConsent />
        <Routes>
          {/* Legislation routes */}
          <Route path="/legislatie/modele/:itemSlug" element={<LegislatieDetailPage />} />
          <Route path="/legislatie/:categorySlug/:itemSlug" element={<LegislatieDetailPage />} />
          <Route path="/legislatie/:categorySlug" element={<LegislatieCategoryPage />} />
          <Route path="/legislatie" element={<LegislatiePage />} />


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

          <Route path="/codul-civil" element={<SearchPage initialSituatie="Codul Civil" pageTitle="Codul Civil Actualizat - Legea Aplicata" />} />
          <Route path="/codul-de-procedura-civila" element={<SearchPage initialSituatie="Codul de Procedură Civilă" pageTitle="Codul de Procedură Civilă - Legea Aplicata" />} />
          <Route path="/codul-penal" element={<SearchPage initialSituatie="Codul Penal" pageTitle="Codul Penal Actualizat - Legea Aplicata" />} />
          <Route path="/codul-de-procedura-penala" element={<SearchPage initialSituatie="Codul de Procedură Penală" pageTitle="Codul de Procedură Penală - Legea Aplicata" />} />
          <Route path="/codul-muncii" element={<SearchPage initialSituatie="Codul Muncii" pageTitle="Codul Muncii Actualizat - Legea Aplicata" />} />
          <Route path="/codul-administrativ" element={<SearchPage initialSituatie="Codul Administrativ" pageTitle="Codul Administrativ - Legea Aplicata" />} />
          <Route path="/codul-fiscal" element={<SearchPage initialSituatie="Codul Fiscal" pageTitle="Codul Fiscal - Legea Aplicata" />} />
          <Route path="/codul-de-procedura-fiscala" element={<SearchPage initialSituatie="Codul de Procedură Fiscală" pageTitle="Codul de Procedură Fiscală - Legea Aplicata" />} />

          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/cookies" element={<CookiePolicyPage />} />
          <Route path="/gdpr" element={<GDPRPage />} />
          <Route path="/help-center" element={<HelpCenterPage />} />

          <Route path="/test-analysis" element={<TestAnalysisPage />} />
          <Route path="/payment-return" element={<PaymentReturnPage />} />
          <Route path="/abonamente" element={<PricingPage />} />
          <Route path="/subscription" element={<React.Suspense fallback={null}><Navigate to="/abonamente" replace /></React.Suspense>} />
          <Route path="/taxa-timbru" element={<TaxaTimbruPage />} />
          <Route path="/asistenta-avocat" element={<LawyerAssistancePage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/despre-noi" element={<AboutPage />} />
          <Route path="/harta-site" element={<Sitemap />} />

          <Route path="/stiri/drept-civil-si-administrativ" element={<LegalNewsPage initialCategory="Drept Civil și Administrativ" pageTitle="Știri Drept Civil și Administrativ" />} />
          <Route path="/stiri/drept-penal" element={<LegalNewsPage initialCategory="Drept Penal (General)" pageTitle="Știri Drept Penal" />} />
          <Route path="/stiri/dreptul-familiei" element={<LegalNewsPage initialCategory="Dreptul Familiei și Violență Domestică" pageTitle="Știri Dreptul Familiei" />} />
          <Route path="/stiri/criminalitate-organizata" element={<LegalNewsPage initialCategory="Drept Penal: Criminalitate Organizată și Trafic" pageTitle="Știri Criminalitate Organizată" />} />
          <Route path="/stiri/coruptie-si-serviciu" element={<LegalNewsPage initialCategory="Drept Penal: Corupție și Infracțiuni de Serviciu" pageTitle="Știri Corupție și Serviciu" />} />
          <Route path="/stiri/infractiuni-rutiere" element={<LegalNewsPage initialCategory="Drept Penal: Infracțiuni Rutiere" pageTitle="Știri Infracțiuni Rutiere" />} />
          <Route path="/stiri/infractiuni-contra-persoanei" element={<LegalNewsPage initialCategory="Drept Penal: Infracțiuni contra Persoanei" pageTitle="Știri Infracțiuni contra Persoanei" />} />
          <Route path="/stiri/infractiuni-contra-patrimoniului" element={<LegalNewsPage initialCategory="Drept Penal: Infracțiuni contra Patrimoniului" pageTitle="Știri Infracțiuni contra Patrimoniului" />} />
          <Route path="/stiri/infractiuni-economice" element={<LegalNewsPage initialCategory="Drept Penal: Infracțiuni Economice și Fals" pageTitle="Știri Infracțiuni Economice" />} />

          <Route path="/stiri/jurisprudenta" element={<LegalNewsPage initialCategory="Jurisprudență (General)" pageTitle="Noutăți Jurisprudență" />} />

          <Route path="/raport-predictiv" element={<React.Suspense fallback={<div>Loading...</div>}><PredictiveReportPage /></React.Suspense>} />

          <Route path="/stiri" element={<LegalNewsPage />} />
          <Route path="/stiri/articol/:slug" element={<ArticleDetailPage />} />
          <Route path="/evenimente" element={<LegalNewsPage />} />
          <Route path="/editura" element={<LegalNewsPage />} />
          <Route path="/cariere" element={<LegalNewsPage />} />
          <Route path="/profesionisti" element={<LegalNewsPage />} />


          <Route path="*" element={<div className="p-12 text-center text-red-600 font-bold">404 - Debug: Route not found</div>} />
        </Routes>
      </DosarProvider>
    </AuthProvider>
  );
};

export default App;
