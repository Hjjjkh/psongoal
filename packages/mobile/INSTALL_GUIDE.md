# Android Studio 安装指南

## 🚀 快速安装步骤

### 第一步：下载 Android Studio

我已经为你打开了下载页面。如果没有自动打开，请访问：
**https://developer.android.com/studio**

### 第二步：安装 Android Studio

1. 下载完成后，运行安装程序
2. 选择 "Standard" 安装类型（推荐）
3. 选择安装路径（默认即可）
4. 等待安装完成（可能需要 10-20 分钟）

### 第三步：首次启动配置

1. 打开 Android Studio
2. 首次启动会显示设置向导
3. 选择 "Standard" 设置
4. 等待下载 Android SDK 和工具（可能需要 10-30 分钟）

### 第四步：配置 SDK

1. 在 Android Studio 中，点击 "More Actions" > "SDK Manager"
2. 在 "SDK Platforms" 标签页：
   - 勾选 "Android 13.0 (Tiramisu)" 或更高版本（API 33+）
   - 点击 "Apply" 安装
3. 在 "SDK Tools" 标签页：
   - 确保 "Android SDK Platform-Tools" 已勾选
   - 确保 "Android SDK Build-Tools" 已勾选
   - 点击 "Apply" 安装

### 第五步：运行配置脚本

安装完成后，运行配置脚本：

```powershell
cd packages/mobile
powershell -ExecutionPolicy Bypass -File setup-android.ps1
```

或者运行完整安装脚本：

```powershell
cd packages/mobile
powershell -ExecutionPolicy Bypass -File install-android-studio.ps1
```

## 📋 安装后验证

运行以下命令验证安装：

```powershell
# 检查 Java
java -version

# 检查 Android SDK
$env:ANDROID_HOME

# 检查 ADB
adb version
```

## ⚠️ 常见问题

### 问题 1：下载速度慢

- 使用 VPN 或代理
- 使用国内镜像源（如果可用）

### 问题 2：安装失败

- 确保有足够的磁盘空间（至少 5GB）
- 关闭杀毒软件后重试
- 以管理员身份运行安装程序

### 问题 3：SDK 下载失败

- 在 Android Studio 中，选择 "File" > "Settings" > "Appearance & Behavior" > "System Settings" > "HTTP Proxy"
- 配置代理或使用镜像源

## 🎯 安装完成后

1. 运行配置脚本设置环境变量
2. 初始化 android 项目目录（参考 `INIT_ANDROID.md`）
3. 运行 `pnpm android` 启动应用

## 💡 提示

- 安装过程可能需要 30-60 分钟，请耐心等待
- 确保网络连接稳定
- 安装完成后重启电脑以确保环境变量生效

