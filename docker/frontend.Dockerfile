# ====== 构建阶段 ======
FROM node:20-alpine AS builder
WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm ci

# 注入前端可用的服务密钥（非 LLM Key，仅用于访问后端 Prompt Service）
ARG VITE_PROMPT_SERVICE_KEY
ENV VITE_PROMPT_SERVICE_KEY=$VITE_PROMPT_SERVICE_KEY

# 复制源码并构建
COPY . .
RUN npm run build

# ====== 运行阶段 ======
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
