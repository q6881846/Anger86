import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ParticleBackground } from './components/ParticleBackground';
import NotFoundPage from './components/NotFoundPage';
import { NavBar } from './components/NavBar';
import { Toast } from './components/Toast';
import { PromptManagerModal } from './components/PromptManagerModal';
import { AdvancedParamsPanel } from './components/AdvancedParamsPanel';
import { Providers } from './components/Providers';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DebugLogPanel } from './components/DebugLogPanel';
import { useNovelGenesisStore } from './lib/store/novelGenesis';
import HomePage from './routes/HomePage';
import LegacyGenesisPage from './routes/LegacyGenesisPage';
import InspirationPage from './routes/InspirationPage';
import ArchitecturePage from './routes/ArchitecturePage';
import ArrangementPage from './routes/ArrangementPage';
import WritingPage from './routes/WritingPage';
import ShelfPage from './routes/ShelfPage';
import SettingsPage from './routes/SettingsPage';

// 单一全局项目，所有页面共享同一份持久化数据
const PROJECT_ID = 'novel-genesis';

function useGenesisBootstrap() {
  const setProjectId = useNovelGenesisStore((s) => s.setProjectId);
  const load = useNovelGenesisStore((s) => s.load);
  useEffect(() => {
    setProjectId(PROJECT_ID);
    load(PROJECT_ID);
  }, [setProjectId, load]);
}

function AppRoutes() {
  return (
    <div style={{ position: 'relative', zIndex: 1 }}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/shelf" element={<ShelfPage />} />
        {/* Legacy wizard (kept for backward compatibility) */}
        <Route path="/genesis" element={<LegacyGenesisPage />} />
        <Route path="/genesis/:projectId" element={<LegacyGenesisPage />} />
        {/* New 4-phase pipeline */}
        <Route path="/inspiration" element={<InspirationPage />} />
        <Route path="/architecture" element={<ArchitecturePage />} />
        <Route path="/arrangement" element={<ArrangementPage />} />
        <Route path="/writing" element={<WritingPage />} />
        {/* Redirects */}
        <Route path="/step1" element={<Navigate to="/inspiration" replace />} />
        <Route path="/step2" element={<Navigate to="/architecture" replace />} />
        <Route path="/step3" element={<Navigate to="/arrangement" replace />} />
        <Route path="/step4" element={<Navigate to="/writing" replace />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  );
}

export default function App() {
  useGenesisBootstrap();
  return (
    <ErrorBoundary>
      <Providers>
        <ParticleBackground />
        <NavBar />
        <Toast />
        <PromptManagerModal />
        <AdvancedParamsPanel />
        <DebugLogPanel />
        <AppRoutes />
      </Providers>
    </ErrorBoundary>
  );
}
