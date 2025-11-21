import React from 'react';
import { Routes, Route } from 'react-router-dom';
import SearchPage from './pages/SearchPage';
import SettingsPage from './pages/SettingsPage';
import TermsPage from './pages/TermsPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import { DosarProvider } from './context/DosarContext';
import DosarDrawer from './components/DosarDrawer';
import DosarToast from './components/DosarToast';

const App: React.FC = () => {
  return (
    <DosarProvider>
      <DosarDrawer />
      <DosarToast />
      <Routes>
        <Route path="/" element={<SearchPage />} />
        <Route path="/setari" element={<SettingsPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
      </Routes>
    </DosarProvider>
  );
};

export default App;
