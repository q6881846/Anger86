import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';

/**
 * 构建时安全检查插件
 * 扫描前端源码中是否硬编码了 API Key，防止泄露到生产 bundle
 */
function securityScanPlugin(): Plugin {
  const KEY_PATTERNS = [
    /sk-[a-zA-Z0-9]{20,}/,
    /sk-ant-[a-zA-Z0-9_-]{20,}/,
    /AIza[a-zA-Z0-9_-]{35}/,
    /bce-v1\/[a-zA-Z0-9\/]{20,}/,
    /ghp_[a-zA-Z0-9]{36}/,
  ];

  return {
    name: 'security-scan',
    enforce: 'pre',
    transform(code, id) {
      // 只检查源码文件，跳过 node_modules
      if (id.includes('node_modules')) return null;
      if (!/\.(ts|tsx|js|jsx|vue)$/.test(id)) return null;

      for (const pattern of KEY_PATTERNS) {
        const match = code.match(pattern);
        if (match) {
          // 仅在匹配落在行内 `//` 注释之后（且非协议分隔符 ://）时才视为注释示例，避免整行跳过导致漏报真实 key
          const lineNum = code.slice(0, match.index!).split('\n').length;
          const line = code.split('\n')[lineNum - 1] || '';
          const lineStart = code.lastIndexOf('\n', match.index!) + 1;
          const colInLine = match.index! - lineStart;
          const commentIdx = line.indexOf('//');
          const isInLineComment =
            commentIdx !== -1 &&
            colInLine > commentIdx &&
            !(commentIdx > 0 && line[commentIdx - 1] === ':'); // 协议 https:// 不视为注释
          if (isInLineComment) continue;

          this.warn(
            `[security-scan] ${id}:${lineNum} 疑似硬编码 API Key: "${match[0].slice(0, 10)}..." — 请改用后端环境变量。`
          );
        }
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    securityScanPlugin(),
    visualizer({
      open: false,
      gzipSize: true,
      brotliSize: true,
      filename: 'dist/stats.html',
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3002,
    open: true,
    proxy: {
      // 后端 Express 所有路由均以 /api 开头，无需 rewrite
      // 前端 /api/health → 后端 http://localhost:3456/api/health
      '/api': {
        target: 'http://localhost:3456',
        changeOrigin: true,
        buffer: false, // 禁用代理缓冲，确保 SSE 逐段转发（避免 0 字符/卡首字节）
        // SSE 流式（/api/genesis/stream）保活：确保逐段转发到浏览器
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            const ct = proxyRes.headers['content-type'] || '';
            if (ct.includes('text/event-stream')) {
              proxyRes.headers['Cache-Control'] = 'no-cache, no-transform';
              proxyRes.headers['X-Accel-Buffering'] = 'no';
            }
          });
        },
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
