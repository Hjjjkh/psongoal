# Zeabur 配置检查清单

## ✅ 已正确配置

根据你提供的配置界面，以下配置已经正确：

- ✅ **根目录**: `/packages/web` - 正确！
- ✅ **服务名称**: `psongoal` - 正确！

---

## 🔍 需要检查的配置

### 1. 环境变量（必须检查）

进入 **Environment Variables** 页面，确认以下环境变量已配置：

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**如果没有配置，需要添加！**

### 2. 启动命令（可选）

**当前状态**: 留空（使用默认）

**默认命令**: Next.js 会自动使用 `npm start` 或 `pnpm start`

**建议**: 
- 如果使用 pnpm（推荐），可以设置为：`pnpm start`
- 或者留空，让 Zeabur 自动检测

### 3. Dockerfile（可选）

**当前状态**: 已设置

```dockerfile
FROM node:18-alpine
WORKDIR /app
```

**建议**: 
- 这个配置看起来不完整，可能需要更新
- 或者删除 Dockerfile，让 Zeabur 自动检测 Next.js 项目

### 4. 监控路径（可选）

**当前状态**: `*`（所有变动都会触发部署）

**建议**: 
- 保持 `*` 即可
- 或者设置为 `/packages/web` 只监控网页版代码

### 5. 资源限制（可选）

**当前状态**: 
- CPU: 1000m
- 内存: 1024Mi

**建议**: 
- 对于 Next.js 项目，这个配置通常足够
- 如果遇到性能问题，可以适当增加

---

## 🚀 下一步操作

### 1. 检查环境变量

1. 进入 **Environment Variables** 页面
2. 确认以下变量已配置：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. 如果缺失，添加它们

### 2. 检查 Dockerfile（可选）

**选项 A：删除 Dockerfile，使用自动检测（推荐）**

1. 在 Dockerfile 配置中
2. 点击 **从 GitHub 加载** 或删除内容
3. 让 Zeabur 自动检测 Next.js 项目

**选项 B：更新 Dockerfile（如果需要自定义）**

```dockerfile
FROM node:18-alpine

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm@8.15.9

# 复制 package 文件
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/web/package.json ./packages/web/

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY packages/web ./packages/web

# 构建
WORKDIR /app/packages/web
RUN pnpm build

# 启动
CMD ["pnpm", "start"]
```

### 3. 重新部署

1. 进入 **Deployments** 页面
2. 点击 **Redeploy** 按钮
3. 等待构建完成
4. 检查构建日志

---

## 🔍 验证部署

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

## ⚠️ 常见问题

### 问题 1: 构建失败 - 找不到 package.json

**原因**: 虽然根目录已设置，但可能 Dockerfile 配置有问题

**解决**:
1. 删除或更新 Dockerfile
2. 让 Zeabur 自动检测 Next.js 项目
3. 重新部署

### 问题 2: 构建失败 - 找不到依赖

**原因**: pnpm 未正确配置

**解决**:
1. 确认 `package.json` 中有 `packageManager` 字段（✅ 已配置）
2. 或在环境变量中添加 `NPM_CONFIG_PACKAGE_MANAGER=pnpm`
3. 重新部署

### 问题 3: 环境变量未生效

**原因**: 环境变量未配置或配置错误

**解决**:
1. 检查环境变量是否配置
2. 确认变量名以 `NEXT_PUBLIC_` 开头
3. 重启部署

---

## 📝 配置检查清单

- [x] 根目录设置为 `/packages/web` ✅
- [ ] 环境变量已配置（`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`）
- [ ] Dockerfile 配置正确（或删除使用自动检测）
- [ ] 启动命令配置（可选，建议留空）
- [ ] 已重新部署
- [ ] 构建成功
- [ ] 应用正常运行

---

## 💡 建议

### 推荐配置

1. **根目录**: `/packages/web` ✅（已设置）
2. **Dockerfile**: 删除或使用自动检测（推荐）
3. **启动命令**: 留空（使用默认）
4. **环境变量**: 必须配置
5. **监控路径**: `*` 或 `/packages/web`

### 最简单的配置

1. 保持根目录为 `/packages/web` ✅
2. 删除 Dockerfile，使用自动检测
3. 配置环境变量
4. 重新部署

---

**最后更新**: 2024-12-20

