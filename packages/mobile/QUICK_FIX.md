# 快速修复 "SDK emulator directory is missing"

## 🚀 最快解决方法

### 步骤 1：打开 Android Studio

如果 Android Studio 已经打开，直接进行下一步。

### 步骤 2：打开 SDK Manager

1. 点击工具栏的 **SDK Manager** 图标
   - 或者：`File` > `Settings` > `Appearance & Behavior` > `System Settings` > `Android SDK`

### 步骤 3：安装缺失的组件

在 **SDK Tools** 标签页，勾选以下项目：

- ✅ **Android Emulator**（最重要！）
- ✅ **Android SDK Platform-Tools**
- ✅ **Android SDK Build-Tools**
- ✅ **Android SDK Command-line Tools**

然后点击 **Apply** 按钮，等待安装完成（可能需要 10-30 分钟）。

### 步骤 4：重启 Android Studio

安装完成后，关闭并重新打开 Android Studio。

### 步骤 5：验证修复

打开新的 PowerShell 窗口，运行：

```powershell
adb version
```

如果显示版本号，说明修复成功！

## ⚡ 如果 SDK Manager 无法打开

### 方法 A：使用命令行

```powershell
# 1. 进入 SDK 目录
cd $env:LOCALAPPDATA\Android\Sdk

# 2. 尝试使用 sdkmanager（如果存在）
.\cmdline-tools\latest\bin\sdkmanager.bat "emulator" "platform-tools"
```

### 方法 B：重新安装 Android Studio

如果以上方法都不行，可能需要完全重新安装：

1. 卸载 Android Studio
2. 删除 `%LOCALAPPDATA%\Android\Sdk` 目录（可选）
3. 重新安装 Android Studio
4. 选择 "Standard" 安装类型
5. 等待所有组件自动安装

## 📝 详细说明

更详细的解决方案请查看：`FIX_SDK_EMULATOR.md`

