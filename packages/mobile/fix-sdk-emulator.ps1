# 修复 Android SDK Emulator 目录缺失问题
# 适用于 Windows PowerShell

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  修复 Android SDK Emulator 问题" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 SDK 路径
Write-Host "[1/4] 检查 Android SDK..." -ForegroundColor Yellow
$sdkPath = "$env:LOCALAPPDATA\Android\Sdk"

if (-not (Test-Path $sdkPath)) {
    Write-Host "  ✗ Android SDK 目录不存在: $sdkPath" -ForegroundColor Red
    Write-Host ""
    Write-Host "  解决方案:" -ForegroundColor Yellow
    Write-Host "  1. 打开 Android Studio" -ForegroundColor White
    Write-Host "  2. 选择 File > Settings > Appearance & Behavior > System Settings > Android SDK" -ForegroundColor White
    Write-Host "  3. 查看 'Android SDK Location' 路径" -ForegroundColor White
    Write-Host "  4. 如果路径不同，请手动设置 ANDROID_HOME 环境变量" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "  ✓ Android SDK 路径: $sdkPath" -ForegroundColor Green

# 检查 emulator 目录
Write-Host "[2/4] 检查 Emulator 目录..." -ForegroundColor Yellow
$emulatorPath = Join-Path $sdkPath "emulator"
if (Test-Path $emulatorPath) {
    Write-Host "  ✓ emulator 目录已存在" -ForegroundColor Green
} else {
    Write-Host "  ✗ emulator 目录不存在" -ForegroundColor Red
    Write-Host ""
    Write-Host "  正在尝试修复..." -ForegroundColor Yellow
    
    # 方法 1: 通过 Android Studio SDK Manager 安装
    Write-Host ""
    Write-Host "  方法 1: 通过 Android Studio 安装（推荐）" -ForegroundColor Cyan
    Write-Host "  1. 打开 Android Studio" -ForegroundColor White
    Write-Host "  2. 选择 File > Settings > Appearance & Behavior > System Settings > Android SDK" -ForegroundColor White
    Write-Host "  3. 切换到 'SDK Tools' 标签页" -ForegroundColor White
    Write-Host "  4. 勾选 'Android Emulator'" -ForegroundColor White
    Write-Host "  5. 点击 'Apply' 安装" -ForegroundColor White
    Write-Host ""
    
    # 方法 2: 使用 sdkmanager 命令行工具
    $sdkmanagerPath = Join-Path $sdkPath "cmdline-tools\latest\bin\sdkmanager.bat"
    if (-not (Test-Path $sdkmanagerPath)) {
        $sdkmanagerPath = Join-Path $sdkPath "tools\bin\sdkmanager.bat"
    }
    
    if (Test-Path $sdkmanagerPath) {
        Write-Host "  方法 2: 使用命令行安装" -ForegroundColor Cyan
        Write-Host "  正在使用 sdkmanager 安装 Android Emulator..." -ForegroundColor Yellow
        
        $install = Read-Host "是否现在安装 Android Emulator? (y/n)"
        if ($install -eq "y" -or $install -eq "Y") {
            try {
                Set-Location $sdkPath
                & $sdkmanagerPath "emulator" --sdk_root=$sdkPath
                Write-Host "  ✓ 安装命令已执行" -ForegroundColor Green
                Write-Host "  请等待安装完成..." -ForegroundColor Yellow
            } catch {
                Write-Host "  ✗ 安装失败" -ForegroundColor Red
                Write-Host "  请使用方法 1 通过 Android Studio 安装" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "  ⚠ sdkmanager 工具未找到" -ForegroundColor Yellow
        Write-Host "  请使用方法 1 通过 Android Studio 安装" -ForegroundColor Yellow
    }
}

# 检查 platform-tools
Write-Host "[3/4] 检查 Platform-Tools..." -ForegroundColor Yellow
$platformToolsPath = Join-Path $sdkPath "platform-tools"
if (Test-Path $platformToolsPath) {
    Write-Host "  ✓ platform-tools 已存在" -ForegroundColor Green
} else {
    Write-Host "  ✗ platform-tools 不存在" -ForegroundColor Red
    Write-Host "  请在 Android Studio SDK Manager 中安装 'Android SDK Platform-Tools'" -ForegroundColor Yellow
}

# 配置环境变量
Write-Host "[4/4] 配置环境变量..." -ForegroundColor Yellow
if (-not $env:ANDROID_HOME) {
    Write-Host "  设置 ANDROID_HOME..." -ForegroundColor Yellow
    [System.Environment]::SetEnvironmentVariable('ANDROID_HOME', $sdkPath, 'User')
    $env:ANDROID_HOME = $sdkPath
    Write-Host "  ✓ ANDROID_HOME 已设置: $sdkPath" -ForegroundColor Green
} else {
    Write-Host "  ✓ ANDROID_HOME 已设置: $env:ANDROID_HOME" -ForegroundColor Green
}

# 配置 PATH
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
$pathUpdated = $false

$pathsToAdd = @(
    (Join-Path $sdkPath "platform-tools"),
    (Join-Path $sdkPath "emulator"),
    (Join-Path $sdkPath "tools"),
    (Join-Path $sdkPath "tools\bin")
)

foreach ($pathToAdd in $pathsToAdd) {
    if (Test-Path $pathToAdd) {
        if ($currentPath -notlike "*$pathToAdd*") {
            $currentPath = "$currentPath;$pathToAdd"
            $pathUpdated = $true
            Write-Host "  ✓ 添加路径到 PATH: $pathToAdd" -ForegroundColor Green
        }
    }
}

if ($pathUpdated) {
    [Environment]::SetEnvironmentVariable("Path", $currentPath, "User")
    Write-Host "  ✓ PATH 已更新" -ForegroundColor Green
} else {
    Write-Host "  ✓ PATH 已配置" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  修复完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "下一步操作:" -ForegroundColor Yellow
Write-Host "1. 如果 emulator 目录仍不存在，请通过 Android Studio SDK Manager 安装" -ForegroundColor White
Write-Host "2. 重启 Android Studio" -ForegroundColor White
Write-Host "3. 重新打开终端窗口以使环境变量生效" -ForegroundColor White
Write-Host "4. Run 'adb devices' to verify installation" -ForegroundColor White
Write-Host ""

