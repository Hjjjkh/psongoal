# 白屏问题修复

## 🔍 问题分析

### 可能的原因
1. **SSR/客户端不匹配**：某些组件在服务端渲染时访问了浏览器 API
2. **错误边界问题**：ErrorBoundary 可能捕获了错误但没有正确显示
3. **组件导入错误**：某些组件可能导入失败
4. **localStorage 访问**：在 SSR 时访问 localStorage 会导致错误

---

## 🔧 已修复的问题

### 1. PWA 安装提示组件的 SSR 问题

**问题**：
- `components/pwa-install-prompt.tsx` 在 `useEffect` 中直接访问 `window` 和 `localStorage`
- 虽然使用了 `useEffect`，但可能仍有问题

**修复**：
- 添加 `typeof window === 'undefined'` 检查
- 添加 `localStorage` 访问的 try-catch
- 确保所有浏览器 API 访问都在客户端执行

### 2. 组件加载顺序

**问题**：
- `ServiceWorkerRegister` 可能在 Navigation 之前加载，导致问题

**修复**：
- 调整组件顺序：Navigation → children → ServiceWorkerRegister → PWAInstallPrompt
- 确保 Navigation 先加载（用户最需要看到）

---

## 📋 检查清单

### 已修复
- ✅ PWA 安装提示组件的 SSR 安全
- ✅ localStorage 访问的安全性
- ✅ 组件加载顺序优化

### 需要检查
- ⚠️ 浏览器控制台是否有错误
- ⚠️ 网络请求是否成功
- ⚠️ 是否有组件导入错误

---

## 🎯 调试步骤

### 1. 检查浏览器控制台
打开浏览器开发者工具（F12），查看：
- Console 标签：是否有错误信息
- Network 标签：是否有请求失败
- Sources 标签：是否有编译错误

### 2. 检查服务器日志
查看开发服务器终端输出：
- 是否有编译错误
- 是否有运行时错误
- 是否有 API 错误

### 3. 检查页面源码
查看页面 HTML 源码：
- 是否有内容渲染
- 是否有错误信息
- 是否有 JavaScript 错误

---

## 💡 常见白屏原因

### 1. JavaScript 错误
- **原因**：某个组件抛出未捕获的错误
- **解决**：查看浏览器控制台错误信息

### 2. 网络错误
- **原因**：API 请求失败或超时
- **解决**：检查网络连接和 API 端点

### 3. 认证问题
- **原因**：用户未登录或会话过期
- **解决**：检查认证状态

### 4. 数据库连接问题
- **原因**：Supabase 连接失败
- **解决**：检查环境变量和数据库连接

---

## 🔄 如果仍然白屏

### 步骤1：清除缓存
1. 清除浏览器缓存
2. 清除 Service Worker（如果已注册）
3. 硬刷新（Ctrl+Shift+R 或 Cmd+Shift+R）

### 步骤2：检查环境变量
确保 `.env.local` 文件存在且配置正确：
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### 步骤3：检查数据库
确保 Supabase 数据库：
- 连接正常
- 表已创建
- RLS 策略已启用

### 步骤4：查看详细错误
1. 打开浏览器控制台
2. 查看 Network 标签
3. 查看 Console 标签
4. 查看 Sources 标签

---

## 📝 总结

已修复：
- ✅ PWA 组件的 SSR 安全性
- ✅ localStorage 访问的安全性
- ✅ 组件加载顺序

如果仍然白屏，请：
1. 查看浏览器控制台错误
2. 检查服务器日志
3. 清除缓存并硬刷新
4. 检查环境变量和数据库连接

