import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
/**
 * 构建时安全检查插件
 * 扫描前端源码中是否硬编码了 API Key，防止泄露到生产 bundle
 */
function securityScanPlugin() {
    var KEY_PATTERNS = [
        /sk-[a-zA-Z0-9]{20,}/,
        /sk-ant-[a-zA-Z0-9_-]{20,}/,
        /AIza[a-zA-Z0-9_-]{35}/,
        /bce-v1\/[a-zA-Z0-9\/]{20,}/,
        /ghp_[a-zA-Z0-9]{36}/,
    ];
    return {
        name: 'security-scan',
        enforce: 'pre',
        transform: function (code, id) {
            // 只检查源码文件，跳过 node_modules
            if (id.includes('node_modules'))
                return null;
            if (!/\.(ts|tsx|js|jsx|vue)$/.test(id))
                return null;
            for (var _i = 0, KEY_PATTERNS_1 = KEY_PATTERNS; _i < KEY_PATTERNS_1.length; _i++) {
                var pattern = KEY_PATTERNS_1[_i];
                var match = code.match(pattern);
                if (match) {
                    // 排除注释中的示例（简单启发式：同一行有 // 或 /*）
                    var lineNum = code.slice(0, match.index).split('\n').length;
                    var lines = code.split('\n');
                    var line = lines[lineNum - 1] || '';
                    if (line.includes('//') || line.includes('*'))
                        continue;
                    this.warn("[security-scan] ".concat(id, ":").concat(lineNum, " \u7591\u4F3C\u786C\u7F16\u7801 API Key: \"").concat(match[0].slice(0, 10), "...\" \u2014 \u8BF7\u6539\u7528\u540E\u7AEF\u73AF\u5883\u53D8\u91CF\u3002"));
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
            },
        },
    },
    build: {
        outDir: 'dist',
        sourcemap: true,
    },
});
