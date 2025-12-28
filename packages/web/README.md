# PES Web Application

网页版个人目标执行系统。

## 开发

```bash
# 从根目录
pnpm dev:web

# 或从当前目录
pnpm dev
```

## 构建

```bash
pnpm build
```

## 环境变量

创建 `.env.local` 文件：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 部署

### Zeabur

1. 在 Zeabur Dashboard 连接 GitHub 仓库
2. 设置根目录为 `packages/web`
3. 配置环境变量
4. 自动部署

### Vercel

1. 在 Vercel 中导入项目
2. 设置根目录为 `packages/web`
3. 配置环境变量
4. 自动部署

