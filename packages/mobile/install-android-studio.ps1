# Android Studio 自动安装和配置脚本
# 适用于 Windows PowerShell

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Android Studio 自动安装配置" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查是否已安装
Write-Host "[1/5] 检查 Android Studio..." -ForegroundColor Yellow
$androidStudioPaths = @(
    "$env:LOCALAPPDATA\Programs\Android\Android Studio",
    "$env:ProgramFiles\Android\Android Studio",
    "$env:ProgramFiles(x86)\Android\Android Studio"
)

$androidStudioInstalled = $false
foreach ($path in $androidStudioPaths) {
    if (Test-Path $path) {
        Write-Host "  ✓ Android Studio 已安装在: $path" -ForegroundColor Green
        $androidStudioInstalled = $true
        break
    }
}

if (-not $androidStudioInstalled) {
    Write-Host "  ✗ Android Studio 未安装" -ForegroundColor Red
    Write-Host ""
    Write-Host "  正在准备下载 Android Studio..." -ForegroundColor Yellow
    
    # 创建临时目录
    $tempDir = Join-Path $env:TEMP "android-studio-installer"
    if (-not (Test-Path $tempDir)) {
        New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
    }
    
    $downloadUrl = "https://redirector.gvt1.com/edgedl/android/studio/install/2023.3.1.19/android-studio-2023.3.1.19-windows.exe"
    $installerPath = Join-Path $tempDir "android-studio-installer.exe"
    
    Write-Host "  下载地址: $downloadUrl" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  注意: 由于 Android Studio 安装程序较大（~1GB），" -ForegroundColor Yellow
    Write-Host "  建议手动下载安装以获得更好的体验。" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  手动安装步骤:" -ForegroundColor Cyan
    Write-Host "  1. 访问: https://developer.android.com/studio" -ForegroundColor White
    Write-Host "  2. 下载 Windows 版本" -ForegroundColor White
    Write-Host "  3. 运行安装程序，使用默认设置" -ForegroundColor White
    Write-Host "  4. 安装完成后重新运行此脚本" -ForegroundColor White
    Write-Host ""
    
    $download = Read-Host "是否要自动下载安装程序? (y/n)"
    if ($download -eq "y" -or $download -eq "Y") {
        Write-Host "  正在下载 Android Studio 安装程序..." -ForegroundColor Yellow
        try {
            Invoke-WebRequest -Uri $downloadUrl -OutFile $installerPath -UseBasicParsing
            Write-Host "  ✓ 下载完成: $installerPath" -ForegroundColor Green
            Write-Host ""
            Write-Host "  安装程序已下载，请运行以下命令安装:" -ForegroundColor Yellow
            Write-Host "  Start-Process '$installerPath'" -ForegroundColor White
            Write-Host ""
            $runInstaller = Read-Host "是否现在运行安装程序? (y/n)"
            if ($runInstaller -eq "y" -or $runInstaller -eq "Y") {
                Start-Process $installerPath
                Write-Host "  安装程序已启动，请按照向导完成安装" -ForegroundColor Green
                Write-Host "  安装完成后，请重新运行此脚本进行配置" -ForegroundColor Yellow
                exit 0
            }
        } catch {
            Write-Host "  ✗ 下载失败: $_" -ForegroundColor Red
            Write-Host "  请手动下载并安装 Android Studio" -ForegroundColor Yellow
        }
    }
    
    exit 1
}

# 检查 Android SDK
Write-Host "[2/5] 检查 Android SDK..." -ForegroundColor Yellow
$sdkPath = "$env:LOCALAPPDATA\Android\Sdk"
if (Test-Path $sdkPath) {
    Write-Host "  ✓ Android SDK 已找到: $sdkPath" -ForegroundColor Green
} else {
    Write-Host "  ✗ Android SDK 未找到" -ForegroundColor Red
    Write-Host ""
    Write-Host "  请打开 Android Studio 并完成首次设置:" -ForegroundColor Yellow
    Write-Host "  1. 打开 Android Studio" -ForegroundColor White
    Write-Host "  2. 选择 'More Actions' > 'SDK Manager'" -ForegroundColor White
    Write-Host "  3. 安装 Android SDK Platform (API 33+)" -ForegroundColor White
    Write-Host "  4. 安装 Android SDK Platform-Tools" -ForegroundColor White
    Write-Host "  5. 重新运行此脚本" -ForegroundColor White
    Write-Host ""
    exit 1
}

# 配置环境变量
Write-Host "[3/5] 配置环境变量..." -ForegroundColor Yellow
if (-not $env:ANDROID_HOME) {
    Write-Host "  设置 ANDROID_HOME..." -ForegroundColor Yellow
    [System.Environment]::SetEnvironmentVariable('ANDROID_HOME', $sdkPath, 'User')
    $env:ANDROID_HOME = $sdkPath
    Write-Host "  ✓ ANDROID_HOME 已设置" -ForegroundColor Green
} else {
    Write-Host "  ✓ ANDROID_HOME 已设置: $env:ANDROID_HOME" -ForegroundColor Green
}

# 配置 PATH
$platformTools = Join-Path $sdkPath "platform-tools"
$tools = Join-Path $sdkPath "tools"
$toolsBin = Join-Path $sdkPath "tools\bin"

$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
$pathUpdated = $false

if (Test-Path $platformTools) {
    if ($currentPath -notlike "*$platformTools*") {
        $currentPath = "$currentPath;$platformTools"
        $pathUpdated = $true
    }
}

if (Test-Path $tools) {
    if ($currentPath -notlike "*$tools*") {
        $currentPath = "$currentPath;$tools"
        $pathUpdated = $true
    }
}

if (Test-Path $toolsBin) {
    if ($currentPath -notlike "*$toolsBin*") {
        $currentPath = "$currentPath;$toolsBin"
        $pathUpdated = $true
    }
}

if ($pathUpdated) {
    [Environment]::SetEnvironmentVariable("Path", $currentPath, "User")
    Write-Host "  ✓ PATH 已更新" -ForegroundColor Green
} else {
    Write-Host "  ✓ PATH 已配置" -ForegroundColor Green
}

# 检查 Android 项目目录
Write-Host "[4/5] 检查 Android 项目目录..." -ForegroundColor Yellow
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$androidDir = Join-Path $scriptDir "android"

if (Test-Path $androidDir) {
    Write-Host "  ✓ android 目录已存在" -ForegroundColor Green
} else {
    Write-Host "  ✗ android 目录不存在" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  正在尝试初始化 Android 项目..." -ForegroundColor Yellow
    
    # 尝试使用 React Native CLI 初始化
    $tempProjectDir = Join-Path $env:TEMP "rn-template-psongoal"
    if (Test-Path $tempProjectDir) {
        Remove-Item -Recurse -Force $tempProjectDir -ErrorAction SilentlyContinue
    }
    
    Write-Host "  方法: 创建临时 React Native 项目并复制 android 目录..." -ForegroundColor Cyan
    Write-Host "  这可能需要几分钟时间..." -ForegroundColor Yellow
    
    try {
        Set-Location $env:TEMP
        npx --yes react-native@0.72.6 init TempPsonGoal --version 0.72.6 --skip-install 2>&1 | Out-Null
        
        if (Test-Path (Join-Path $tempProjectDir "android")) {
            Copy-Item -Path (Join-Path $tempProjectDir "android") -Destination $androidDir -Recurse -Force
            Write-Host "  ✓ android 目录已创建" -ForegroundColor Green
            
            # 清理临时文件
            Remove-Item -Recurse -Force $tempProjectDir -ErrorAction SilentlyContinue
        } else {
            Write-Host "  ✗ 初始化失败" -ForegroundColor Red
            Write-Host "  请参考 INIT_ANDROID.md 手动创建 android 目录" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  ✗ 初始化失败: $_" -ForegroundColor Red
        Write-Host "  请参考 INIT_ANDROID.md 手动创建 android 目录" -ForegroundColor Yellow
    }
}

# 检查依赖
Write-Host "[5/5] 检查项目依赖..." -ForegroundColor Yellow
$nodeModulesPath = Join-Path $scriptDir "node_modules"
if (Test-Path $nodeModulesPath) {
    Write-Host "  ✓ 依赖已安装" -ForegroundColor Green
} else {
    Write-Host "  ⚠ 依赖未安装，正在安装..." -ForegroundColor Yellow
    Set-Location $scriptDir
    pnpm install
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  配置完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "下一步操作:" -ForegroundColor Yellow
Write-Host "1. 如果 android 目录已创建，需要修改包名（参考 INIT_ANDROID.md）" -ForegroundColor White
Write-Host "2. 启动 Android 模拟器或连接真实设备" -ForegroundColor White
Write-Host "3. 运行: pnpm android" -ForegroundColor White
Write-Host ""
Write-Host "注意: 环境变量更改后，请重新打开终端窗口" -ForegroundColor Yellow
Write-Host ""
