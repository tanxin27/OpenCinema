#!/bin/bash

# OpenCinema 发布前清理脚本
# 用法: bash scripts/prepare-for-share.sh

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== OpenCinema 发布前清理 ==="
echo ""

# 1. 清理环境变量文件（含 API Key）
if [ -f .env ] || [ -f .env.local ] || [ -f .env.development ] || [ -f .env.production ]; then
  echo "[1/6] 删除环境变量文件 (.env*)..."
  rm -f .env .env.local .env.development .env.production
else
  echo "[1/6] 环境变量文件已清理，跳过"
fi

# 2. 清理 SQLite 数据库（含所有业务数据）
if [ -f prisma/dev.db ] || [ -f prisma/dev.db-journal ]; then
  echo "[2/6] 删除本地 SQLite 数据库..."
  rm -f prisma/dev.db prisma/dev.db-journal
else
  echo "[2/6] 数据库已清理，跳过"
fi

# 3. 清理用户上传文件
if [ -d public/uploads ] && [ "$(ls -A public/uploads 2>/dev/null)" ]; then
  echo "[3/6] 清理用户上传文件 (public/uploads/)..."
  rm -rf public/uploads/*
  # 保留空目录结构
  mkdir -p public/uploads
else
  echo "[3/6] 上传目录已为空，跳过"
fi

# 4. 清理 Claude Code 本地配置
if [ -d .claude ]; then
  echo "[4/6] 删除 Claude Code 本地配置 (.claude/)..."
  rm -rf .claude
else
  echo "[4/6] Claude 配置已清理，跳过"
fi

# 5. 清理构建缓存和依赖（可选，体积大时建议清理）
echo "[5/6] 清理构建缓存 (.next/)..."
rm -rf .next/

echo "[6/6] 清理完成。"
echo ""
echo "=== 清理完成 ==="
echo ""
echo "下一步操作："
echo "  1. 重新安装依赖:    npm install"
echo "  2. 初始化数据库:    npx prisma migrate dev --name init"
echo "  3. 启动开发服务器:  npm run dev"
echo "  4. 在浏览器中打开:  http://localhost:3000/settings"
echo "     配置 DREAMINA_API_KEY"
echo ""
echo "注意："
echo "  - .env 文件已被删除，接收方需要自行创建并配置 API Key"
echo "  - prisma/dev.db 已被删除，接收方需要重新初始化数据库"
echo "  - public/uploads/ 已清空，接收方上传文件后会自动生成子目录"
echo ""
