# 将 Android SDK 安装到 D 盘

## 📍 D 盘推荐路径

### 标准路径（推荐）

```
D:\Android\Sdk
```

### 其他可选路径

- `D:\AndroidSDK\Sdk`
- `D:\Development\Android\Sdk`
- `D:\Programs\Android\Sdk`

## ✅ 在 Android Studio 中设置

### 步骤 1：使用推荐路径

在 Android Studio 的 SDK Setup 界面：

1. **在 "Android SDK Location" 输入框中输入**：
   ```
   D:\Android\Sdk
   ```

2. **点击 "Next" 或 "Finish"**

3. **如果提示目录不存在**：
   - 点击 "Yes" 创建目录
   - 或手动创建后重试

### 步骤 2：等待下载

Android Studio 会：
- 在 D 盘创建 SDK 目录结构
- 下载必要的 SDK 组件
- 安装 Android Emulator
- 这个过程可能需要 20-40 分钟

## 🔧 配置环境变量

安装完成后，需要配置环境变量指向 D 盘：

### 方法 1：使用 PowerShell 脚本

```powershell
# 设置 ANDROID_HOME
$sdkPath = "D:\Android\Sdk"
[System.Environment]::SetEnvironmentVariable('ANDROID_HOME', $sdkPath, 'User')
$env:ANDROID_HOME = $sdkPath

# 添加到 PATH
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
$newPath = "$currentPath;$sdkPath\platform-tools;$sdkPath\emulator;$sdkPath\tools"
[Environment]::SetEnvironmentVariable("Path", $newPath, "User")

Write-Host "✓ 环境变量已设置" -ForegroundColor Green
```

### 方法 2：手动设置

1. **打开系统环境变量**：
   - 右键 "此电脑" > "属性"
   - "高级系统设置" > "环境变量"

2. **添加用户变量**：
   - 变量名：`ANDROID_HOME`
   - 变量值：`D:\Android\Sdk`

3. **编辑 Path 变量**：
   - 添加：`%ANDROID_HOME%\platform-tools`
   - 添加：`%ANDROID_HOME%\emulator`
   - 添加：`%ANDROID_HOME%\tools`

## 📋 验证安装

设置完成后，验证：

```powershell
# 检查路径
Test-Path "D:\Android\Sdk"

# 检查环境变量
$env:ANDROID_HOME

# 检查 ADB（安装完成后）
adb version
```

## ⚠️ 注意事项

### 路径要求

- ✅ **使用反斜杠**：Windows 使用 `\` 而不是 `/`
- ✅ **避免空格**：路径中不要有空格
- ✅ **避免中文**：路径中不要包含中文字符
- ✅ **完整路径**：使用绝对路径，不要使用相对路径

### 权限问题

- 确保对 D 盘有写入权限
- 如果遇到权限问题，以管理员身份运行 Android Studio

### 磁盘空间

- 确保 D 盘有足够的空间（至少 10GB 推荐）
- SDK 和工具会占用较多空间

## 🚀 快速设置脚本

运行以下脚本自动设置：

```powershell
# 创建目录
$sdkPath = "D:\Android\Sdk"
if (-not (Test-Path "D:\Android")) {
    New-Item -ItemType Directory -Path "D:\Android" -Force | Out-Null
}
if (-not (Test-Path $sdkPath)) {
    New-Item -ItemType Directory -Path $sdkPath -Force | Out-Null
}

# 设置环境变量
[System.Environment]::SetEnvironmentVariable('ANDROID_HOME', $sdkPath, 'User')
$env:ANDROID_HOME = $sdkPath

# 添加到 PATH
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
$newPath = "$currentPath;$sdkPath\platform-tools;$sdkPath\emulator;$sdkPath\tools"
[Environment]::SetEnvironmentVariable("Path", $newPath, "User")

Write-Host "✓ SDK 目录已创建: $sdkPath" -ForegroundColor Green
Write-Host "✓ 环境变量已设置" -ForegroundColor Green
Write-Host ""
Write-Host "请在 Android Studio 中使用此路径:" -ForegroundColor Cyan
Write-Host $sdkPath -ForegroundColor Yellow
```

## 📝 完整流程

1. **运行脚本创建目录**（或手动创建 `D:\Android\Sdk`）
2. **在 Android Studio 中输入路径**：`D:\Android\Sdk`
3. **等待 Android Studio 下载 SDK**
4. **运行环境变量配置脚本**
5. **重启 Android Studio 和终端**
6. **验证安装**

## 💡 优势

将 SDK 安装到 D 盘的好处：
- ✅ **节省 C 盘空间**：SDK 文件较大，放在 D 盘可以节省 C 盘空间
- ✅ **更好的组织**：可以将所有开发工具放在 D 盘
- ✅ **避免系统盘碎片**：减少 C 盘碎片化

## 🔄 如果已经安装到 C 盘

如果想迁移到 D 盘：

1. **复制 SDK 目录**：
   ```powershell
   Copy-Item -Path "$env:LOCALAPPDATA\Android\Sdk" -Destination "D:\Android\Sdk" -Recurse
   ```

2. **更新环境变量**（使用上面的脚本）

3. **在 Android Studio 中更新路径**：
   - `Settings` > `Appearance & Behavior` > `System Settings` > `Android SDK`
   - 更新 "Android SDK Location" 为 `D:\Android\Sdk`

4. **删除 C 盘旧目录**（可选）

