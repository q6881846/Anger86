FROM node:20-alpine
WORKDIR /app

# 先复制依赖清单，利用 Docker 缓存层
COPY package*.json ./
RUN npm ci --only=production

# 复制源码
COPY . .

EXPOSE 3456
CMD ["node", "server.js"]
