# GitHub 上传指南

## 📋 概述

本文档说明如何将 Monorepo 结构的项目上传到 GitHub，准备 Zeabur 部署。

---

## 🚀 快速步骤

### 1. 检查 Git 状态

```bash
git status
```

### 2. 添加所有更改

```bash
# 添加所有文件（包括新文件和修改的文件）
git add .

# 或者只添加特定文件
git add packages/
git add package.json
git add pnpm-workspace.yaml
git add .npmrc
```

### 3. 提交更改

```bash
git commit -m "feat: 迁移到 Monorepo 结构，准备多平台开发

- 创建 Monorepo 目录结构
- 迁移网页版代码到 packages/web
- 配置 pnpm workspace
- 添加 Zeabur 部署配置
- 优化默认行动数量（7→3）
- 优化页面刷新机制"
```

### 4. 推送到 GitHub

```bash
# 如果已有远程仓库
git push origin main

# 或者推送到 master 分支
git push origin master

# 如果是新仓库，需要先添加远程仓库
git remote add origin https://github.com/你的用户名/psongoal.git
git push -u origin main
```

---

## 📝 详细步骤

### 步骤 1: 检查当前状态

```bash
# 查看当前分支
git branch

# 查看未提交的更改
git status

# 查看更改的文件列表
git status --short
```

### 步骤 2: 添加文件到暂存区

```bash
# 添加所有更改
git add .

# 或者选择性添加
git add packages/
git add package.json
git add pnpm-workspace.yaml
git add .npmrc
git add *.md
```

### 步骤 3: 提交更改

```bash
# 提交并添加说明
git commit -m "你的提交信息"
```

**提交信息示例**：
```
feat: 迁移到 Monorepo 结构

- 创建 Monorepo 目录结构（packages/web, packages/core, etc.）
- 迁移网页版代码到 packages/web
- 配置 pnpm workspace
- 添加 Zeabur 部署配置（.npmrc, packageManager）
- 优化默认行动数量（7→3）
- 优化页面刷新机制（revalidate: 0, router.refresh()）
```

### 步骤 4: 推送到 GitHub

#### 如果已有远程仓库

```bash
# 查看远程仓库
git remote -v

# 推送到 main 分支
git push origin main

# 或者推送到 master 分支
git push origin master
```

#### 如果是新仓库

1. **在 GitHub 上创建仓库**：
   - 登录 GitHub
   - 点击 **New repository**
   - 仓库名：`psongoal`
   - 选择 **Public** 或 **Private**
   - **不要**初始化 README、.gitignore 或 license（因为本地已有）

2. **添加远程仓库**：
   ```bash
   git remote add origin https://github.com/你的用户名/psongoal.git
   ```

3. **推送到 GitHub**：
   ```bash
   git push -u origin main
   ```

---

## ⚠️ 注意事项

### 1. 不要提交敏感信息

确保以下文件在 `.gitignore` 中：
- `.env.local`
- `.env`
- `node_modules/`
- `.next/`

### 2. 检查 .gitignore

确认 `.gitignore` 包含：
```
# local env files
.env*.local
.env

# dependencies
node_modules/

# next.js
.next/
out/
```

### 3. 大文件处理

如果文件太大，考虑使用 Git LFS：
```bash
git lfs install
git lfs track "*.large-file"
```

---

## 🔍 验证上传

### 1. 检查 GitHub 仓库

1. 访问你的 GitHub 仓库
2. 确认以下文件/目录存在：
   - ✅ `packages/web/` 目录
   - ✅ `package.json`（根目录）
   - ✅ `pnpm-workspace.yaml`
   - ✅ `.npmrc`

### 2. 检查文件结构

确认 Monorepo 结构正确：
```
psongoal/
├── packages/
│   └── web/
│       ├── app/
│       ├── components/
│       ├── lib/
│       └── package.json
├── package.json
├── pnpm-workspace.yaml
└── .npmrc
```

---

## 🐛 常见问题

### 问题 1: 推送被拒绝

**错误**: `! [rejected] main -> main (non-fast-forward)`

**解决**:
```bash
# 先拉取远程更改
git pull origin main --rebase

# 然后推送
git push origin main
```

### 问题 2: 文件太大

**错误**: 文件超过 100MB

**解决**:
1. 使用 Git LFS
2. 或从提交中移除大文件

### 问题 3: 忘记添加 .gitignore

**解决**:
```bash
# 从 Git 中移除已跟踪的文件
git rm --cached .env.local
git rm --cached -r node_modules/

# 添加到 .gitignore
echo ".env.local" >> .gitignore
echo "node_modules/" >> .gitignore

# 提交更改
git add .gitignore
git commit -m "chore: 更新 .gitignore"
```

---

## 📚 相关文档

- [Git 官方文档](https://git-scm.com/doc)
- [GitHub 文档](https://docs.github.com)
- [Zeabur 部署指南](./ZEABUR_快速部署指南.md)

---

**最后更新**: 2024-12-20

