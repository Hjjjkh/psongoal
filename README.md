# 个人目标执行系统 (Personal Execution System, PES)

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-14.2.5-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4.5-blue?style=for-the-badge&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-3EECF8?style=for-the-badge&logo=supabase&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

一个专注于"强制执行"的个人目标管理系统，通过"每日唯一行动"机制，将长期目标拆解为可执行路径。

[功能特性](#-核心功能) • [快速开始](#-快速开始) • [部署指南](#-部署) • [项目结构](#-项目结构)

</div>

---

## 📖 项目简介

个人目标执行系统（PES）是一个现代化的全栈 Web 应用，旨在帮助用户通过"每日唯一行动"的机制，将长期目标系统化地拆解为可执行的日常行动。系统强调**强制执行**而非简单记录，确保用户专注于当前任务，逐步达成目标。

### 核心设计理念

1. **每日唯一行动**: 系统每天只展示一个 Action，强制用户聚焦，避免选择困难
2. **完成标准明确**: 每个 Action 必须有客观可判断的完成标准，确保执行质量
3. **不可跳过**: 未完成的 Action 不能被跳过，必须完成才能推进到下一步
4. **阶段产出导向**: 强调阶段性的产出，而非零散的任务列表
5. **数据驱动复盘**: 提供详细的统计数据和趋势分析，帮助用户了解执行情况

## ✨ 核心功能

### 🎯 目标管理
- **创建目标**: 支持手动创建或使用模板快速创建（健康/学习/项目三类）
- **阶段规划**: 为目标创建多个执行阶段，每个阶段包含多个行动
- **模板系统**: 内置三类目标模板，支持自定义编辑模板行动
- **批量创建**: 支持批量创建行动，提高规划效率

### 📅 今日行动（核心功能）
- **每日唯一行动**: 每天只显示一个当前行动，强制聚焦
- **完成反馈**: 完成行动时记录难度（1-5）和精力消耗（1-5）
- **自动推进**: 完成当前行动后，系统自动推进到下一个行动
- **未完成标记**: 可以标记行动为未完成，明天继续尝试
- **上下文信息**: 显示目标进度、剩余行动数、连续完成天数

### 📊 复盘看板
- **今日完成状态**: 清晰显示今天是否已完成行动
- **连续完成天数**: 跨目标统计连续完成天数，体现持续执行能力
- **目标进度**: 显示每个目标的完成百分比和进度条
- **30天完成趋势**: 可视化展示最近30天的完成情况
- **难度 & 精力趋势**: 
  - 支持折线图、面积图、柱状图三种图表类型
  - 显示平均/最高/最低难度和精力值
  - 提供数据分析和提示
- **现代化图表**: 使用 Recharts 实现美观的数据可视化

### 🏠 首页控制中心
- **状态概览**: 一目了然地查看今日状态、当前行动、目标进度
- **快速导航**: 快速跳转到各个功能页面
- **目标完成庆祝**: 目标完成后显示庆祝页面，展示完成统计

### 🔐 安全与认证
- **用户认证**: 使用 Supabase Auth 进行安全的用户认证
- **数据隔离**: Row Level Security (RLS) 确保用户只能访问自己的数据
- **API 保护**: 所有 API 路由都进行用户身份验证
- **安全响应头**: 配置了完整的安全响应头，防止常见攻击

## 🛠️ 技术栈

### 前端
- **框架**: Next.js 14.2.5 (App Router)
- **UI 库**: shadcn/ui + Tailwind CSS
- **图表**: Recharts 3.6.0
- **图标**: Lucide React
- **通知**: Sonner
- **语言**: TypeScript 5.4.5

### 后端
- **数据库**: Supabase (PostgreSQL)
- **认证**: Supabase Auth (SSR)
- **API**: Next.js API Routes
- **状态管理**: React Server Components

### 部署
- **平台**: Zeabur / Vercel
- **构建**: Next.js 生产构建
- **环境**: Node.js 18.x / 20.x

## 📁 项目结构

```
psongoal/
├── app/                          # Next.js App Router
│   ├── api/                      # API 路由
│   │   ├── actions/              # 行动管理 API
│   │   │   ├── [id]/             # 单个行动操作
│   │   │   ├── batch/             # 批量创建行动
│   │   │   └── route.ts           # 创建行动
│   │   ├── complete-action/       # 完成行动并推进
│   │   ├── goals/                 # 目标管理 API
│   │   │   ├── [id]/              # 单个目标操作
│   │   │   ├── create-from-template/  # 从模板创建目标
│   │   │   └── route.ts           # 创建目标
│   │   ├── mark-incomplete/       # 标记行动未完成
│   │   ├── phases/                # 阶段管理 API
│   │   │   ├── [id]/              # 单个阶段操作
│   │   │   └── route.ts           # 创建阶段
│   │   └── set-current-goal/      # 设置当前目标
│   ├── auth/                      # 认证页面
│   │   └── login/                 # 登录/注册页面
│   ├── dashboard/                 # 复盘看板页面
│   ├── goal-complete/             # 目标完成庆祝页面
│   ├── goals/                     # 目标规划页面
│   ├── today/                     # 今日行动页面（核心）
│   ├── layout.tsx                 # 根布局（包含导航栏）
│   ├── page.tsx                   # 首页（控制中心）
│   └── globals.css                # 全局样式
├── components/                     # React 组件
│   ├── ui/                        # shadcn/ui 基础组件
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── select.tsx
│   │   ├── skeleton.tsx
│   │   └── textarea.tsx
│   ├── dashboard-view.tsx         # 复盘看板视图
│   ├── goal-celebration-view.tsx  # 目标完成庆祝视图
│   ├── goals-view.tsx             # 目标规划视图
│   ├── home-view.tsx              # 首页控制中心视图
│   ├── navigation.tsx             # 全局导航栏
│   └── today-view.tsx             # 今日行动视图
├── lib/                            # 工具函数和配置
│   ├── supabase/                  # Supabase 客户端
│   │   ├── client.ts              # 浏览器端客户端
│   │   └── server.ts              # 服务端客户端
│   ├── system-state.ts            # 系统状态推进逻辑（核心）
│   ├── templates.ts               # 目标模板定义
│   ├── types.ts                   # TypeScript 类型定义
│   └── utils.ts                   # 工具函数
├── supabase/                       # 数据库相关
│   ├── schema.sql                 # 数据库表结构和 RLS 策略
│   └── migration_add_completed_at.sql  # 迁移文件
├── middleware.ts                   # Next.js Middleware（路由保护）
├── next.config.js                  # Next.js 配置（包含安全响应头）
├── tailwind.config.ts              # Tailwind CSS 配置
├── tsconfig.json                   # TypeScript 配置
└── package.json                    # 项目依赖
```

## 🗄️ 数据库结构

### 核心实体

1. **goals（目标）**: 长期目标，如"练出腹肌"
   - 字段：id, user_id, name, category, start_date, end_date, status, created_at, updated_at
   - 状态：active, paused, completed

2. **phases（阶段）**: 目标的执行阶段，如"核心力量阶段"
   - 字段：id, goal_id, name, description, order_index, created_at
   - 关系：一个目标可以有多个阶段

3. **actions（行动单元）**: 可执行的行动，如"核心训练 Day 3"
   - 字段：id, phase_id, title, definition, estimated_time, order_index, completed_at, created_at
   - 关系：一个阶段可以有多个行动
   - 关键：completed_at 是推进的唯一真相源

4. **daily_executions（每日执行记录）**: 记录每日完成情况
   - 字段：id, action_id, user_id, date, completed, difficulty, energy, created_at, updated_at
   - 约束：每天每个行动只能有一条记录（UNIQUE constraint）
   - 用途：用于统计和复盘

5. **system_states（系统状态）**: 单行表，记录当前执行位置
   - 字段：id (固定为1), user_id, current_goal_id, current_phase_id, current_action_id, updated_at
   - 约束：每个用户只有一行（UNIQUE user_id）

### 安全机制

- **Row Level Security (RLS)**: 所有表都启用了 RLS，确保用户只能访问自己的数据
- **外键约束**: 正确配置了级联删除，保证数据一致性
- **索引优化**: 为常用查询字段创建了索引，提高查询性能

详细 SQL 见 `supabase/schema.sql`

## 🚀 快速开始

### 前置要求

- Node.js 18.x 或 20.x
- npm 或 yarn
- Supabase 账号（免费版即可）

### 1. 克隆仓库

```bash
git clone https://github.com/your-username/psongoal.git
cd psongoal
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置 Supabase

1. 在 [Supabase](https://supabase.com) 创建新项目
2. 在 SQL Editor 中执行 `supabase/schema.sql` 创建表结构
3. 确认 RLS 策略已启用

### 4. 配置环境变量

创建 `.env.local` 文件：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

获取方式：
- Supabase Dashboard → Settings → API → Project URL
- Supabase Dashboard → Settings → API → Project API keys → anon public

### 5. 运行开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 6. 构建生产版本

```bash
npm run build
npm start
```

## 📖 使用指南

### 首次使用

1. **注册账号**: 访问 `/auth/login`，使用邮箱和密码注册
2. **创建目标**: 
   - 访问 `/goals` 页面
   - 点击"创建目标"或"使用模板创建"
   - 填写目标信息（名称、类别、日期范围）
   - 如果使用模板，可以编辑模板行动
3. **创建阶段和行动**:
   - 为目标创建阶段
   - 为阶段创建行动（支持单个或批量创建）
4. **设置当前目标**: 点击"设为当前目标"按钮
5. **开始执行**: 访问 `/today` 页面，完成今日行动

### 日常使用

1. **完成今日行动**: 
   - 访问 `/today` 页面
   - 查看当前行动和完成标准
   - 点击"完成"按钮，记录难度和精力
   - 系统自动推进到下一个行动
2. **查看复盘**: 
   - 访问 `/dashboard` 页面
   - 查看完成统计、趋势图表、目标进度
3. **规划新目标**: 
   - 访问 `/goals` 页面
   - 创建新的目标、阶段和行动

### 核心特性说明

#### 每日唯一行动
- 系统每天只允许完成一个行动
- 如果今天已完成行动，再次访问 `/today` 会显示"今日已完成"提示
- 明天会自动显示下一个行动

#### 自动推进机制
- 完成当前行动后，系统自动推进到下一个行动
- 如果当前阶段的所有行动都完成，自动切换到下一个阶段
- 如果目标的所有阶段都完成，显示目标完成庆祝页面

#### 数据复盘
- 连续完成天数：跨目标统计，体现持续执行能力
- 完成趋势：可视化展示最近30天的完成情况
- 难度和精力趋势：帮助了解执行难度和精力消耗模式

## 🔒 安全特性

### 认证与授权
- ✅ 使用 Supabase Auth 进行用户认证
- ✅ 支持邮箱密码登录/注册
- ✅ 密码强度验证（至少8位，包含字母和数字）
- ✅ Next.js Middleware 保护受保护的路由
- ✅ SSR 支持，确保服务端正确读取 session

### 数据安全
- ✅ Row Level Security (RLS) 已启用
- ✅ 用户只能访问和操作自己的数据
- ✅ 所有 API 路由都进行用户验证
- ✅ 输入参数验证和类型检查
- ✅ 防止 SQL 注入（使用 Supabase 参数化查询）

### 安全响应头
- ✅ X-Frame-Options: DENY
- ✅ X-Content-Type-Options: nosniff
- ✅ Referrer-Policy: strict-origin-when-cross-origin
- ✅ X-XSS-Protection: 1; mode=block

## 🚀 部署

### Zeabur 部署

详细部署指南请参考 [ZEABUR_DEPLOYMENT_GUIDE.md](./ZEABUR_DEPLOYMENT_GUIDE.md)

#### 快速步骤

1. **准备环境变量**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

2. **连接 GitHub 仓库**
   - 在 Zeabur 创建新项目
   - 选择 "Deploy from GitHub"
   - 选择你的仓库

3. **配置环境变量**
   - 在 Zeabur 项目设置中添加环境变量

4. **部署**
   - Zeabur 会自动检测 Next.js 项目
   - 点击"Deploy"即可

5. **验证**
   - 访问部署 URL
   - 测试所有功能

### 其他平台

项目也可以部署到其他支持 Next.js 的平台：
- **Vercel**: 原生支持 Next.js，配置类似
- **Railway**: 支持 Node.js 应用
- **Render**: 支持 Node.js 应用

## 🧩 核心逻辑

### 系统状态推进

核心逻辑在 `lib/system-state.ts` 中：

1. **完成检查**: 只有今天完成的 Action 才能推进
2. **顺序推进**: 按 `order_index` 顺序推进 Action
3. **阶段切换**: 当前 Phase 完成后，自动切换到下一个 Phase 的第一个 Action
4. **目标完成**: 所有 Phase 完成后，系统状态保持不变，等待用户设置新目标

### 每日唯一行动约束

- 系统每天只允许完成一个行动
- 如果今天已完成行动，API 会拒绝再次完成（409 Conflict）
- 完成行动后，系统状态保持当前行动，明天自动显示下一个行动

### 数据一致性

- `actions.completed_at` 是推进的唯一真相源
- `daily_executions` 用于统计和复盘
- 所有操作都通过事务保证数据一致性

## 📚 相关文档

- [ARCHITECTURE.md](./ARCHITECTURE.md) - 系统架构详细说明
- [SETUP.md](./SETUP.md) - 快速开始指南
- [ZEABUR_DEPLOYMENT_GUIDE.md](./ZEABUR_DEPLOYMENT_GUIDE.md) - Zeabur 部署详细指南
- [SECURITY_AUDIT.md](./SECURITY_AUDIT.md) - 安全审计报告
- [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - 部署检查清单

## 🛠️ 开发指南

### 添加新功能

1. 在 `app/api/` 下创建新的 API 路由
2. 在 `components/` 下创建对应的 UI 组件
3. 更新 `lib/types.ts` 添加新的类型定义（如需要）
4. 确保所有数据库操作都通过 RLS 策略保护

### 数据库迁移

1. 在 `supabase/` 目录下创建新的 SQL 迁移文件
2. 在 Supabase Dashboard 的 SQL Editor 中执行
3. 更新 `supabase/schema.sql` 保持同步

### 代码规范

- 使用 TypeScript 严格模式
- 遵循 Next.js App Router 最佳实践
- 使用 Server Components 优先
- 所有 API 路由必须验证用户身份
- 错误处理要友好且不泄露敏感信息

## 🐛 故障排除

### 常见问题

1. **构建失败**
   - 检查 Node.js 版本（需要 18.x 或 20.x）
   - 运行 `npm install` 重新安装依赖
   - 检查 TypeScript 类型错误

2. **数据库连接失败**
   - 检查环境变量是否正确
   - 确认 Supabase 项目状态
   - 验证 RLS 策略是否正确

3. **认证失败**
   - 检查 Supabase URL 和 Key
   - 确认 Supabase Auth 设置
   - 查看浏览器控制台错误

## 📊 项目统计

- **API 路由**: 12 个
- **页面**: 6 个
- **组件**: 20+ 个
- **数据库表**: 5 个
- **RLS 策略**: 20+ 个

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

在提交 PR 之前，请确保：
- 代码通过 TypeScript 类型检查
- 通过 ESLint 检查
- 所有 API 路由都有认证检查
- 数据库操作通过 RLS 保护

## 📄 许可证

MIT License

## 🙏 致谢

- [Next.js](https://nextjs.org/) - React 全栈框架
- [Supabase](https://supabase.com/) - 开源 Firebase 替代方案
- [shadcn/ui](https://ui.shadcn.com/) - 高质量 UI 组件
- [Recharts](https://recharts.org/) - 图表库
- [Tailwind CSS](https://tailwindcss.com/) - 实用优先的 CSS 框架

---

<div align="center">

**个人目标执行系统** - 让目标执行变得简单而有效

[⭐ Star this repo](https://github.com/your-username/psongoal) • [📖 查看文档](./ARCHITECTURE.md) • [🚀 部署指南](./ZEABUR_DEPLOYMENT_GUIDE.md)

</div>
