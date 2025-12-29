# 找不到 Android SDK 选项的解决方案

## 🔍 问题诊断

如果在 Android Studio 的 Settings 中找不到 "Android SDK" 选项，可能的原因：

1. **首次启动未完成设置向导**
2. **Android Studio 安装不完整**
3. **SDK 路径未配置**
4. **需要通过菜单栏访问**

## ✅ 解决方案

### 方法 1：通过菜单栏访问 SDK Manager（最简单）

1. **点击顶部菜单栏的 "Tools"**
2. **选择 "SDK Manager"**
   - 这会直接打开 SDK Manager 窗口（独立窗口）
3. 在 SDK Manager 窗口中：
   - 切换到 **"SDK Tools"** 标签页
   - 勾选 **"Android Emulator"** 和其他必要组件
   - 点击 **"Apply"** 安装

### 方法 2：完成首次设置向导

如果 Android Studio 是首次启动：

1. **关闭当前的 Settings 窗口**
2. **查看 Android Studio 主窗口**
   - 应该会看到 "Welcome to Android Studio" 或设置向导
3. **按照向导完成设置**：
   - 选择 "Standard" 安装类型
   - 等待下载和配置 SDK（可能需要 20-40 分钟）
   - 完成所有步骤

### 方法 3：重新打开 Welcome 屏幕

1. **关闭 Android Studio**
2. **重新打开 Android Studio**
3. 如果看到 Welcome 屏幕：
   - 点击 **"More Actions"** > **"SDK Manager"**
   - 或者点击 **"Configure"** > **"SDK Manager"**

### 方法 4：手动检查 SDK 路径

运行以下命令检查 SDK 是否存在：

```powershell
# 检查默认 SDK 路径
Test-Path "$env:LOCALAPPDATA\Android\Sdk"

# 列出 Android 相关目录
Get-ChildItem "$env:LOCALAPPDATA\Android" -ErrorAction SilentlyContinue
```

如果 SDK 目录不存在，需要：
1. 完成 Android Studio 的首次设置
2. 或者手动指定 SDK 路径

### 方法 5：通过项目设置访问

如果已经打开了项目：

1. **右键点击项目根目录**（在左侧项目树中）
2. **选择 "Open Module Settings"** 或 **"Project Structure"**
3. 在左侧选择 **"SDK Location"**
4. 这里可以查看和配置 SDK 路径

### 方法 6：使用命令行工具

如果 SDK 已安装但 Android Studio 无法识别：

```powershell
# 1. 检查 SDK 是否存在
$sdkPath = "$env:LOCALAPPDATA\Android\Sdk"
if (Test-Path $sdkPath) {
    Write-Host "SDK 路径: $sdkPath"
    
    # 2. 尝试使用 sdkmanager
    $sdkmanager = Join-Path $sdkPath "cmdline-tools\latest\bin\sdkmanager.bat"
    if (Test-Path $sdkmanager) {
        Write-Host "找到 sdkmanager，可以使用命令行安装"
        Write-Host "运行: $sdkmanager 'emulator' 'platform-tools'"
    }
}
```

## 🚀 推荐操作流程

### 步骤 1：尝试菜单栏方式

1. 在 Android Studio 中，点击 **"Tools"** > **"SDK Manager"**
2. 如果打开了 SDK Manager 窗口，继续下一步
3. 如果提示错误或无法打开，继续步骤 2

### 步骤 2：检查是否完成首次设置

1. **关闭 Android Studio**
2. **重新打开 Android Studio**
3. 查看是否出现 Welcome 屏幕或设置向导
4. 如果有，按照向导完成设置

### 步骤 3：验证 SDK 安装

运行检查脚本：

```powershell
cd packages/mobile
powershell -ExecutionPolicy Bypass -File fix-sdk-emulator.ps1
```

## ⚠️ 如果所有方法都失败

可能需要重新安装 Android Studio：

1. **完全卸载 Android Studio**
2. **删除 SDK 目录**（可选）：
   ```powershell
   Remove-Item -Recurse -Force "$env:LOCALAPPDATA\Android\Sdk" -ErrorAction SilentlyContinue
   ```
3. **重新下载并安装 Android Studio**
4. **选择 "Standard" 安装类型**
5. **等待所有组件自动安装**

## 📝 快速检查清单

- [ ] 尝试 `Tools` > `SDK Manager`
- [ ] 检查是否有 Welcome 屏幕
- [ ] 验证 SDK 目录是否存在
- [ ] 运行修复脚本
- [ ] 如果都不行，考虑重新安装

## 💡 提示

- **Tools > SDK Manager** 是最可靠的方法，即使 Settings 中没有选项也能使用
- 首次安装 Android Studio 后，必须完成设置向导才能正常使用
- 确保网络连接稳定，SDK 下载需要时间

