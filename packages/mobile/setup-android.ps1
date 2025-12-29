# Android 开发环境自动配置脚本
# 适用于 Windows PowerShell

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PsonGoal 移动端 Android 环境配置" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Node.js
Write-Host "[1/6] 检查 Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Node.js $nodeVersion 已安装" -ForegroundColor Green
} else {
    Write-Host "  ✗ Node.js 未安装，请先安装 Node.js" -ForegroundColor Red
    exit 1
}

# 检查 pnpm
Write-Host "[2/6] 检查 pnpm..." -ForegroundColor Yellow
$pnpmVersion = pnpm --version
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ pnpm $pnpmVersion 已安装" -ForegroundColor Green
} else {
    Write-Host "  ✗ pnpm 未安装，正在安装..." -ForegroundColor Yellow
    npm install -g pnpm
}

# 检查 Java
Write-Host "[3/6] 检查 Java..." -ForegroundColor Yellow
$javaVersion = java -version 2>&1 | Select-String "version"
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Java 已安装: $javaVersion" -ForegroundColor Green
} else {
    Write-Host "  ✗ Java 未安装，请安装 JDK 17 或更高版本" -ForegroundColor Red
    Write-Host "  下载地址: https://adoptium.net/" -ForegroundColor Yellow
}

# 检查 Android SDK
Write-Host "[4/6] 检查 Android SDK..." -ForegroundColor Yellow
$androidSdkPath = "$env:LOCALAPPDATA\Android\Sdk"
$androidHome = $env:ANDROID_HOME

if ($androidHome) {
    $sdkPath = $androidHome
} elseif (Test-Path $androidSdkPath) {
    $sdkPath = $androidSdkPath
} else {
    $sdkPath = $null
}

if ($sdkPath -and (Test-Path $sdkPath)) {
    Write-Host "  ✓ Android SDK 已找到: $sdkPath" -ForegroundColor Green
    
    # 检查环境变量
    if (-not $env:ANDROID_HOME) {
        Write-Host "  ⚠ 设置 ANDROID_HOME 环境变量..." -ForegroundColor Yellow
        [System.Environment]::SetEnvironmentVariable('ANDROID_HOME', $sdkPath, 'User')
        $env:ANDROID_HOME = $sdkPath
        Write-Host "  ✓ ANDROID_HOME 已设置" -ForegroundColor Green
    }
    
    # 检查 PATH
    $platformTools = Join-Path $sdkPath "platform-tools"
    if (Test-Path $platformTools) {
        $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
        if ($currentPath -notlike "*$platformTools*") {
            Write-Host "  ⚠ 添加 platform-tools 到 PATH..." -ForegroundColor Yellow
            $newPath = "$currentPath;$platformTools"
            [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
            Write-Host "  ✓ PATH 已更新" -ForegroundColor Green
        }
    }
} else {
    Write-Host "  ✗ Android SDK 未找到" -ForegroundColor Red
    Write-Host ""
    Write-Host "  请按以下步骤安装 Android Studio:" -ForegroundColor Yellow
    Write-Host "  1. 下载 Android Studio: https://developer.android.com/studio" -ForegroundColor White
    Write-Host "  2. 安装 Android Studio" -ForegroundColor White
    Write-Host "  3. 打开 Android Studio，选择 'More Actions' > 'SDK Manager'" -ForegroundColor White
    Write-Host "  4. 安装 Android SDK Platform (API 33+)" -ForegroundColor White
    Write-Host "  5. 安装 Android SDK Platform-Tools" -ForegroundColor White
    Write-Host "  6. 重新运行此脚本" -ForegroundColor White
    Write-Host ""
    exit 1
}

# 检查 Android 项目目录
Write-Host "[5/6] 检查 Android 项目目录..." -ForegroundColor Yellow
$androidDir = Join-Path $PSScriptRoot "android"
if (Test-Path $androidDir) {
    Write-Host "  ✓ android 目录已存在" -ForegroundColor Green
} else {
    Write-Host "  ✗ android 目录不存在，需要初始化..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  正在尝试初始化 Android 项目..." -ForegroundColor Yellow
    
    # 尝试使用 React Native CLI 初始化
    $tempDir = Join-Path $PSScriptRoot "temp_android_init"
    if (Test-Path $tempDir) {
        Remove-Item -Recurse -Force $tempDir
    }
    
    Write-Host "  方法 1: 使用 React Native CLI..." -ForegroundColor Cyan
    # 注意：这可能需要网络连接和较长时间
    Write-Host "  提示: 如果此方法失败，请手动创建 android 目录" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  手动创建步骤:" -ForegroundColor Yellow
    Write-Host "  1. 创建一个新的 React Native 项目作为模板" -ForegroundColor White
    Write-Host "  2. 复制 android 目录到当前项目" -ForegroundColor White
    Write-Host "  3. 修改包名和配置" -ForegroundColor White
}

# 检查依赖
Write-Host "[6/6] 检查项目依赖..." -ForegroundColor Yellow
if (Test-Path (Join-Path $PSScriptRoot "node_modules")) {
    Write-Host "  ✓ 依赖已安装" -ForegroundColor Green
} else {
    Write-Host "  ⚠ 依赖未安装，正在安装..." -ForegroundColor Yellow
    pnpm install
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  配置完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "下一步操作:" -ForegroundColor Yellow
Write-Host "1. 如果 android 目录不存在，请手动创建或使用模板" -ForegroundColor White
Write-Host "2. 启动 Android 模拟器或连接真实设备" -ForegroundColor White
Write-Host "3. 运行: pnpm android" -ForegroundColor White
Write-Host ""

