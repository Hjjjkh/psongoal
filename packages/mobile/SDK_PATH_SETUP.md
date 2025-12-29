# Android SDK 路径设置指南

## 📍 当 Android Studio 要求指定 SDK 位置时

如果 Android Studio 提示 "SDK location is missing" 或要求你指定 SDK 路径，请按以下步骤操作。

## ✅ 推荐路径（Windows）

### 默认路径（推荐）

```
C:\Users\你的用户名\AppData\Local\Android\Sdk
```

**完整路径示例：**
```
C:\Users\34802\AppData\Local\Android\Sdk
```

### 如何获取你的路径

在 PowerShell 中运行：
```powershell
Write-Host "$env:LOCALAPPDATA\Android\Sdk"
```

这会显示你的完整路径。

## 🎯 在 Android Studio 中设置

### 步骤 1：输入路径

当 Android Studio 要求指定 SDK 位置时：

1. **复制推荐的路径**（见上方）
2. **粘贴到 Android Studio 的输入框**
3. **点击 "Next" 或 "Finish"**

### 步骤 2：如果路径不存在

如果路径不存在，Android Studio 会询问是否创建：

1. **点击 "Yes" 或 "OK"** 创建目录
2. 等待 Android Studio 初始化 SDK

### 步骤 3：等待下载

设置路径后，Android Studio 会：
- 下载必要的 SDK 组件
- 安装 Android Emulator
- 安装 Platform-Tools
- 这个过程可能需要 20-40 分钟

## 🔧 手动创建目录（如果需要）

如果 Android Studio 无法自动创建目录，可以手动创建：

```powershell
# 创建 Android 目录
New-Item -ItemType Directory -Path "$env:LOCALAPPDATA\Android" -Force

# 创建 SDK 目录
New-Item -ItemType Directory -Path "$env:LOCALAPPDATA\Android\Sdk" -Force
```

## 📝 设置环境变量

设置 SDK 路径后，配置环境变量：

```powershell
# 设置 ANDROID_HOME
$sdkPath = "$env:LOCALAPPDATA\Android\Sdk"
[System.Environment]::SetEnvironmentVariable('ANDROID_HOME', $sdkPath, 'User')
$env:ANDROID_HOME = $sdkPath

# 添加到 PATH
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
$newPath = "$currentPath;$sdkPath\platform-tools;$sdkPath\emulator;$sdkPath\tools"
[Environment]::SetEnvironmentVariable("Path", $newPath, "User")
```

## ⚠️ 注意事项

### 路径要求

- ✅ **不要使用空格**：路径中不要有空格（如 `Program Files`）
- ✅ **使用完整路径**：不要使用相对路径
- ✅ **有写入权限**：确保对目录有写入权限
- ❌ **避免中文路径**：路径中不要包含中文字符

### 推荐路径位置

- ✅ **用户目录下**：`%LOCALAPPDATA%\Android\Sdk`（推荐）
- ✅ **其他位置**：`C:\Android\Sdk`（也可以）
- ❌ **避免**：`C:\Program Files\Android\Sdk`（权限问题）

## 🔍 验证设置

设置完成后，验证：

```powershell
# 检查路径
Test-Path "$env:LOCALAPPDATA\Android\Sdk"

# 检查环境变量
$env:ANDROID_HOME

# 检查 ADB（安装完成后）
adb version
```

## 💡 常见问题

### 问题 1：路径无效

**解决方案**：
- 确保路径使用反斜杠 `\`（Windows）
- 确保路径完整且存在
- 避免使用特殊字符

### 问题 2：权限不足

**解决方案**：
- 使用用户目录下的路径（推荐）
- 以管理员身份运行 Android Studio（如果需要）

### 问题 3：路径已存在但为空

**解决方案**：
- 删除空目录
- 让 Android Studio 重新创建并下载

## 🚀 快速设置脚本

运行以下脚本自动设置：

```powershell
# 创建 SDK 目录
$sdkPath = "$env:LOCALAPPDATA\Android\Sdk"
if (-not (Test-Path "$env:LOCALAPPDATA\Android")) {
    New-Item -ItemType Directory -Path "$env:LOCALAPPDATA\Android" -Force | Out-Null
}
if (-not (Test-Path $sdkPath)) {
    New-Item -ItemType Directory -Path $sdkPath -Force | Out-Null
}

# 显示路径
Write-Host "SDK 路径已创建: $sdkPath" -ForegroundColor Green
Write-Host ""
Write-Host "请在 Android Studio 中使用此路径:" -ForegroundColor Cyan
Write-Host $sdkPath -ForegroundColor Yellow
```

## 📋 完整流程

1. **运行脚本创建目录**（或手动创建）
2. **在 Android Studio 中输入路径**
3. **等待 Android Studio 下载 SDK**
4. **配置环境变量**（运行 setup-android.ps1）
5. **验证安装**

