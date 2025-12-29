# 修复 "SDK emulator directory is missing" 错误

## 🔧 问题描述

安装 Android Studio 时出现 "SDK emulator directory is missing" 或 "standard失败" 错误。

## ✅ 解决方案

### 方法 1：通过 Android Studio SDK Manager 安装（推荐）

1. **打开 Android Studio**
   - 如果已经打开，选择 `File` > `Settings`（或 `Configure` > `Settings`）

2. **打开 SDK Manager**
   - 选择 `Appearance & Behavior` > `System Settings` > `Android SDK`
   - 或直接点击工具栏的 SDK Manager 图标

3. **安装必要的组件**
   
   在 **SDK Platforms** 标签页：
   - 勾选 `Android 13.0 (Tiramisu)` 或更高版本（API 33+）
   - 点击 `Apply` 安装

   在 **SDK Tools** 标签页：
   - ✅ 勾选 `Android Emulator`
   - ✅ 勾选 `Android SDK Platform-Tools`
   - ✅ 勾选 `Android SDK Build-Tools`
   - ✅ 勾选 `Android SDK Command-line Tools`
   - 点击 `Apply` 安装

4. **等待安装完成**
   - 安装过程可能需要 10-30 分钟
   - 确保网络连接稳定

### 方法 2：使用命令行工具安装

如果 SDK Manager 无法使用，可以使用命令行：

```powershell
# 1. 找到 sdkmanager 工具
cd $env:LOCALAPPDATA\Android\Sdk

# 2. 如果 cmdline-tools 存在
.\cmdline-tools\latest\bin\sdkmanager.bat "emulator" "platform-tools"

# 3. 或者如果 tools 目录存在
.\tools\bin\sdkmanager.bat "emulator" "platform-tools"
```

### 方法 3：手动创建目录结构

如果上述方法都失败，可以手动创建：

```powershell
# 创建 emulator 目录（但这不是完整解决方案）
New-Item -ItemType Directory -Path "$env:LOCALAPPDATA\Android\Sdk\emulator" -Force
```

**注意**：手动创建目录不会安装实际的工具，仍需通过 SDK Manager 安装。

## 🔍 验证安装

运行以下命令验证：

```powershell
# 检查 SDK 路径
$env:ANDROID_HOME

# 检查 emulator 目录
Test-Path "$env:LOCALAPPDATA\Android\Sdk\emulator"

# 检查 platform-tools
Test-Path "$env:LOCALAPPDATA\Android\Sdk\platform-tools"

# 检查 ADB
adb version
```

## ⚠️ 常见问题

### 问题 1：SDK Manager 无法打开

**解决方案**：
- 重启 Android Studio
- 检查是否有足够的磁盘空间（至少 5GB）
- 以管理员身份运行 Android Studio

### 问题 2：下载失败或超时

**解决方案**：
- 配置代理或使用 VPN
- 在 Android Studio 中设置 HTTP Proxy：
  - `File` > `Settings` > `Appearance & Behavior` > `System Settings` > `HTTP Proxy`
- 使用国内镜像源（如果可用）

### 问题 3：权限错误

**解决方案**：
- 以管理员身份运行 Android Studio
- 检查 SDK 目录的写入权限
- 确保用户对 `%LOCALAPPDATA%\Android\Sdk` 有完全控制权限

### 问题 4：环境变量未设置

**解决方案**：
运行配置脚本：
```powershell
cd packages/mobile
powershell -ExecutionPolicy Bypass -File fix-sdk-emulator.ps1
```

或手动设置：
```powershell
# 设置 ANDROID_HOME
[System.Environment]::SetEnvironmentVariable('ANDROID_HOME', "$env:LOCALAPPDATA\Android\Sdk", 'User')

# 添加到 PATH
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
$sdkPath = "$env:LOCALAPPDATA\Android\Sdk"
$newPath = "$currentPath;$sdkPath\platform-tools;$sdkPath\emulator;$sdkPath\tools"
[Environment]::SetEnvironmentVariable("Path", $newPath, "User")
```

## 📋 完整修复步骤

1. **运行修复脚本**：
   ```powershell
   cd packages/mobile
   powershell -ExecutionPolicy Bypass -File fix-sdk-emulator.ps1
   ```

2. **通过 Android Studio 安装组件**：
   - 打开 SDK Manager
   - 安装 Android Emulator 和 Platform-Tools

3. **重启 Android Studio**

4. **重新打开终端窗口**（使环境变量生效）

5. **验证安装**：
   ```powershell
   adb version
   emulator -version
   ```

## 💡 预防措施

为了避免将来出现类似问题：

1. **使用 Standard 安装**：首次安装时选择 "Standard" 安装类型
2. **保持网络连接**：确保安装过程中网络稳定
3. **足够的磁盘空间**：至少保留 10GB 可用空间
4. **定期更新**：通过 SDK Manager 定期更新 SDK 和工具

## 🆘 仍然无法解决？

如果以上方法都无法解决问题：

1. **完全卸载并重新安装 Android Studio**
2. **检查 Windows 防火墙和杀毒软件设置**
3. **查看 Android Studio 日志**：
   - `Help` > `Show Log in Explorer`
   - 查看最新的日志文件

4. **联系支持**：
   - Android Studio 官方文档
   - Stack Overflow
   - Android 开发者社区

