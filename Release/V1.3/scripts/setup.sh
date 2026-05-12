#!/bin/bash

# OpenCinema 一键初始化脚本
# 用法: bash scripts/setup.sh

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== OpenCinema 环境初始化 ==="
echo ""

# 1. 检查 Node.js 版本
if ! command -v node &> /dev/null; then
    echo "❌ 未检测到 Node.js，请先安装 Node.js 18+"
    echo "   推荐: https://nodejs.org/ 下载 LTS 版本"
    exit 1
fi

NODE_VERSION=$(node --version | sed 's/v//')
NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 18 ]; then
    echo "❌ Node.js 版本过低: $NODE_VERSION (需要 18+)"
    exit 1
fi
echo "✅ Node.js 版本: $NODE_VERSION"

# 2. 检查 npm
if ! command -v npm &> /dev/null; then
    echo "❌ 未检测到 npm，请安装 npm"
    exit 1
fi
echo "✅ npm 版本: $(npm --version)"

# 3. 安装依赖
echo ""
echo "[1/5] 安装项目依赖..."
if [ -d node_modules ]; then
    echo "   node_modules 已存在，执行 npm install 确保依赖完整..."
fi
npm install

# 4. 创建 .env 文件（如果不存在）
echo ""
echo "[2/5] 检查环境变量文件..."
if [ ! -f .env ]; then
    cat > .env << 'EOF'
DATABASE_URL="file:./prisma/dev.db"
DREAMINA_API_KEY=""
EOF
    echo "✅ 已创建 .env 文件"
    echo "   ⚠️  请编辑 .env 文件，将 DREAMINA_API_KEY 替换为你的 API 密钥"
else
    echo "✅ .env 文件已存在，跳过"
fi

# 5. 初始化 Prisma
echo ""
echo "[3/5] 初始化 Prisma..."
npx prisma generate

# 6. 创建数据库
echo ""
echo "[4/5] 创建数据库..."
if [ -f prisma/dev.db ]; then
    echo "   数据库已存在 (prisma/dev.db)，跳过迁移"
else
    npx prisma migrate dev --name init
    echo "✅ 数据库初始化完成"
fi

# 7. 创建上传目录
echo ""
echo "[5/5] 创建上传目录..."
mkdir -p public/uploads
echo "✅ public/uploads/ 已就绪"

# 8. 给 start.sh 加执行权限
chmod +x scripts/start.sh 2>/dev/null || true

echo ""
echo "=== 初始化完成 ==="
echo ""
echo "下一步操作："
echo ""
if grep -q 'DREAMINA_API_KEY=""' .env 2>/dev/null; then
    echo "  ⚠️  DREAMINA_API_KEY 为空，请先配置 API Key:"
    echo "     1. 编辑 .env 文件，设置 DREAMINA_API_KEY"
    echo "     2. 或者启动后在 http://localhost:3000/settings 页面配置"
    echo ""
fi
echo "  启动开发服务器:  bash scripts/start.sh"
echo "  或者:            npm run dev"
echo ""
