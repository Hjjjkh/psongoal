# Zeabur 部署验证清单

## ✅ 代码配置已完成

### 1. 注册邮件 URL 配置 ✅
- ✅ `packages/web/app/auth/login/page.tsx` - 已正确配置 `emailRedirectTo`
- ✅ `packages/web/app/auth/callback/route.ts` - 回调路由已正确实现
- ✅ 自动从请求头获取域名（支持 Zeabur 的 `x-forwarded-host`）
- ✅ 支持环境变量 `NEXT_PUBLIC_SITE_URL`

### 2. 回调路由逻辑 ✅
- ✅ 正确处理 Supabase 验证码
- ✅ 验证成功后重定向到 `/today`
- ✅ 验证失败时重定向到登录页
- ✅ 自动获取正确的站点 URL

### 3. Zeabur 构建配置 ✅
- ✅ `packages/web/.zeabur.json` - 已配置
- ✅ 构建命令：`pnpm install && pnpm build`
- ✅ 包管理器：`pnpm`

## 🔧 需要在 Zeabur 控制台配置

### 步骤 1: 设置环境变量

在 Zeabur 项目设置中添加以下环境变量：

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_SITE_URL=https://your-actual-domain.zeabur.app
```

**重要**：
- 将 `your-actual-domain.zeabur.app` 替换为 Zeabur 分配给你的实际域名
- 如果域名是 `psongoal.zeabur.app`，则使用该值
- 确保 URL 包含 `https://` 协议

### 步骤 2: 配置项目设置

在 Zeabur 项目设置中：
- **Root Directory**: `packages/web`
- **Build Command**: `pnpm install && pnpm build`（已在 `.zeabur.json` 中配置）
- **Start Command**: `pnpm start`（自动检测）

## 📧 Supabase 配置（必需）

### 在 Supabase Dashboard 中配置：

1. **进入 Authentication > URL Configuration**

2. **设置 Site URL**：
   ```
   https://your-actual-domain.zeabur.app
   ```
   （替换为你的实际 Zeabur 域名）

3. **添加 Redirect URLs**（每行一个）：
   ```
   https://your-actual-domain.zeabur.app/*
   https://your-actual-domain.zeabur.app/auth/callback
   ```

4. **保存配置**

## 🧪 测试注册邮件功能

### 测试步骤：

1. **部署到 Zeabur**
   - 推送代码到 Git 仓库
   - Zeabur 自动构建和部署

2. **测试注册流程**
   - 访问：`https://your-domain.zeabur.app/auth/login`
   - 点击"注册"
   - 输入邮箱和密码（至少 8 位，包含字母和数字）
   - 提交注册

3. **检查邮箱**
   - 查看收件箱（包括垃圾邮件文件夹）
   - 应该收到 Supabase 发送的验证邮件
   - 邮件中的链接应该指向：`https://your-domain.zeabur.app/auth/callback?token=...`

4. **点击验证链接**
   - 应该自动跳转到 `/today` 页面
   - 用户已自动登录

5. **检查控制台日志**
   - 在浏览器开发者工具中查看
   - 注册时应该看到：`注册时使用的回调 URL: https://your-domain.zeabur.app/auth/callback`

## 🔍 故障排查

### 如果注册邮件链接不工作：

1. **检查环境变量**
   ```bash
   # 在 Zeabur 控制台检查环境变量是否正确设置
   NEXT_PUBLIC_SITE_URL=https://your-domain.zeabur.app
   ```

2. **检查 Supabase 配置**
   - 确认 Site URL 正确
   - 确认 Redirect URLs 包含 `https://your-domain.zeabur.app/*`
   - 确认 Redirect URLs 包含 `https://your-domain.zeabur.app/auth/callback`

3. **检查域名**
   - 如果 Zeabur 分配的域名与预期不同，更新：
     - Zeabur 环境变量 `NEXT_PUBLIC_SITE_URL`
     - Supabase 的 Site URL 和 Redirect URLs

4. **检查回调路由**
   - 访问：`https://your-domain.zeabur.app/auth/callback`
   - 应该重定向到登录页（因为没有验证码）

5. **查看服务器日志**
   - 在 Zeabur 控制台查看部署日志
   - 检查是否有错误信息

## 📝 代码工作原理

### 注册时 URL 生成：
```typescript
// 客户端：自动使用当前域名
if (typeof window !== 'undefined') {
  siteUrl = window.location.origin  // 例如：https://your-domain.zeabur.app
}

// 服务端：使用环境变量
else {
  siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://psongoal.zeabur.app'
}

// 生成回调 URL
const redirectUrl = `${siteUrl}/auth/callback`
```

### 回调路由 URL 解析：
```typescript
// 1. 优先使用环境变量
if (process.env.NEXT_PUBLIC_SITE_URL) {
  return process.env.NEXT_PUBLIC_SITE_URL
}

// 2. 从 Zeabur 请求头获取（自动）
const forwardedHost = request.headers.get('x-forwarded-host')
if (forwardedHost) {
  return `https://${forwardedHost}`
}

// 3. 从 Host 头获取
const host = request.headers.get('host')
if (host) {
  return `https://${host}`
}

// 4. 默认值
return 'https://psongoal.zeabur.app'
```

## ✅ 最终检查清单

部署前确认：
- [ ] 代码已推送到 Git 仓库
- [ ] Zeabur 项目已连接到 Git 仓库
- [ ] 环境变量已配置（3 个必需变量）
- [ ] Supabase Site URL 已设置为实际域名
- [ ] Supabase Redirect URLs 已添加（包含 `/*` 和 `/auth/callback`）
- [ ] Zeabur 根目录设置为 `packages/web`
- [ ] 构建命令正确：`pnpm install && pnpm build`

部署后验证：
- [ ] 网站可以正常访问
- [ ] 可以正常注册新用户
- [ ] 收到注册验证邮件
- [ ] 邮件中的链接可以正常打开
- [ ] 点击链接后自动登录并跳转到 `/today`

## 🎉 完成

如果所有步骤都完成，注册邮件功能应该可以正常工作！

