# 移动端应用运行指南

## 📱 环境准备

### 必需环境

1. **Node.js** (>= 18.0.0)
   ```bash
   node --version  # 应该显示 v18.x.x 或更高
   ```

2. **pnpm** (>= 8.0.0)
   ```bash
   pnpm --version  # 应该显示 8.x.x 或更高
   ```

3. **Java Development Kit (JDK)** (Android 开发需要)
   - 推荐 JDK 17
   - 下载地址：https://adoptium.net/

4. **Android Studio** (Android 开发)
   - 下载地址：https://developer.android.com/studio
   - 安装 Android SDK (API Level 33+)
   - 配置 ANDROID_HOME 环境变量

5. **Xcode** (iOS 开发，仅 macOS)
   - 从 App Store 安装
   - 需要 macOS 系统

### 环境变量配置

#### Windows

```powershell
# 设置 ANDROID_HOME
[System.Environment]::SetEnvironmentVariable('ANDROID_HOME', 'C:\Users\YourName\AppData\Local\Android\Sdk', 'User')
[System.Environment]::SetEnvironmentVariable('Path', $env:Path + ';%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\tools', 'User')
```

#### macOS / Linux

```bash
# 添加到 ~/.zshrc 或 ~/.bashrc
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
```

## 🚀 快速开始

### 1. 安装依赖

在项目根目录执行：

```bash
# 安装所有依赖（包括 monorepo 依赖）
pnpm install
```

### 2. 启动 Metro Bundler

在项目根目录执行：

```bash
# 方式 1：使用根目录脚本
pnpm dev:mobile

# 方式 2：直接进入 mobile 目录
cd packages/mobile
pnpm start

# 方式 3：使用 pnpm filter
pnpm --filter @psongoal/mobile start
```

Metro Bundler 会在 `http://localhost:8081` 启动。

## 📱 运行 Android 应用

### 前置条件

1. **启动 Android 模拟器** 或连接真实设备
   ```bash
   # 列出可用设备
   adb devices
   
   # 启动模拟器（如果已创建）
   emulator -avd <模拟器名称>
   ```

2. **检查设备连接**
   ```bash
   adb devices
   # 应该显示连接的设备
   ```

### 运行应用

在项目根目录执行：

```bash
# 方式 1：使用根目录脚本（需要先添加）
pnpm --filter @psongoal/mobile android

# 方式 2：进入 mobile 目录
cd packages/mobile
pnpm android

# 方式 3：使用 React Native CLI
cd packages/mobile
npx react-native run-android
```

### Android 常见问题

#### 问题 1: `ANDROID_HOME` 未设置
```bash
# Windows PowerShell
$env:ANDROID_HOME = "C:\Users\YourName\AppData\Local\Android\Sdk"

# macOS/Linux
export ANDROID_HOME=$HOME/Library/Android/sdk
```

#### 问题 2: Gradle 构建失败
```bash
# 清理构建缓存
cd packages/mobile/android
./gradlew clean
cd ../..
```

#### 问题 3: 端口被占用
```bash
# 查找占用 8081 端口的进程
# Windows
netstat -ano | findstr :8081

# macOS/Linux
lsof -i :8081

# 杀死进程后重试
```

#### 问题 4: 无法连接到 Metro Bundler
```bash
# 在 Android 设备上摇一摇，选择 "Settings"
# 设置 "Debug server host & port for device" 为：
# Windows: 10.0.2.2:8081
# macOS/Linux: localhost:8081
```

## 🍎 运行 iOS 应用（仅 macOS）

### 前置条件

1. **安装 CocoaPods**
   ```bash
   sudo gem install cocoapods
   ```

2. **安装 iOS 依赖**
   ```bash
   cd packages/mobile/ios
   pod install
   cd ../..
   ```

### 运行应用

```bash
# 方式 1：使用 pnpm
cd packages/mobile
pnpm ios

# 方式 2：使用 React Native CLI
cd packages/mobile
npx react-native run-ios

# 指定模拟器
npx react-native run-ios --simulator="iPhone 15 Pro"
```

### iOS 常见问题

#### 问题 1: Pod 安装失败
```bash
# 清理并重新安装
cd packages/mobile/ios
rm -rf Pods Podfile.lock
pod install
```

#### 问题 2: Xcode 签名问题
- 在 Xcode 中打开 `packages/mobile/ios/psongoal.xcworkspace`
- 选择项目 -> Signing & Capabilities
- 选择你的开发团队

## 🧪 测试应用

### 运行单元测试

```bash
cd packages/mobile
pnpm test
```

### 运行 Lint 检查

```bash
cd packages/mobile
pnpm lint
```

## 🔧 开发技巧

### 1. 热重载

React Native 支持热重载，修改代码后会自动刷新：
- **Android**: 按 `R` 键两次，或摇一摇设备选择 "Reload"
- **iOS**: 按 `Cmd + R`，或摇一摇设备选择 "Reload"

### 2. 开发者菜单

- **Android**: 摇一摇设备，或按 `Cmd + M` (macOS) / `Ctrl + M` (Windows)
- **iOS**: 摇一摇设备，或按 `Cmd + D` (macOS)

### 3. 调试

- **React Native Debugger**: 下载并安装 React Native Debugger
- **Chrome DevTools**: 在开发者菜单中选择 "Debug"
- **Flipper**: 安装 Flipper 进行高级调试

### 4. 查看日志

```bash
# Android
adb logcat *:S ReactNative:V ReactNativeJS:V

# iOS
# 在 Xcode 控制台查看
```

## 📝 配置 API 地址

移动端应用需要配置后端 API 地址。编辑 `packages/mobile/src/services/api.ts`：

```typescript
const API_BASE_URL = __DEV__
  ? 'http://localhost:3000/api'  // 开发环境
  : 'https://psongoal.zeabur.app/api';  // 生产环境
```

### 连接本地后端

如果后端运行在本地，需要配置：

**Android:**
- 使用 `10.0.2.2` 代替 `localhost`
- 例如：`http://10.0.2.2:3000/api`

**iOS:**
- 使用你的 Mac 的 IP 地址
- 例如：`http://192.168.1.100:3000/api`

## 🐛 常见错误解决

### 错误 1: "Unable to resolve module"

```bash
# 清理缓存并重新安装
cd packages/mobile
rm -rf node_modules
pnpm install
# 清理 Metro 缓存
pnpm start --reset-cache
```

### 错误 2: "Metro bundler failed to start"

```bash
# 检查端口占用
lsof -i :8081  # macOS/Linux
netstat -ano | findstr :8081  # Windows

# 使用其他端口
pnpm start --port 8082
```

### 错误 3: "Gradle build failed"

```bash
cd packages/mobile/android
./gradlew clean
./gradlew --stop
cd ../..
```

### 错误 4: "Vector Icons not showing"

需要配置图标库：

**Android:**
编辑 `android/app/build.gradle`，添加：
```gradle
apply from: "../../node_modules/react-native-vector-icons/fonts.gradle"
```

**iOS:**
编辑 `ios/psongoal/Info.plist`，添加：
```xml
<key>UIAppFonts</key>
<array>
  <string>AntDesign.ttf</string>
  <string>Entypo.ttf</string>
  <string>EvilIcons.ttf</string>
  <string>Feather.ttf</string>
  <string>FontAwesome.ttf</string>
  <string>Foundation.ttf</string>
  <string>Ionicons.ttf</string>
  <string>MaterialIcons.ttf</string>
  <string>MaterialCommunityIcons.ttf</string>
  <string>SimpleLineIcons.ttf</string>
  <string>Octicons.ttf</string>
  <string>Zocial.ttf</string>
  <string>FontAwesome5_Brands.ttf</string>
  <string>FontAwesome5_Regular.ttf</string>
  <string>FontAwesome5_Solid.ttf</string>
</array>
```

## 📚 更多资源

- [React Native 官方文档](https://reactnative.dev/docs/getting-started)
- [React Navigation 文档](https://reactnavigation.org/)
- [React Native Vector Icons](https://github.com/oblador/react-native-vector-icons)

## ✅ 检查清单

运行前请确认：

- [ ] Node.js >= 18.0.0 已安装
- [ ] pnpm >= 8.0.0 已安装
- [ ] 已运行 `pnpm install`
- [ ] Android Studio 已安装（Android 开发）
- [ ] Android SDK 已配置
- [ ] ANDROID_HOME 环境变量已设置（Android 开发）
- [ ] Xcode 已安装（iOS 开发，仅 macOS）
- [ ] CocoaPods 已安装（iOS 开发，仅 macOS）
- [ ] 已运行 `pod install`（iOS 开发，仅 macOS）
- [ ] Android 模拟器已启动或设备已连接
- [ ] Metro Bundler 已启动

## 🎯 快速命令参考

```bash
# 安装依赖
pnpm install

# 启动 Metro
pnpm dev:mobile
# 或
cd packages/mobile && pnpm start

# 运行 Android
cd packages/mobile && pnpm android

# 运行 iOS (macOS only)
cd packages/mobile && pnpm ios

# 运行测试
cd packages/mobile && pnpm test

# 运行 Lint
cd packages/mobile && pnpm lint
```

