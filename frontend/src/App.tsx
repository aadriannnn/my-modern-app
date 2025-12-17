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

import { AuthProvider } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CompleteProfilePage from './pages/CompleteProfilePage';

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
          <Route path="/setari" element={<SettingsPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/test-analysis" element={<TestAnalysisPage />} />
        </Routes>
      </DosarProvider>
    </AuthProvider>
  );
};

export default App;
