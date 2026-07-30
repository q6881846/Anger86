/**
 * Prompt Service API Key 鉴权中间件
 * 未配置 PROMPT_SERVICE_KEY 时，仅允许本地回环访问（开发安全兜底）
 */
export function apiKeyAuth(req, res, next) {
  const serverKey = process.env.PROMPT_SERVICE_KEY;

  // 未配置密钥：仅允许本机访问（防止裸奔但保留开发便利）
  if (!serverKey) {
    const clientIp = req.ip || req.connection.remoteAddress || '';
    const isLocalhost =
      clientIp === '127.0.0.1' ||
      clientIp === '::1' ||
      clientIp === '::ffff:127.0.0.1' ||
      clientIp === '::ffff:172'; // Docker 网关网段兜底
    
    if (isLocalhost) {
      return next();
    }
    console.warn(`[Auth] Rejected remote request from ${clientIp}: PROMPT_SERVICE_KEY not set`);
    return res.status(401).json({ error: 'Service key not configured' });
  }

  // 已配置密钥：严格校验 Header 或 Query
  const clientKey = req.headers['x-api-key'] || req.query.apiKey;
  if (clientKey !== serverKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}
