# Zeabur 部署说明

## 前置准备

### 1. Supabase 配置
1. 在 [Supabase](https://supabase.com) 创建新项目
2. 进入 SQL Editor，执行 `supabase/schema.sql` 中的所有 SQL 语句
3. 在 Project Settings > API 中获取：
   - Project URL
   - anon/public key

### 2. GitHub 仓库
确保代码已推送到 GitHub 仓库

## Zeabur 部署步骤

### 步骤 1: 创建项目
1. 登录 [Zeabur](https://zeabur.com)
2. 点击 "New Project"
3. 选择 "Deploy from GitHub"
4. 授权并选择你的仓库

### 步骤 2: 配置环境变量
在项目设置中添加以下环境变量：

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 步骤 3: 配置构建设置
Zeabur 通常会自动检测 Next.js 项目，但请确认：

- **Framework Preset**: Next.js
- **Build Command**: `npm run build` (或自动检测)
- **Output Directory**: `.next` (或自动检测)
- **Install Command**: `npm install` (或自动检测)

### 步骤 4: 部署
1. 点击 "Deploy" 按钮
2. 等待构建完成（通常 2-5 分钟）
3. 部署成功后，Zeabur 会提供一个默认域名

### 步骤 5: 配置自定义域名（可选）
1. 在项目设置中找到 "Domains"
2. 添加你的自定义域名
3. 按照提示配置 DNS 记录

## 验证部署

1. 访问 Zeabur 提供的域名
2. 测试注册/登录功能
3. 创建测试目标并验证功能

## 常见问题

### 构建失败
- 检查环境变量是否正确配置
- 查看构建日志中的错误信息
- 确保 `package.json` 中的依赖版本兼容

### 运行时错误
- 检查 Supabase 连接是否正常
- 确认 RLS 策略已正确设置
- 查看 Zeabur 的日志输出

### 数据库连接问题
- 确认 Supabase URL 和 Key 正确
- 检查 Supabase 项目的网络访问设置
- 验证 RLS 策略允许用户访问自己的数据

## 更新部署

每次推送到 GitHub 主分支，Zeabur 会自动触发重新部署。

也可以手动触发：
1. 进入项目页面
2. 点击 "Redeploy" 按钮

## 监控和维护

- 在 Zeabur 项目页面查看：
  - 部署状态
  - 资源使用情况
  - 日志输出
  - 错误报告

## 备份建议

定期备份 Supabase 数据库：
1. 在 Supabase Dashboard 进入 Database
2. 使用 "Backup" 功能创建数据库备份

