# Zeabur 部署配置指南

## 📋 概述

本文档说明如何在 Monorepo 结构下配置 Zeabur 部署，确保网页版正常部署。

---

## 🏗️ 项目结构

```
psongoal/
├── packages/
│   └── web/              # 网页版（Zeabur 部署目标）
│       ├── package.json
│       ├── next.config.js
│       └── ...
├── package.json          # 根 package.json
└── pnpm-workspace.yaml   # pnpm workspace 配置
```

---

## 🚀 Zeabur 部署步骤

### 1. 连接 GitHub 仓库

1. 登录 [Zeabur Dashboard](https://zeabur.com)
2. 点击 **New Project**
3. 选择 **Import from GitHub**
4. 选择你的仓库 `psongoal`

### 2. 配置项目设置

#### 根目录设置（重要！）

在 Zeabur 项目设置中：

1. 进入 **Settings** > **General**
2. 找到 **Root Directory** 设置
3. 设置为：`packages/web`

**⚠️ 重要**: 必须设置为 `packages/web`，否则 Zeabur 无法找到 Next.js 项目。

#### 构建命令（可选）

Zeabur 会自动检测 Next.js 项目，但你可以手动设置：

1. 进入 **Settings** > **Build & Deploy**
2. **Build Command**: `cd packages/web && pnpm install && pnpm build`
3. **Start Command**: `cd packages/web && pnpm start`

**注意**: 如果使用 pnpm workspace，Zeabur 会自动处理，通常不需要手动设置。

### 3. 配置环境变量

在 Zeabur 项目设置中：

1. 进入 **Settings** > **Environment Variables**
2. 添加以下环境变量：

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

#### 获取 Supabase 配置

1. 登录 [Supabase Dashboard](https://app.supabase.com)
2. 选择你的项目
3. 进入 **Settings** > **API**
4. 复制：
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 4. 配置 Node.js 版本（可选）

1. 进入 **Settings** > **General**
2. 找到 **Node.js Version**
3. 设置为：`18.x` 或 `20.x`（推荐）

### 5. 配置 pnpm（重要！）

Zeabur 默认使用 npm，需要配置使用 pnpm：

1. 在项目根目录创建 `.npmrc` 文件（如果不存在）
2. 或在 Zeabur 环境变量中添加：
   - `NPM_CONFIG_PACKAGE_MANAGER=pnpm`

或者，在根 `package.json` 中添加：

```json
{
  "packageManager": "pnpm@8.0.0"
}
```

### 6. 部署

1. 点击 **Deploy** 按钮
2. 等待构建完成
3. 查看构建日志，确认没有错误
4. 访问 Zeabur 提供的 URL

---

## 🔍 验证部署

### 1. 检查构建日志

在 Zeabur Dashboard 中：

1. 进入 **Deployments**
2. 查看最新的部署日志
3. 确认以下步骤成功：
   - ✅ 安装依赖
   - ✅ 构建项目
   - ✅ 启动服务

### 2. 检查应用运行

1. 访问 Zeabur 提供的 URL
2. 确认应用正常加载
3. 测试主要功能：
   - ✅ 登录/注册
   - ✅ 创建目标
   - ✅ 完成行动
   - ✅ 查看复盘

### 3. 检查环境变量

如果应用无法连接 Supabase：

1. 检查环境变量是否配置
2. 检查环境变量值是否正确
3. 重启部署（在 Zeabur Dashboard 中点击 **Redeploy**）

---

## 🐛 常见问题

### 1. 构建失败：找不到 package.json

**问题**: Zeabur 无法找到 `package.json`

**解决**:
1. 确认 **Root Directory** 设置为 `packages/web`
2. 检查 `packages/web/package.json` 是否存在
3. 重新部署

### 2. 构建失败：找不到依赖

**问题**: 安装依赖失败

**解决**:
1. 确认使用 pnpm（配置 `NPM_CONFIG_PACKAGE_MANAGER=pnpm`）
2. 检查 `pnpm-workspace.yaml` 是否存在
3. 检查根 `package.json` 中的 `workspaces` 配置

### 3. 运行时错误：环境变量未定义

**问题**: `NEXT_PUBLIC_SUPABASE_URL` 未定义

**解决**:
1. 在 Zeabur 环境变量中添加配置
2. 确认变量名以 `NEXT_PUBLIC_` 开头
3. 重启部署

### 4. 构建成功但应用无法访问

**问题**: 构建成功但访问时出错

**解决**:
1. 检查构建日志，确认没有警告
2. 检查应用日志（Zeabur Dashboard > Logs）
3. 检查环境变量配置
4. 尝试重新部署

---

## 📝 部署检查清单

部署前确认：

- [ ] GitHub 仓库已连接
- [ ] Root Directory 设置为 `packages/web`
- [ ] 环境变量已配置（`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`）
- [ ] pnpm 已配置（`NPM_CONFIG_PACKAGE_MANAGER=pnpm` 或 `package.json` 中的 `packageManager`）
- [ ] Node.js 版本已设置（18.x 或 20.x）
- [ ] 构建成功
- [ ] 应用正常运行
- [ ] 功能测试通过

---

## 🔄 更新部署

### 自动部署

Zeabur 会在以下情况自动部署：

- ✅ 推送到 `main` 分支（默认）
- ✅ 创建新的 Pull Request（可选）

### 手动部署

1. 在 Zeabur Dashboard 中
2. 进入 **Deployments**
3. 点击 **Redeploy** 按钮

### 回滚部署

1. 在 Zeabur Dashboard 中
2. 进入 **Deployments**
3. 选择之前的部署
4. 点击 **Redeploy** 按钮

---

## 📚 相关文档

- [Zeabur 文档](https://zeabur.com/docs)
- [Next.js 部署文档](https://nextjs.org/docs/deployment)
- [环境配置说明.md](./环境配置说明.md)

---

**最后更新**: 2024-12-20

