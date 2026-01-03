import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SearchPage from './pages/SearchPage';
import { DosarProvider } from './context/DosarContext';
import DosarDrawer from './components/DosarDrawer';
import DosarToast from './components/DosarToast';
import { AuthProvider } from './context/AuthContext';
import CookieConsent from './components/CookieConsent';
import { Loader2 } from 'lucide-react';

// Lazy load heavy or less frequently used pages
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));
const TermsPage = React.lazy(() => import('./pages/TermsPage'));
const PrivacyPolicyPage = React.lazy(() => import('./pages/PrivacyPolicyPage'));
const CookiePolicyPage = React.lazy(() => import('./pages/CookiePolicyPage'));
const HelpCenterPage = React.lazy(() => import('./pages/HelpCenterPage'));
const GDPRPage = React.lazy(() => import('./pages/GDPRPage'));
const LandingPage = React.lazy(() => import('./pages/LandingPage'));
const TestAnalysisPage = React.lazy(() => import('./pages/TestAnalysisPage'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const RegisterPage = React.lazy(() => import('./pages/RegisterPage'));
const CompleteProfilePage = React.lazy(() => import('./pages/CompleteProfilePage'));
const ForgotPasswordPage = React.lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = React.lazy(() => import('./pages/ResetPasswordPage'));
const VerifyEmailPage = React.lazy(() => import('./pages/VerifyEmailPage'));
const AboutPage = React.lazy(() => import('./pages/AboutPage'));

const GridTestsPage = React.lazy(() => import('./pages/GridTestsPage'));
const PaymentReturnPage = React.lazy(() => import('./pages/PaymentReturnPage'));
const PricingPage = React.lazy(() => import('./pages/PricingPage'));
const TaxaTimbruPage = React.lazy(() => import('./pages/TaxaTimbruPage'));
const LawyerAssistancePage = React.lazy(() => import('./pages/LawyerAssistancePage'));
const ContactPage = React.lazy(() => import('./pages/ContactPage'));
const Sitemap = React.lazy(() => import('./pages/Sitemap'));

const LegalNewsPage = React.lazy(() => import('./pages/LegalNews/LegalNewsPage'));
const ArticleDetailPage = React.lazy(() => import('./pages/LegalNews/ArticleDetailPage'));
const LegislatiePage = React.lazy(() => import('./pages/LegislatiePage'));
const LegislatieCategoryPage = React.lazy(() => import('./pages/LegislatieCategoryPage'));
const LegislatieDetailPage = React.lazy(() => import('./pages/LegislatieDetailPage'));
const PredictiveReportPage = React.lazy(() => import('./pages/PredictiveReportPage'));

// Loading component
const PageLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh]">
    <Loader2 className="h-10 w-10 animate-spin text-brand-primary" />
    <p className="mt-4 text-brand-text-secondary">Se încarcă...</p>
  </div>
);

const App: React.FC = () => {
  return (
    <AuthProvider>
      <DosarProvider>

        <DosarDrawer />
        <DosarToast />
        <CookieConsent />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Legislation routes */}
            <Route path="/legislatie/modele/:itemSlug/index.html" element={<LegislatieDetailPage />} />
            <Route path="/legislatie/:categorySlug/:itemSlug/index.html" element={<LegislatieDetailPage />} />
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
            <Route path="/subscription" element={<Navigate to="/abonamente" replace />} />
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

            <Route path="/raport-predictiv" element={<PredictiveReportPage />} />

            <Route path="/stiri" element={<LegalNewsPage />} />
            <Route path="/stiri/articol/:slug" element={<ArticleDetailPage />} />
            <Route path="/evenimente" element={<LegalNewsPage />} />
            <Route path="/editura" element={<LegalNewsPage />} />
            <Route path="/cariere" element={<LegalNewsPage />} />
            <Route path="/profesionisti" element={<LegalNewsPage />} />


            <Route path="*" element={<div className="p-12 text-center text-red-600 font-bold">404 - Debug: Route not found</div>} />
          </Routes>
        </Suspense>
      </DosarProvider>
    </AuthProvider>
  );
};

export default App;
