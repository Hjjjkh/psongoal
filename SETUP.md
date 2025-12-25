# 快速开始指南

## 一、系统整体架构

个人目标执行系统（PES）是一个基于 Next.js + Supabase 的全栈应用，核心设计理念是"强制执行"：
- 每天只展示一个 Action
- 未完成不能推进
- 强调阶段产出，而非零散任务

详细架构说明见 `ARCHITECTURE.md`

## 二、Supabase 数据表 SQL

完整的数据库表结构在 `supabase/schema.sql` 文件中，包含：

1. **goals** - 目标表
2. **phases** - 阶段表
3. **actions** - 行动单元表
4. **daily_executions** - 每日执行记录表
5. **system_states** - 系统状态表（单行）

所有表都配置了：
- Row Level Security (RLS)
- 索引优化
- 自动更新时间戳
- 外键约束

## 三、项目目录结构

```
psongoal/
├── app/
│   ├── api/                    # API 路由
│   │   ├── complete-action/    # 完成 Action 并推进
│   │   ├── mark-incomplete/    # 标记未完成
│   │   ├── goals/              # Goal CRUD
│   │   ├── phases/             # Phase CRUD
│   │   ├── actions/            # Action CRUD
│   │   └── set-current-goal/   # 设置当前目标
│   ├── auth/login/             # 登录页面
│   ├── today/                  # 今日行动（核心页面）
│   ├── goals/                  # 目标规划页面
│   ├── dashboard/              # 复盘看板页面
│   ├── layout.tsx              # 根布局
│   ├── page.tsx                # 首页（重定向到 /today）
│   └── globals.css             # 全局样式
├── components/
│   ├── ui/                     # shadcn/ui 组件
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   └── select.tsx
│   ├── today-view.tsx          # 今日行动视图
│   ├── goals-view.tsx          # 目标规划视图
│   └── dashboard-view.tsx     # 复盘看板视图
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # 客户端 Supabase
│   │   └── server.ts           # 服务端 Supabase
│   ├── system-state.ts         # 系统状态推进逻辑（核心）
│   ├── types.ts                # TypeScript 类型定义
│   └── utils.ts                # 工具函数
├── supabase/
│   └── schema.sql             # 数据库表结构 SQL
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
├── README.md                   # 项目说明
├── ARCHITECTURE.md            # 架构说明
├── DEPLOYMENT.md              # 部署说明
└── SETUP.md                   # 本文件
```

## 四、核心页面实现

### 1. /today 页面（核心执行页面）

**文件**: `app/today/page.tsx` + `components/today-view.tsx`

**功能**:
- 展示当前目标、阶段、今日唯一 Action
- 显示 Action 的完成标准
- 提供【完成】/【未完成】按钮
- 完成时记录难度（1-5）和精力（1-5）

**关键代码**:
```typescript
// 获取当前系统状态和 Action
const systemState = await getSystemState(user.id)
const action = await getActionWithRelations(systemState.current_action_id)

// 完成 Action 并推进
await completeActionAndAdvance(userId, actionId, difficulty, energy)
```

### 2. /goals 页面（规划页面）

**文件**: `app/goals/page.tsx` + `components/goals-view.tsx`

**功能**:
- 创建 Goal（目标）
- 为 Goal 创建 Phase（阶段）
- 为 Phase 创建 Action（行动单元）
- 设置当前目标

**关键代码**:
```typescript
// 创建 Goal
POST /api/goals { name, category, start_date, end_date }

// 创建 Phase（自动计算 order_index）
POST /api/phases { goal_id, name, description }

// 创建 Action（自动计算 order_index）
POST /api/actions { phase_id, title, definition, estimated_time }

// 设置当前目标（自动设置第一个 Phase 的第一个 Action）
POST /api/set-current-goal { goal_id }
```

### 3. /dashboard 页面（复盘页面）

**文件**: `app/dashboard/page.tsx` + `components/dashboard-view.tsx`

**功能**:
- 显示连续完成天数
- 每个 Goal 的推进进度（百分比）
- 识别卡住的阶段（超过 7 天未完成）

## 五、SystemState 推进逻辑

**文件**: `lib/system-state.ts`

### 核心函数

1. **getNextAction()**: 获取下一个 Action
   - 检查当前 Action 今天是否已完成
   - 如果未完成，返回 null（不能推进）
   - 如果已完成，返回下一个 Action
   - 如果当前 Phase 完成，返回下一个 Phase 的第一个 Action

2. **completeActionAndAdvance()**: 完成 Action 并推进
   - 记录今日执行（completed=true, difficulty, energy）
   - 调用 getNextAction() 获取下一个
   - 更新 SystemState

3. **markActionIncomplete()**: 标记未完成
   - 记录今日执行（completed=false）
   - 不推进系统状态

### 推进规则
- ✅ 只有今天完成的 Action 才能推进
- ✅ Action 必须按 order_index 顺序执行
- ✅ 未完成的 Action 会阻止推进
- ✅ Phase 完成后自动切换到下一个 Phase
- ✅ 所有 Phase 完成后，等待用户设置新目标

## 六、Zeabur 部署步骤

详细步骤见 `DEPLOYMENT.md`，简要流程：

1. **准备 Supabase**
   - 创建项目
   - 执行 `supabase/schema.sql`
   - 获取 URL 和 Anon Key

2. **准备 GitHub**
   - 推送代码到 GitHub

3. **Zeabur 部署**
   - 创建项目，连接 GitHub
   - 配置环境变量：
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - 部署（自动检测 Next.js）

4. **验证**
   - 访问 Zeabur 提供的域名
   - 测试注册/登录
   - 创建测试目标

## 七、本地开发

### 1. 安装依赖
```bash
npm install
```

### 2. 配置环境变量
创建 `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. 设置 Supabase
- 在 Supabase Dashboard 执行 `supabase/schema.sql`
- 确认 RLS 策略已启用

### 4. 运行开发服务器
```bash
npm run dev
```

访问 http://localhost:3000

## 八、使用流程

1. **注册/登录**: 访问 `/auth/login`
2. **创建目标**: 在 `/goals` 创建 Goal → Phase → Action
3. **设置当前目标**: 点击"设为当前目标"
4. **每日执行**: 在 `/today` 完成当日 Action
5. **查看复盘**: 在 `/dashboard` 查看进度

## 九、注意事项

⚠️ **重要约束**:
- 系统必须"约束用户执行"，而不是"服务用户记录"
- 每天只展示一个 Action
- 未完成不能推进下一步
- 所有设计必须可直接落地、可部署

✅ **已完成**:
- ✅ 3 个核心页面（today, goals, dashboard）
- ✅ 完整的数据库结构（5 个表）
- ✅ SystemState 推进逻辑
- ✅ API 路由（CRUD + 推进）
- ✅ 认证系统（Supabase Auth）
- ✅ RLS 安全策略

## 十、下一步

1. 运行 `npm install` 安装依赖
2. 配置 Supabase 并执行 SQL
3. 设置环境变量
4. 运行 `npm run dev` 开始开发
5. 部署到 Zeabur（参考 DEPLOYMENT.md）

---

所有代码已就绪，可以直接使用！

