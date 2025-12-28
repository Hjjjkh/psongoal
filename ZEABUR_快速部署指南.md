# Zeabur 快速部署指南

## 🚀 快速开始

### 1. 连接 GitHub 仓库

1. 登录 [Zeabur Dashboard](https://zeabur.com)
2. 点击 **New Project**
3. 选择 **Import from GitHub**
4. 选择你的仓库 `psongoal`

### 2. 关键配置（必须！）

#### ⚠️ Root Directory（最重要）

在 Zeabur 项目设置中：

1. 进入 **Settings** > **General**
2. 找到 **Root Directory** 设置
3. **设置为**：`packages/web`

**这是最重要的配置！** 如果不设置，Zeabur 无法找到 Next.js 项目。

#### 📦 环境变量

在 **Settings** > **Environment Variables** 中添加：

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**获取 Supabase 配置**：
1. 登录 [Supabase Dashboard](https://app.supabase.com)
2. 选择你的项目
3. 进入 **Settings** > **API**
4. 复制 **Project URL** 和 **anon public** key

### 3. 自动配置（已设置）

以下配置已自动设置，无需手动配置：

- ✅ `package.json` 中的 `packageManager: "pnpm@8.15.9"` - Zeabur 会自动使用 pnpm
- ✅ `.npmrc` 文件 - 指定使用 pnpm
- ✅ `pnpm-workspace.yaml` - workspace 配置

### 4. 部署

1. 点击 **Deploy** 按钮
2. 等待构建完成（通常 2-5 分钟）
3. 查看构建日志，确认成功
4. 访问 Zeabur 提供的 URL

---

## ✅ 部署检查清单

部署前确认：

- [ ] GitHub 仓库已连接
- [ ] **Root Directory 设置为 `packages/web`**（最重要！）
- [ ] 环境变量已配置：
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] 代码已推送到 GitHub（如果首次部署）

---

## 🔍 验证部署

### 检查构建日志

在 Zeabur Dashboard > **Deployments** 中查看：

- ✅ 安装依赖成功
- ✅ 构建项目成功
- ✅ 启动服务成功

### 检查应用

1. 访问 Zeabur 提供的 URL
2. 测试功能：
   - ✅ 登录/注册
   - ✅ 创建目标
   - ✅ 完成行动
   - ✅ 查看复盘

---

## 🐛 常见问题

### 问题 1: 构建失败 - 找不到 package.json

**原因**: Root Directory 未设置或设置错误

**解决**:
1. 确认 Root Directory 设置为 `packages/web`
2. 重新部署

### 问题 2: 构建失败 - 找不到依赖

**原因**: pnpm 未正确配置

**解决**:
1. 确认 `package.json` 中有 `packageManager` 字段
2. 确认 `.npmrc` 文件存在
3. 重新部署

### 问题 3: 应用无法连接 Supabase

**原因**: 环境变量未配置或配置错误

**解决**:
1. 检查环境变量是否配置
2. 确认变量名以 `NEXT_PUBLIC_` 开头
3. 重启部署

---

## 📝 详细配置

如需更详细的配置说明，请参考：
- `ZEABUR_DEPLOYMENT_CONFIG.md` - 完整部署配置指南
- `环境配置说明.md` - 环境变量配置说明

---

**最后更新**: 2024-12-20

