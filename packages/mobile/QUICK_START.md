# 移动端快速开始指南

## ⚡ 最快运行方式（无需 Android Studio）

如果你想快速测试 JavaScript 代码，可以只运行 Metro Bundler：

```bash
# 1. 安装依赖
pnpm install

# 2. 启动 Metro Bundler
pnpm dev:mobile
```

Metro Bundler 会启动在 `http://localhost:8081`，你可以：
- 验证代码编译是否正常
- 查看是否有语法错误
- 测试 JavaScript 逻辑

## 📱 完整运行（需要 Android Studio）

### 第一步：安装 Android Studio

1. 下载：https://developer.android.com/studio
2. 安装并打开 Android Studio
3. 首次运行会自动下载 Android SDK

### 第二步：运行配置脚本

```bash
# Windows
cd packages/mobile
powershell -ExecutionPolicy Bypass -File setup-android.ps1

# macOS/Linux
cd packages/mobile
chmod +x setup-android.sh
./setup-android.sh
```

### 第三步：初始化 Android 项目

如果脚本提示 android 目录不存在，需要手动创建：

```bash
# 方法 1：使用模板（推荐）
# 创建一个临时项目
cd /tmp
npx react-native@0.72.6 init TempProject --version 0.72.6

# 复制 android 目录
cp -r TempProject/android /path/to/psongoal/packages/mobile/

# 修改包名（见 INIT_ANDROID.md）
```

### 第四步：运行应用

```bash
# 启动 Metro
pnpm dev:mobile

# 运行 Android（在另一个终端）
pnpm android
```

## 🎯 推荐流程

1. **先测试 JavaScript**：运行 `pnpm dev:mobile` 验证代码
2. **安装 Android Studio**：按照官方指南安装
3. **配置环境**：运行配置脚本
4. **初始化项目**：创建 android 目录
5. **运行应用**：`pnpm android`

## 📝 需要帮助？

- 详细配置：查看 `INIT_ANDROID.md`
- 运行问题：查看 `RUN_GUIDE.md`
- 当前状态：查看 `SETUP_STATUS.md`

