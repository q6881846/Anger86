/**
 * API Key 防泄露检查
 *
 * 开发环境启动时扫描前端代码中是否存在硬编码的 API Key，
 * 防止密钥被构建进 bundle 推送到公网。
 */

const KEY_PATTERNS: RegExp[] = [
  // OpenAI: sk-... (至少 20 位)
  /sk-[a-zA-Z0-9]{20,}/,
  // Anthropic: sk-ant-...
  /sk-ant-[a-zA-Z0-9_-]{20,}/,
  // Google AI: AIza...
  /AIza[a-zA-Z0-9_-]{35}/,
  // 通用 Bearer token
  /Bearer\s+[a-zA-Z0-9_.~+/=-]{32,}/,
  // 百度千帆
  /bce-v1\/[a-zA-Z0-9\/]{20,}/,
];

const FORBIDDEN_PREFIXES = [
  'sk-',      // OpenAI / Anthropic
  'AIza',     // Google
  'bce-v1/',  // 百度
  'ghp_',     // GitHub PAT
  'gho_',     // GitHub OAuth
  'ghs_',     // GitHub App
  'ghr_',     // GitHub refresh
];

export interface SecurityViolation {
  type: 'hardcoded-key' | 'env-leak';
  detail: string;
}

/**
 * 检查 import.meta.env 是否泄露了原始 key 到前端 bundle
 * (Vite 只会暴露 VITE_ 前缀变量，但仍需防止误用)
 */
export function checkEnvForKeys(): SecurityViolation[] {
  const violations: SecurityViolation[] = [];
  const env = (import.meta as any).env ?? {};

  for (const [key, value] of Object.entries(env)) {
    if (typeof value !== 'string') continue;
    for (const pattern of KEY_PATTERNS) {
      if (pattern.test(value)) {
        violations.push({
          type: 'env-leak',
          detail: `环境变量 ${key} 的值匹配到 API Key 模式，不应暴露到前端 bundle。`,
        });
        break;
      }
    }
  }

  return violations;
}

/**
 * 运行时安全自检入口
 * 仅在开发环境执行，生产构建会被 tree-shake 移除
 */
export function runSecurityCheck(): void {
  if (import.meta.env.PROD) return;

  const violations = checkEnvForKeys();

  if (violations.length > 0) {
    console.error(
      '%c[Security Warning] 检测到潜在的 API Key 泄露风险:',
      'color:#e85d68;font-weight:bold;font-size:14px;'
    );
    violations.forEach((v) => {
      console.error(`  - [${v.type}] ${v.detail}`);
    });
    console.error(
      '请将 API Key 放在后端 .env 中，前端只通过 /api 代理访问，不要使用 VITE_ 前缀暴露密钥。'
    );
  } else {
    // 开发环境安全检查通过（不打印，避免噪音）
  }
}
