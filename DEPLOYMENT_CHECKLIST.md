# Zeabur 部署前检查清单

## ✅ 必须完成的检查项

### 1. 代码准备
- [ ] 所有代码已提交到 GitHub
- [ ] `.gitignore` 正确配置（包含 `.env*`, `node_modules/`, `.next/`）
- [ ] 没有硬编码的敏感信息
- [ ] 所有环境变量使用 `process.env`

### 2. 构建测试
- [ ] 本地运行 `npm run build` 成功
- [ ] 本地运行 `npm start` 成功
- [ ] 无 TypeScript 类型错误
- [ ] 无 ESLint 错误

### 3. 环境变量配置
- [ ] 准备 `NEXT_PUBLIC_SUPABASE_URL`
  - 来源：Supabase Dashboard → Settings → API → Project URL
  - 格式：`https://xxxxx.supabase.co`
- [ ] 准备 `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - 来源：Supabase Dashboard → Settings → API → Project API keys → anon public
  - 格式：`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 4. 数据库准备
- [ ] Supabase 项目已创建
- [ ] 已执行 `supabase/schema.sql` 创建表结构
- [ ] RLS 策略已启用
- [ ] 测试数据库连接正常

### 5. 安全检查
- [ ] 运行 `npm audit` 检查依赖漏洞
- [ ] 修复所有高危漏洞
- [ ] 确认所有 API 路由都有认证检查
- [ ] 确认 RLS 策略正确配置

### 6. 功能测试
- [ ] 用户注册功能正常
- [ ] 用户登录功能正常
- [ ] 创建目标功能正常
- [ ] 完成行动功能正常
- [ ] 查看复盘功能正常

## 🚀 Zeabur 部署步骤

### 步骤 1: 创建项目
1. 登录 [Zeabur](https://zeabur.com)
2. 点击 "New Project"
3. 选择 "Deploy from GitHub"
4. 选择你的仓库

### 步骤 2: 配置环境变量
在 Zeabur 项目设置中添加：
- `NEXT_PUBLIC_SUPABASE_URL` = 你的 Supabase URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = 你的 Supabase Anon Key

### 步骤 3: 部署
1. 确认 Framework Preset 为 "Next.js"
2. 点击 "Deploy"
3. 等待构建完成（2-5 分钟）

### 步骤 4: 验证
1. 访问部署 URL
2. 测试注册/登录
3. 测试核心功能

## 📝 部署后验证

- [ ] 应用可以正常访问
- [ ] 用户注册功能正常
- [ ] 用户登录功能正常
- [ ] 创建目标功能正常
- [ ] 完成行动功能正常
- [ ] 查看复盘功能正常
- [ ] 没有控制台错误
- [ ] 没有服务器错误日志

## 🔧 常见问题

### 构建失败
- 检查构建日志
- 确认环境变量已配置
- 本地运行 `npm run build` 测试

### 运行时错误
- 检查环境变量是否正确
- 检查 Supabase 项目状态
- 查看应用日志

### 认证失败
- 检查 Supabase URL 和 Key
- 检查 Supabase Auth 设置
- 查看浏览器控制台

---

**完成所有检查项后，即可安全部署到 Zeabur！**

