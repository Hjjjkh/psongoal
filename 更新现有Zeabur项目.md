# 更新现有 Zeabur 项目配置

## 📋 概述

如果你已经有一个在 Zeabur 上部署的项目，现在代码结构变成了 Monorepo，需要更新项目配置。

---

## 🔄 更新步骤

### 1. 进入 Zeabur Dashboard

1. 登录 [Zeabur Dashboard](https://zeabur.com)
2. 找到你现有的项目
3. 进入项目设置

### 2. 更新 Root Directory（最重要！）

**这是最关键的一步！**

1. 进入 **Settings** > **General**
2. 找到 **Root Directory** 设置
3. **修改为**：`packages/web`
4. 保存设置

**⚠️ 重要**：
- 之前可能是空（根目录）或 `./`
- 现在必须设置为 `packages/web`
- 如果不设置，Zeabur 无法找到 Next.js 项目，构建会失败

### 3. 检查环境变量

1. 进入 **Settings** > **Environment Variables**
2. 确认以下环境变量已配置：
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```
3. 如果缺失，添加它们

### 4. 检查 pnpm 配置

由于项目现在使用 pnpm workspace，Zeabur 需要知道使用 pnpm：

**方法 1：自动检测（推荐）**
- 项目根目录的 `package.json` 中已有 `"packageManager": "pnpm@8.15.9"`
- Zeabur 会自动检测并使用 pnpm

**方法 2：手动配置（如果自动检测失败）**
- 在环境变量中添加：`NPM_CONFIG_PACKAGE_MANAGER=pnpm`

### 5. 重新部署

更新配置后，需要重新部署：

1. 进入 **Deployments** 页面
2. 点击 **Redeploy** 按钮
3. 等待构建完成
4. 检查构建日志，确认成功

---

## 🔍 验证更新

### 检查构建日志

在 **Deployments** > **最新部署** 中查看：

- ✅ 安装依赖成功（使用 pnpm）
- ✅ 构建项目成功（在 `packages/web` 目录）
- ✅ 启动服务成功

### 检查应用运行

1. 访问 Zeabur 提供的 URL
2. 确认应用正常加载
3. 测试主要功能：
   - ✅ 登录/注册
   - ✅ 创建目标
   - ✅ 完成行动
   - ✅ 查看复盘

---

## 🐛 常见问题

### 问题 1: 构建失败 - 找不到 package.json

**原因**: Root Directory 未更新或设置错误

**解决**:
1. 确认 Root Directory 设置为 `packages/web`
2. 保存设置
3. 重新部署

### 问题 2: 构建失败 - 找不到依赖

**原因**: pnpm 未正确配置

**解决**:
1. 确认 `package.json` 中有 `packageManager` 字段
2. 或在环境变量中添加 `NPM_CONFIG_PACKAGE_MANAGER=pnpm`
3. 重新部署

### 问题 3: 构建成功但应用无法访问

**原因**: 可能是缓存问题

**解决**:
1. 清除构建缓存（如果有选项）
2. 重新部署
3. 检查应用日志

### 问题 4: 环境变量丢失

**原因**: 更新配置时可能丢失

**解决**:
1. 检查环境变量是否还在
2. 如果丢失，重新添加
3. 重新部署

---

## 📝 更新检查清单

更新前确认：

- [ ] 代码已推送到 GitHub（✅ 已完成）
- [ ] Root Directory 已更新为 `packages/web`（必须！）
- [ ] 环境变量已配置（`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`）
- [ ] pnpm 已配置（自动或手动）
- [ ] 已重新部署
- [ ] 构建成功
- [ ] 应用正常运行
- [ ] 功能测试通过

---

## 🔄 两种方案

### 方案 1: 更新现有项目（推荐）

**优点**：
- ✅ 保留现有的 URL 和配置
- ✅ 不需要重新配置域名
- ✅ 历史记录保留

**步骤**：
1. 更新 Root Directory 为 `packages/web`
2. 检查环境变量
3. 重新部署

### 方案 2: 创建新项目

**优点**：
- ✅ 干净的开始
- ✅ 不影响现有项目

**步骤**：
1. 创建新项目
2. 连接同一个 GitHub 仓库
3. 设置 Root Directory 为 `packages/web`
4. 配置环境变量
5. 部署

**注意**：如果创建新项目，需要：
- 更新域名配置（如果有自定义域名）
- 通知用户新的 URL（如果有用户）

---

## 💡 建议

**推荐使用方案 1（更新现有项目）**，因为：
- 更简单，不需要重新配置
- 保留现有的 URL
- 不影响用户访问

只需要更新 Root Directory 并重新部署即可。

---

## 📚 相关文档

- [Zeabur 快速部署指南](./ZEABUR_快速部署指南.md)
- [Zeabur 部署配置](./ZEABUR_DEPLOYMENT_CONFIG.md)

---

**最后更新**: 2024-12-20

