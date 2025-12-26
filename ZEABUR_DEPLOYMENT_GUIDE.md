# Zeabur 部署指南

## 📋 部署前检查清单

### ✅ 1. 代码安全检查

#### 1.1 环境变量检查
- ✅ `.env` 文件已在 `.gitignore` 中
- ✅ 所有敏感信息使用环境变量
- ✅ 没有硬编码的 API 密钥或密码
- ⚠️ **需要配置的环境变量**：
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

#### 1.2 API 路由安全检查
- ✅ 所有 API 路由都进行用户认证检查
- ✅ 使用 `supabase.auth.getUser()` 验证用户身份
- ✅ 返回适当的 HTTP 状态码（401, 403, 409, 500）
- ✅ 输入参数验证和类型检查
- ✅ 防止 SQL 注入（使用 Supabase 参数化查询）

#### 1.3 数据库安全
- ✅ Row Level Security (RLS) 已启用
- ✅ 所有表都有 RLS 策略
- ✅ 用户只能访问自己的数据
- ✅ 外键约束和级联删除已配置

#### 1.4 认证和授权
- ✅ Middleware 保护受保护的路由
- ✅ 未登录用户重定向到登录页
- ✅ 使用 Supabase Auth 进行用户认证
- ✅ Session 管理正确（SSR 支持）

### ✅ 2. 代码质量检查

#### 2.1 TypeScript 类型安全
- ✅ `tsconfig.json` 配置正确
- ✅ `strict: true` 已启用
- ✅ 所有 API 路由都有类型定义

#### 2.2 错误处理
- ✅ 所有 API 路由都有 try-catch
- ✅ 错误信息不泄露敏感信息
- ✅ 用户友好的错误提示

#### 2.3 性能优化
- ✅ Next.js 14 App Router 使用
- ✅ Server Components 正确使用
- ✅ 数据库查询已优化（索引已创建）

### ✅ 3. 依赖检查

#### 3.1 依赖版本
- ✅ Next.js: 14.2.5
- ✅ React: 18.3.1
- ✅ Supabase: 最新版本
- ✅ 所有依赖都是稳定版本

#### 3.2 安全漏洞扫描
运行以下命令检查依赖漏洞：
```bash
npm audit
```

如果发现高危漏洞，运行：
```bash
npm audit fix
```

### ✅ 4. 构建检查

#### 4.1 本地构建测试
```bash
npm run build
```

确保：
- ✅ 构建成功，无错误
- ✅ 无 TypeScript 类型错误
- ✅ 无 ESLint 错误

#### 4.2 生产环境测试
```bash
npm run build
npm start
```

测试：
- ✅ 所有页面可以正常访问
- ✅ API 路由正常工作
- ✅ 认证流程正常
- ✅ 数据库连接正常

## 🚀 Zeabur 部署步骤

### 步骤 1: 准备 GitHub 仓库

1. **确保代码已提交到 GitHub**
   ```bash
   git add .
   git commit -m "准备部署到 Zeabur"
   git push origin main
   ```

2. **检查 `.gitignore`**
   确保以下文件/目录已被忽略：
   - `.env*`
   - `node_modules/`
   - `.next/`
   - `*.log`

### 步骤 2: 创建 Zeabur 项目

1. **登录 Zeabur**
   - 访问 [Zeabur](https://zeabur.com)
   - 使用 GitHub 账号登录

2. **创建新项目**
   - 点击 "New Project"
   - 选择 "Deploy from GitHub"
   - 选择你的仓库

3. **选择服务类型**
   - Zeabur 会自动检测 Next.js 项目
   - 确认 Framework Preset 为 "Next.js"

### 步骤 3: 配置环境变量

在 Zeabur 项目设置中添加以下环境变量：

#### 必需的环境变量

1. **NEXT_PUBLIC_SUPABASE_URL**
   - 值：你的 Supabase 项目 URL
   - 格式：`https://xxxxx.supabase.co`
   - 来源：Supabase Dashboard → Settings → API → Project URL

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
   - 值：你的 Supabase Anon Key
   - 格式：`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - 来源：Supabase Dashboard → Settings → API → Project API keys → anon public

#### 配置步骤

1. 在 Zeabur 项目页面，点击 "Environment Variables"
2. 点击 "Add Variable"
3. 添加每个环境变量：
   - **Key**: `NEXT_PUBLIC_SUPABASE_URL`
   - **Value**: 你的 Supabase URL
4. 重复添加 `NEXT_PUBLIC_SUPABASE_ANON_KEY`

⚠️ **重要提示**：
- 环境变量名称必须完全匹配（区分大小写）
- 不要包含引号或空格
- 确保值正确（可以从 Supabase Dashboard 复制）

### 步骤 4: 配置构建设置

Zeabur 通常会自动检测 Next.js 项目，但请确认以下设置：

#### 自动检测的配置（通常不需要修改）
- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

#### 如果需要手动配置

1. 在项目设置中找到 "Build Settings"
2. 确认以下配置：
   - **Node Version**: 18.x 或 20.x（推荐 20.x）
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`

### 步骤 5: 部署

1. **触发部署**
   - 点击 "Deploy" 按钮
   - 或者推送代码到 GitHub（如果启用了自动部署）

2. **查看部署日志**
   - 在 Zeabur 项目页面查看构建日志
   - 确保构建成功
   - 检查是否有错误或警告

3. **等待部署完成**
   - 构建通常需要 2-5 分钟
   - 部署完成后会显示部署 URL

### 步骤 6: 验证部署

#### 6.1 基本功能测试

1. **访问部署 URL**
   - 打开 Zeabur 提供的部署 URL
   - 应该看到登录页面或重定向到登录页

2. **测试认证**
   - 注册新账号
   - 登录
   - 登出

3. **测试核心功能**
   - 创建目标
   - 创建阶段
   - 创建行动
   - 设置当前目标
   - 完成行动
   - 查看复盘看板

#### 6.2 检查环境变量

如果遇到问题，检查：
1. 环境变量是否正确配置
2. Supabase URL 和 Key 是否正确
3. Supabase 项目是否正常运行

#### 6.3 查看日志

在 Zeabur 项目页面：
1. 点击 "Logs" 查看应用日志
2. 检查是否有错误信息
3. 检查数据库连接是否正常

### 步骤 7: 配置自定义域名（可选）

1. **在 Zeabur 项目设置中**
   - 找到 "Domains" 选项
   - 点击 "Add Domain"
   - 输入你的域名

2. **配置 DNS**
   - 按照 Zeabur 提供的 DNS 记录配置
   - 通常需要添加 CNAME 记录

3. **等待 DNS 生效**
   - DNS 传播通常需要几分钟到几小时
   - 使用 `dig` 或在线工具检查 DNS 是否生效

## 🔧 常见问题排查

### 问题 1: 构建失败

**症状**: 部署时构建失败

**可能原因**:
- TypeScript 类型错误
- 依赖安装失败
- 环境变量缺失

**解决方案**:
1. 检查构建日志中的错误信息
2. 本地运行 `npm run build` 测试
3. 确保所有环境变量已配置
4. 检查 `package.json` 中的依赖版本

### 问题 2: 运行时错误

**症状**: 应用可以访问但功能不正常

**可能原因**:
- 环境变量未正确配置
- Supabase 连接失败
- 数据库 RLS 策略问题

**解决方案**:
1. 检查环境变量是否正确
2. 检查 Supabase 项目是否正常运行
3. 查看应用日志中的错误信息
4. 验证 Supabase URL 和 Key 是否正确

### 问题 3: 认证失败

**症状**: 无法登录或注册

**可能原因**:
- Supabase Auth 配置问题
- 环境变量错误
- Cookie 设置问题

**解决方案**:
1. 检查 Supabase Dashboard 中的 Auth 设置
2. 确认环境变量中的 URL 和 Key 正确
3. 检查 Middleware 配置
4. 查看浏览器控制台和服务器日志

### 问题 4: 数据库连接失败

**症状**: 无法读取或写入数据

**可能原因**:
- Supabase 项目暂停
- RLS 策略配置错误
- 网络连接问题

**解决方案**:
1. 检查 Supabase Dashboard 项目状态
2. 验证 RLS 策略是否正确
3. 检查数据库表结构是否完整
4. 运行 `supabase/schema.sql` 确保表结构正确

## 📝 部署后检查清单

### ✅ 功能检查
- [ ] 用户注册功能正常
- [ ] 用户登录功能正常
- [ ] 创建目标功能正常
- [ ] 创建阶段功能正常
- [ ] 创建行动功能正常
- [ ] 设置当前目标功能正常
- [ ] 完成行动功能正常
- [ ] 标记未完成功能正常
- [ ] 查看复盘看板功能正常
- [ ] 删除操作功能正常

### ✅ 安全检查
- [ ] 未登录用户无法访问受保护的路由
- [ ] 用户只能访问自己的数据
- [ ] API 路由正确验证用户身份
- [ ] 没有敏感信息泄露在错误信息中

### ✅ 性能检查
- [ ] 页面加载速度正常
- [ ] API 响应时间正常
- [ ] 数据库查询性能正常

## 🔐 安全最佳实践

### 1. 环境变量管理
- ✅ 使用环境变量存储敏感信息
- ✅ 不要在代码中硬编码密钥
- ✅ 定期轮换 API 密钥
- ✅ 使用不同的密钥用于开发和生产环境

### 2. 数据库安全
- ✅ 启用 Row Level Security (RLS)
- ✅ 为所有表创建 RLS 策略
- ✅ 使用参数化查询（Supabase 自动处理）
- ✅ 定期备份数据库

### 3. API 安全
- ✅ 所有 API 路由验证用户身份
- ✅ 验证输入参数
- ✅ 返回适当的 HTTP 状态码
- ✅ 不泄露敏感错误信息

### 4. 认证安全
- ✅ 使用强密码策略
- ✅ 启用邮箱验证（如果适用）
- ✅ 使用 HTTPS（Zeabur 自动提供）
- ✅ 正确配置 Session 管理

## 📚 相关资源

- [Zeabur 文档](https://zeabur.com/docs)
- [Next.js 部署文档](https://nextjs.org/docs/deployment)
- [Supabase 文档](https://supabase.com/docs)
- [Supabase RLS 指南](https://supabase.com/docs/guides/auth/row-level-security)

## 🆘 获取帮助

如果遇到问题：
1. 查看 Zeabur 部署日志
2. 检查 Supabase Dashboard 日志
3. 查看浏览器控制台错误
4. 参考本文档的常见问题部分
5. 联系 Zeabur 支持或 Supabase 支持

---

**最后更新**: 2024-01-XX
**维护者**: 项目团队

