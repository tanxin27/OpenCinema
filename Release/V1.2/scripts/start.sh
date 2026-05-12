#!/bin/bash

# OpenCinema 一键启动脚本
# 用法: bash scripts/start.sh

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== OpenCinema 启动 ==="
echo ""

# 1. 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 未检测到 Node.js，请先安装 Node.js 18+"
    exit 1
fi

# 2. 检查依赖
if [ ! -d node_modules ]; then
    echo "❌ 未找到 node_modules，请先运行初始化脚本:"
    echo "   bash scripts/setup.sh"
    exit 1
fi

# 3. 检查 .env
if [ ! -f .env ]; then
    echo "❌ 未找到 .env 文件，请先运行初始化脚本:"
    echo "   bash scripts/setup.sh"
    exit 1
fi

# 4. 检查数据库
if [ ! -f prisma/dev.db ]; then
    echo "❌ 未找到数据库 (prisma/dev.db)，请先运行初始化脚本:"
    echo "   bash scripts/setup.sh"
    exit 1
fi

# 5. 提示 API Key 配置（首次使用）
if grep -q 'DREAMINA_API_KEY=""' .env 2>/dev/null; then
    echo "💡 提示: DREAMINA_API_KEY 尚未配置"
    echo "   启动后前往 http://localhost:3000/settings 页面填写即可"
    echo ""
fi

# 6. 检查端口是否被占用
PORT=3000
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  端口 $PORT 已被占用，尝试查找现有进程..."
    PID=$(lsof -Pi :$PORT -sTCP:LISTEN -t 2>/dev/null | head -1)
    if [ -n "$PID" ]; then
        echo "   发现进程 PID: $PID"
        echo "   如需停止现有进程: kill $PID"
    fi
    echo ""
fi

# 7. 启动开发服务器
echo "🚀 启动开发服务器..."
echo "   应用将在 http://localhost:3000 运行"
echo "   按 Ctrl+C 停止服务器"
echo ""

npm run dev
