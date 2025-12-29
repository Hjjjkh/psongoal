#!/bin/bash
# Android 开发环境自动配置脚本
# 适用于 macOS/Linux

echo "========================================"
echo "  PsonGoal 移动端 Android 环境配置"
echo "========================================"
echo ""

# 检查 Node.js
echo "[1/6] 检查 Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "  ✓ Node.js $NODE_VERSION 已安装"
else
    echo "  ✗ Node.js 未安装，请先安装 Node.js"
    exit 1
fi

# 检查 pnpm
echo "[2/6] 检查 pnpm..."
if command -v pnpm &> /dev/null; then
    PNPM_VERSION=$(pnpm --version)
    echo "  ✓ pnpm $PNPM_VERSION 已安装"
else
    echo "  ✗ pnpm 未安装，正在安装..."
    npm install -g pnpm
fi

# 检查 Java
echo "[3/6] 检查 Java..."
if command -v java &> /dev/null; then
    JAVA_VERSION=$(java -version 2>&1 | head -n 1)
    echo "  ✓ Java 已安装: $JAVA_VERSION"
else
    echo "  ✗ Java 未安装，请安装 JDK 17 或更高版本"
    echo "  下载地址: https://adoptium.net/"
fi

# 检查 Android SDK
echo "[4/6] 检查 Android SDK..."
ANDROID_SDK_PATH="$HOME/Library/Android/sdk"  # macOS
if [ "$(uname)" != "Darwin" ]; then
    ANDROID_SDK_PATH="$HOME/Android/Sdk"  # Linux
fi

if [ -n "$ANDROID_HOME" ]; then
    SDK_PATH="$ANDROID_HOME"
elif [ -d "$ANDROID_SDK_PATH" ]; then
    SDK_PATH="$ANDROID_SDK_PATH"
else
    SDK_PATH=""
fi

if [ -n "$SDK_PATH" ] && [ -d "$SDK_PATH" ]; then
    echo "  ✓ Android SDK 已找到: $SDK_PATH"
    
    # 检查环境变量
    if [ -z "$ANDROID_HOME" ]; then
        echo "  ⚠ 设置 ANDROID_HOME 环境变量..."
        echo "export ANDROID_HOME=$SDK_PATH" >> ~/.zshrc 2>/dev/null || echo "export ANDROID_HOME=$SDK_PATH" >> ~/.bashrc
        echo "export PATH=\$PATH:\$ANDROID_HOME/platform-tools:\$ANDROID_HOME/tools" >> ~/.zshrc 2>/dev/null || echo "export PATH=\$PATH:\$ANDROID_HOME/platform-tools:\$ANDROID_HOME/tools" >> ~/.bashrc
        export ANDROID_HOME="$SDK_PATH"
        echo "  ✓ ANDROID_HOME 已设置（请重新加载 shell 或运行 source ~/.zshrc）"
    fi
else
    echo "  ✗ Android SDK 未找到"
    echo ""
    echo "  请按以下步骤安装 Android Studio:"
    echo "  1. 下载 Android Studio: https://developer.android.com/studio"
    echo "  2. 安装 Android Studio"
    echo "  3. 打开 Android Studio，选择 'More Actions' > 'SDK Manager'"
    echo "  4. 安装 Android SDK Platform (API 33+)"
    echo "  5. 安装 Android SDK Platform-Tools"
    echo "  6. 重新运行此脚本"
    echo ""
    exit 1
fi

# 检查 Android 项目目录
echo "[5/6] 检查 Android 项目目录..."
ANDROID_DIR="$(dirname "$0")/android"
if [ -d "$ANDROID_DIR" ]; then
    echo "  ✓ android 目录已存在"
else
    echo "  ✗ android 目录不存在，需要初始化..."
    echo ""
    echo "  请手动创建 android 目录或使用 React Native CLI 初始化"
fi

# 检查依赖
echo "[6/6] 检查项目依赖..."
if [ -d "node_modules" ]; then
    echo "  ✓ 依赖已安装"
else
    echo "  ⚠ 依赖未安装，正在安装..."
    pnpm install
fi

echo ""
echo "========================================"
echo "  配置完成！"
echo "========================================"
echo ""
echo "下一步操作:"
echo "1. 如果 android 目录不存在，请手动创建或使用模板"
echo "2. 启动 Android 模拟器或连接真实设备"
echo "3. 运行: pnpm android"
echo ""

