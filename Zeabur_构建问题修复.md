# Zeabur 构建问题修复

## 问题

Zeabur 构建时使用 `yarn install` 而不是 `pnpm`，导致：
1. 包管理器不匹配
2. 网络错误（yarn registry 临时故障）

## 解决方案

### 方案 1: 在 Zeabur Dashboard 中配置（推荐）

1. 登录 [Zeabur Dashboard](https://zeabur.com)
2. 进入你的项目设置
3. 找到 **Build Settings** 或 **Build Command**
4. 设置：
   - **Install Command**: `pnpm install`
   - **Build Command**: `pnpm build`
   - **Package Manager**: 选择 `pnpm`

### 方案 2: 使用 .zeabur.json（已创建）

已在 `packages/web/.zeabur.json` 中配置使用 pnpm，Zeabur 应该会自动识别。

### 方案 3: 如果还是失败，重试构建

这个错误可能是 yarn registry 的临时网络问题：
1. 在 Zeabur Dashboard 中点击 **Redeploy**
2. 或者等待几分钟后自动重试

### 方案 4: 检查 Root Directory

确保 Zeabur 项目设置中的 **Root Directory** 设置为：
```
packages/web
```

## 验证

构建成功后，检查构建日志应该看到：
```
✓ Using pnpm
✓ Running pnpm install
✓ Running pnpm build
```

而不是：
```
✗ Using yarn
✗ Running yarn install
```

