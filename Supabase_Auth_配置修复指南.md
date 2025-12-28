# Supabase Auth 配置修复指南

## 🚨 问题说明

用户注册时收到的确认邮件链接指向 `localhost:3000`，导致外部用户无法验证邮箱。

## ✅ 修复步骤

### 1. 修复代码（已完成）

✅ 已更新 `packages/web/app/auth/login/page.tsx`，添加了 `emailRedirectTo` 配置：
- 自动检测当前域名（支持本地开发和线上环境）
- 默认使用 `https://psongoal.zeabur.app`

✅ 已创建 `packages/web/app/auth/callback/route.ts`：
- 处理邮箱验证回调
- 自动交换 code 为 session
- 验证成功后跳转到目标页面

### 2. Supabase Dashboard 配置（必须完成）

#### 步骤 1: 进入 URL Configuration

1. 登录 [Supabase Dashboard](https://app.supabase.com)
2. 选择你的项目
3. 进入 **Authentication** → **URL Configuration**

#### 步骤 2: 配置 Site URL

将 **Site URL** 从 `http://localhost:3000` 改为：

```
https://psongoal.zeabur.app
```

#### 步骤 3: 配置 Redirect URLs

在 **Redirect URLs** 中添加以下 URL（每行一个）：

```
https://psongoal.zeabur.app/*
https://psongoal.zeabur.app/auth/callback
http://localhost:3000/*  (保留，用于本地开发)
```

点击 **Save** 保存配置。

### 3. 环境变量配置（可选，推荐）

在 `packages/web/.env.local`（本地）和 Zeabur 环境变量中添加：

```env
NEXT_PUBLIC_SITE_URL=https://psongoal.zeabur.app
```

这样代码会优先使用环境变量，更灵活。

### 4. 重新部署

1. 提交代码更改
2. 推送到 GitHub
3. Zeabur 会自动重新部署

### 5. 测试验证

**重要**：旧的确认邮件链接已经失效，需要：

1. 让朋友**重新注册**（或删除旧账户后重新注册）
2. 检查新收到的邮件链接是否指向 `https://psongoal.zeabur.app`
3. 点击链接应该能正常验证

## 📋 配置检查清单

- [ ] Supabase Dashboard → Site URL 已改为 `https://psongoal.zeabur.app`
- [ ] Redirect URLs 已添加 `https://psongoal.zeabur.app/*`
- [ ] 代码已更新（添加 emailRedirectTo）
- [ ] 已重新部署到 Zeabur
- [ ] 已测试新用户注册流程

## 🔍 验证方法

1. **检查邮件链接**：
   - 新注册用户收到的邮件中，链接应该以 `https://psongoal.zeabur.app` 开头
   - 不应该再出现 `localhost:3000`

2. **检查 Supabase Dashboard**：
   - Authentication → URL Configuration
   - 确认 Site URL 和 Redirect URLs 都已正确配置

3. **测试流程**：
   - 使用新邮箱注册
   - 检查收到的确认邮件
   - 点击链接应该能正常跳转并验证

## ⚠️ 注意事项

- **旧邮件链接全部失效**：之前发送的确认邮件中的链接已经无法使用，需要重新注册
- **本地开发不受影响**：保留了 `localhost:3000` 的配置，本地开发仍然正常
- **必须完成 Supabase Dashboard 配置**：仅修改代码不够，必须在 Dashboard 中配置 URL

## 🆘 如果还有问题

1. 检查 Supabase Dashboard 配置是否正确保存
2. 确认 Zeabur 部署已更新
3. 清除浏览器缓存后重试
4. 检查 Supabase 项目设置中的域名白名单

