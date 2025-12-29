# Android 项目初始化指南

## 🚀 快速初始化方法

### 方法 1：使用 React Native CLI（推荐）

```bash
# 1. 创建一个临时 React Native 项目作为模板
cd /tmp  # 或任何临时目录
npx react-native@0.72.6 init PsonGoalTemplate --version 0.72.6

# 2. 复制 android 目录到你的项目
cp -r PsonGoalTemplate/android /path/to/psongoal/packages/mobile/

# 3. 修改包名和配置
cd /path/to/psongoal/packages/mobile/android
# 编辑以下文件，将包名改为 com.psongoal：
# - android/app/build.gradle (applicationId)
# - android/app/src/main/AndroidManifest.xml (package)
# - android/app/src/main/java/com/.../MainActivity.java (包路径)
```

### 方法 2：手动创建（高级）

如果你熟悉 Android 开发，可以手动创建 android 目录结构。

### 方法 3：使用 Expo（简化版）

如果不想处理原生代码，可以考虑迁移到 Expo：
- 更简单的开发流程
- 不需要 Android Studio
- 但功能可能受限

## 📋 详细步骤

### 步骤 1：安装 Android Studio

1. 下载：https://developer.android.com/studio
2. 安装 Android Studio
3. 打开 Android Studio，首次运行会下载必要的组件

### 步骤 2：配置 Android SDK

1. 打开 Android Studio
2. 选择 "More Actions" > "SDK Manager"
3. 安装以下组件：
   - Android SDK Platform (API 33 或更高)
   - Android SDK Platform-Tools
   - Android SDK Build-Tools
   - Android Emulator（如果需要模拟器）

### 步骤 3：配置环境变量

#### Windows PowerShell

```powershell
# 设置 ANDROID_HOME
[System.Environment]::SetEnvironmentVariable('ANDROID_HOME', 'C:\Users\YourName\AppData\Local\Android\Sdk', 'User')

# 添加到 PATH
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
$newPath = "$currentPath;%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\tools"
[Environment]::SetEnvironmentVariable("Path", $newPath, "User")
```

#### macOS/Linux

```bash
# 添加到 ~/.zshrc 或 ~/.bashrc
export ANDROID_HOME=$HOME/Library/Android/sdk  # macOS
# 或
export ANDROID_HOME=$HOME/Android/Sdk  # Linux

export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin

# 重新加载
source ~/.zshrc  # 或 source ~/.bashrc
```

### 步骤 4：初始化 Android 项目

运行配置脚本：

```bash
# Windows
cd packages/mobile
powershell -ExecutionPolicy Bypass -File setup-android.ps1

# macOS/Linux
cd packages/mobile
chmod +x setup-android.sh
./setup-android.sh
```

### 步骤 5：创建 Android 模拟器（可选）

1. 打开 Android Studio
2. 选择 "More Actions" > "Virtual Device Manager"
3. 点击 "Create Device"
4. 选择设备型号（推荐 Pixel 5）
5. 选择系统镜像（推荐 API 33）
6. 完成创建

### 步骤 6：运行应用

```bash
# 启动 Metro Bundler
pnpm dev:mobile

# 在另一个终端运行 Android
pnpm android
```

## 🔧 配置 android 目录

如果 android 目录已存在，需要检查以下配置：

### 1. 修改包名

编辑 `android/app/build.gradle`：
```gradle
android {
    defaultConfig {
        applicationId "com.psongoal"  // 修改为你的包名
        // ...
    }
}
```

### 2. 修改 AndroidManifest.xml

编辑 `android/app/src/main/AndroidManifest.xml`：
```xml
<manifest package="com.psongoal">
    <!-- ... -->
</manifest>
```

### 3. 修改 MainActivity 包路径

将 `android/app/src/main/java/com/templatename/MainActivity.java` 移动到：
`android/app/src/main/java/com/psongoal/MainActivity.java`

并更新包声明：
```java
package com.psongoal;
```

## ⚠️ 常见问题

### 问题 1：Gradle 构建失败

```bash
cd packages/mobile/android
./gradlew clean
./gradlew --stop
```

### 问题 2：端口被占用

```bash
# 查找占用 8081 端口的进程
# Windows
netstat -ano | findstr :8081

# macOS/Linux
lsof -i :8081

# 杀死进程后重试
```

### 问题 3：无法连接到 Metro

在 Android 设备上：
1. 摇一摇设备
2. 选择 "Settings"
3. 设置 "Debug server host & port for device" 为：
   - Windows: `10.0.2.2:8081`
   - macOS/Linux: `localhost:8081`

## 📚 参考资源

- [React Native 官方文档](https://reactnative.dev/docs/getting-started)
- [Android 开发文档](https://developer.android.com/)
- [React Native 环境搭建](https://reactnative.dev/docs/environment-setup)

