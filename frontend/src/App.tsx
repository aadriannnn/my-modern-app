import React from 'react';
import { Routes, Route } from 'react-router-dom';
import SearchPage from './pages/SearchPage';
import SettingsPage from './pages/SettingsPage';
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
      </Routes>
    </DosarProvider>
  );
};

export default App;
