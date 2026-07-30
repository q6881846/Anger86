# ============================================
# Prompt Service Dockerfile
# Node.js 18 Alpine + Express
# ============================================
FROM node:18-alpine

WORKDIR /app

# 先复制依赖清单，利用 Docker layer cache
COPY package*.json ./
RUN npm install --production

# 复制业务代码
COPY server.js prompt-templates.json ./

# .env 由 docker-compose 挂载或 env 注入，不打包
EXPOSE 3456

CMD ["node", "server.js"]
