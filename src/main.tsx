import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import { runSecurityCheck } from './lib/security-check';
import { ErrorBoundary } from './components/ErrorBoundary';

// 开发环境安全自检：防止 API Key 泄露到前端 bundle
runSecurityCheck();

// 添加 js-anim 类以启用 reveal 滚动渐入动画
(function () {
  try {
    document.documentElement.classList.add('js-anim');
  } catch (e) {
    // 忽略
  }
})();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <App />
      </HashRouter>
    </ErrorBoundary>
  </StrictMode>
);
