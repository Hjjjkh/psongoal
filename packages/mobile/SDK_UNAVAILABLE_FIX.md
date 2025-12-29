# 修复 "Required Component Missing" 和 "(unavailable)" 问题

## 🔍 问题诊断

当看到以下情况时：
- ⚠️ "Required Component Missing" 警告
- ❌ Android SDK 显示 "(unavailable)"
- ❌ Android 16.0 显示 "(unavailable)"
- 📦 下载大小为 0 B

这通常表示：
1. **网络连接问题**（无法访问 Google 服务器）
2. **需要配置代理或镜像源**
3. **API 版本太新**（Android 16.0 可能还未正式发布）

## ✅ 解决方案

### 方法 1：选择较低版本的 Android API（推荐）

1. **取消勾选 Android 16.0**
   - 点击取消勾选 `[□] Android 16.0 ("Baklava"; API 36.0)`

2. **选择稳定的 API 版本**
   - 在组件列表中查找并勾选：
     - ✅ `Android 14.0 (API 34)` 或
     - ✅ `Android 13.0 (API 33)` 或
     - ✅ `Android 12.0 (API 31)`

3. **确保勾选基础组件**
   - ✅ `Android SDK Platform`（必须）
   - ✅ `Android SDK`（如果可用）

4. **点击 "Next" 继续**

### 方法 2：先完成设置，稍后安装组件

1. **点击 "OK" 关闭警告弹窗**
2. **点击 "Finish" 完成设置**
3. **稍后通过 SDK Manager 安装组件**：
   - `Tools` > `SDK Manager`
   - 在 `SDK Platforms` 标签页选择稳定的 API 版本
   - 在 `SDK Tools` 标签页安装必要工具

### 方法 3：配置代理或镜像源

如果网络无法访问 Google 服务器：

1. **配置 HTTP Proxy**：
   - `Settings` > `Appearance & Behavior` > `System Settings` > `HTTP Proxy`
   - 设置代理服务器（如果需要）

2. **使用国内镜像源**（如果在中国）：
   - 在 SDK Manager 中配置镜像源
   - 或使用代理工具

### 方法 4：检查网络连接

```powershell
# 测试网络连接
Test-NetConnection -ComputerName dl.google.com -Port 443
Test-NetConnection -ComputerName android.googlesource.com -Port 443
```

## 🎯 推荐操作流程

### 步骤 1：选择稳定的 API 版本

**不要选择 Android 16.0**，选择以下之一：
- ✅ **Android 14.0 (API 34)** - 最新稳定版（推荐）
- ✅ **Android 13.0 (API 33)** - 稳定版
- ✅ **Android 12.0 (API 31)** - 兼容性好

### 步骤 2：勾选必要组件

确保勾选：
- ✅ `Android SDK Platform`
- ✅ 选择一个稳定的 Android API 版本（如 API 34）

### 步骤 3：继续安装

1. 点击 **"Next"** 或 **"Finish"**
2. 等待下载（可能需要 10-30 分钟）
3. 如果下载失败，尝试方法 2

### 步骤 4：通过 SDK Manager 补充安装

如果初始设置完成但缺少组件：

1. 打开 `Tools` > `SDK Manager`
2. 在 **SDK Platforms** 标签页：
   - 勾选 `Android 14.0 (API 34)` 或 `Android 13.0 (API 33)`
3. 在 **SDK Tools** 标签页：
   - ✅ `Android Emulator`
   - ✅ `Android SDK Platform-Tools`
   - ✅ `Android SDK Build-Tools`
4. 点击 **"Apply"** 安装

## ⚠️ 关于 Android 16.0

**Android 16.0 ("Baklava")** 可能：
- 还未正式发布
- 只在预览版中可用
- 需要特殊配置才能下载

**建议**：先使用稳定的 API 版本（如 API 33 或 34），等 Android 16.0 正式发布后再升级。

## 🔧 如果所有组件都显示 unavailable

### 检查 1：网络连接

```powershell
# 测试 Google 服务
ping dl.google.com
```

### 检查 2：防火墙设置

- 确保防火墙允许 Android Studio 访问网络
- 临时关闭防火墙测试（不推荐长期关闭）

### 检查 3：代理设置

如果使用代理：
1. `Settings` > `HTTP Proxy`
2. 配置正确的代理服务器
3. 测试连接

### 检查 4：使用命令行工具

如果 GUI 无法下载，尝试命令行：

```powershell
cd $env:LOCALAPPDATA\Android\Sdk
.\cmdline-tools\latest\bin\sdkmanager.bat "platform-tools" "platforms;android-34"
```

## 📋 快速操作清单

- [ ] 取消勾选 Android 16.0
- [ ] 选择 Android 14.0 (API 34) 或 Android 13.0 (API 33)
- [ ] 确保勾选 Android SDK Platform
- [ ] 点击 Next/Finish
- [ ] 如果失败，先完成设置，稍后通过 SDK Manager 安装
- [ ] 通过 Tools > SDK Manager 安装 Android Emulator

## 💡 提示

- **首次安装**：选择稳定的 API 版本，不要选择预览版
- **网络问题**：如果在中国，可能需要配置代理或使用镜像源
- **分步安装**：可以先完成基础设置，再通过 SDK Manager 安装其他组件

