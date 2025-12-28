# Zeabur 部署检查清单

## ✅ 已完成的配置

### 1. 注册邮件 URL 定向 ✅
- ✅ `app/auth/login/page.tsx` - 已配置 `emailRedirectTo`
- ✅ `packages/web/app/auth/login/page.tsx` - 已配置 `emailRedirectTo`
- ✅ `app/auth/callback/route.ts` - 回调路由已创建
- ✅ `packages/web/app/auth/callback/route.ts` - 回调路由已创建

### 2. 回调 URL 配置 ✅
注册时使用的回调 URL 逻辑：
- 客户端：自动使用 `window.location.origin`（适配任何域名）
- 服务端：优先使用 `NEXT_PUBLIC_SITE_URL` 环境变量
- 回调路由：从请求头自动获取正确的站点 URL（支持 Zeabur 的 `x-forwarded-host`）

### 3. Zeabur 配置文件 ✅
- ✅ `packages/web/.zeabur.json` - 已配置构建命令

## 🔧 需要在 Zeabur 配置的环境变量

### 必需的环境变量：
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_SITE_URL=https://psongoal.zeabur.app
```

### 重要说明：
1. **NEXT_PUBLIC_SITE_URL** 必须设置为你的实际 Zeabur 域名
2. 如果域名不是 `psongoal.zeabur.app`，请更新为实际域名
3. 代码会自动从请求头获取域名，但设置环境变量更可靠

## 📧 Supabase 配置检查

### 在 Supabase Dashboard 中需要配置：

1. **Authentication > URL Configuration**
   - **Site URL**: `https://psongoal.zeabur.app`（或你的实际域名）
   - **Redirect URLs**: 添加以下 URL：
     ```
     https://psongoal.zeabur.app/*
     https://psongoal.zeabur.app/auth/callback
     ```

2. **Email Templates**
   - 确认邮箱验证模板中的链接格式正确
   - 链接应该指向：`{SITE_URL}/auth/callback?token={TOKEN}&type=signup`

## 🧪 测试步骤

### 1. 测试注册流程
1. 访问 `https://psongoal.zeabur.app/auth/login`
2. 点击"注册"
3. 输入邮箱和密码
4. 提交注册
5. 检查邮箱（包括垃圾邮件文件夹）
6. 点击邮件中的验证链接
7. 应该自动跳转到 `/today` 页面

### 2. 测试回调路由
- 直接访问：`https://psongoal.zeabur.app/auth/callback`
- 应该重定向到登录页（因为没有验证码）

### 3. 检查控制台日志
- 注册时应该看到：`注册时使用的回调 URL: https://psongoal.zeabur.app/auth/callback`

## 🔍 故障排查

### 如果注册邮件链接不工作：

1. **检查环境变量**
   - 确认 `NEXT_PUBLIC_SITE_URL` 已设置
   - 确认值是正确的域名（带 https://）

2. **检查 Supabase 配置**
   - 确认 Site URL 和 Redirect URLs 已配置
   - 确认 Redirect URLs 包含 `https://psongoal.zeabur.app/*`

3. **检查回调路由**
   - 确认 `/auth/callback` 路由存在
   - 检查服务器日志是否有错误

4. **检查域名**
   - 如果 Zeabur 分配的域名不同，更新：
     - `NEXT_PUBLIC_SITE_URL` 环境变量
     - Supabase 的 Site URL 和 Redirect URLs

## 📝 代码关键点

### 注册时 URL 生成逻辑：
```typescript
// 客户端：自动使用当前域名
siteUrl = window.location.origin

// 服务端：使用环境变量或默认值
siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://psongoal.zeabur.app'

// 回调 URL
redirectUrl = `${siteUrl}/auth/callback`
```

### 回调路由 URL 解析逻辑：
```typescript
// 优先使用环境变量
if (process.env.NEXT_PUBLIC_SITE_URL) {
  return process.env.NEXT_PUBLIC_SITE_URL
}

// 从 Zeabur 请求头获取
const forwardedHost = request.headers.get('x-forwarded-host')
const forwardedProto = request.headers.get('x-forwarded-proto')

if (forwardedHost) {
  const protocol = forwardedProto || 'https'
  return `${protocol}://${forwardedHost}`
}
```

## ✅ 部署前最终检查

- [ ] 环境变量已配置（NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SITE_URL）
- [ ] Supabase Site URL 已配置为实际域名
- [ ] Supabase Redirect URLs 已添加 `https://your-domain.zeabur.app/*`
- [ ] 代码已提交到 Git 仓库
- [ ] Zeabur 项目已连接到 Git 仓库
- [ ] 构建命令正确：`pnpm install && pnpm build`
- [ ] 根目录设置为：`packages/web`

## 🚀 部署命令

在 Zeabur 中：
1. 选择项目根目录：`packages/web`
2. 构建命令：`pnpm install && pnpm build`
3. 启动命令：`pnpm start`

