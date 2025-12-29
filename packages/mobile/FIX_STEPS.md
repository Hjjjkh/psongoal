# 在 Android Studio 中修复 SDK Emulator 问题

## 📍 当前位置
你现在在：`Settings` > `Appearance & Behavior` > `System Settings` > `Updates`

## 🎯 目标位置
需要前往：`Settings` > `Appearance & Behavior` > `System Settings` > `Android SDK`

## 📋 详细步骤

### 步骤 1：导航到 Android SDK 设置

1. **在左侧菜单栏中**，找到 `System Settings` 分类（已展开）
2. **点击 `Android SDK`**（在 `Updates` 下方）
   - 如果看不到，向下滚动左侧菜单

### 步骤 2：打开 SDK Manager

进入 `Android SDK` 页面后，你会看到：
- **SDK Platforms** 标签页（默认）
- **SDK Tools** 标签页（**重要！**）
- **SDK Update Sites** 标签页

### 步骤 3：切换到 SDK Tools 标签页

点击顶部的 **"SDK Tools"** 标签页

### 步骤 4：安装缺失的组件

在 **SDK Tools** 标签页中，找到并勾选以下项目：

#### 必须安装的组件：
- ✅ **Android Emulator**（这是解决 "emulator directory is missing" 的关键！）
- ✅ **Android SDK Platform-Tools**
- ✅ **Android SDK Build-Tools**
- ✅ **Android SDK Command-line Tools (latest)**

#### 推荐安装的组件：
- ✅ **Android SDK Platform 33**（在 SDK Platforms 标签页）
- ✅ **Intel x86 Emulator Accelerator (HAXM installer)**（如果使用 Intel CPU）

### 步骤 5：应用更改

1. 勾选所有需要的组件后
2. 点击右下角的 **"Apply"** 按钮
3. 会弹出确认对话框，点击 **"OK"**
4. 等待下载和安装完成（可能需要 10-30 分钟）
   - 进度条会显示下载进度
   - 确保网络连接稳定

### 步骤 6：完成安装

1. 安装完成后，点击 **"OK"** 关闭对话框
2. 点击 **"OK"** 关闭 Settings 窗口
3. **重启 Android Studio**（重要！）

## 🔍 验证修复

重启后，打开 PowerShell 运行：

```powershell
# 检查 emulator 目录
Test-Path "$env:LOCALAPPDATA\Android\Sdk\emulator"

# 检查 ADB
adb version
```

如果都显示正常，说明修复成功！

## ⚠️ 如果找不到 Android SDK 选项

如果左侧菜单中没有 `Android SDK` 选项：

1. 点击顶部菜单栏的 **"Tools"**
2. 选择 **"SDK Manager"**
3. 这会直接打开 SDK Manager 窗口

## 📝 快速路径总结

**方法 1（通过 Settings）：**
```
Settings > Appearance & Behavior > System Settings > Android SDK > SDK Tools
```

**方法 2（通过菜单栏）：**
```
Tools > SDK Manager > SDK Tools
```

## 💡 提示

- 如果下载速度慢，可以在 `HTTP Proxy` 中配置代理
- 确保有足够的磁盘空间（至少 5GB）
- 安装过程中不要关闭 Android Studio

