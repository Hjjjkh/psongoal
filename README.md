# 个人目标执行系统 (Personal Execution System, PES)

一个专注于"强制执行"的个人目标管理系统，通过"每日唯一行动"机制，将长期目标拆解为可执行路径。

## 系统架构

### 技术栈
- **前端**: Next.js 14 (App Router)
- **UI**: shadcn/ui + Tailwind CSS
- **后端/数据库**: Supabase (PostgreSQL)
- **部署**: Zeabur

### 核心设计理念
1. **每日唯一行动**: 系统每天只展示一个 Action，强制用户聚焦
2. **完成标准明确**: 每个 Action 必须有客观可判断的完成标准
3. **不可跳过**: 未完成的 Action 不能被跳过，必须完成才能推进
4. **阶段产出导向**: 强调阶段性的产出，而非零散的任务

## 数据库结构

### 核心实体
1. **Goal（目标）**: 长期目标，如"练出腹肌"
2. **Phase（阶段）**: 目标的执行阶段，如"核心力量阶段"
3. **Action（行动单元）**: 可执行的行动，如"核心训练 Day 3"
4. **DailyExecution（每日执行记录）**: 记录每日完成情况
5. **SystemState（系统状态）**: 单行表，记录当前执行位置

详细 SQL 见 `supabase/schema.sql`

## 项目结构

```
psongoal/
├── app/
│   ├── api/              # API 路由
│   │   ├── complete-action/
│   │   ├── mark-incomplete/
│   │   ├── goals/
│   │   ├── phases/
│   │   ├── actions/
│   │   └── set-current-goal/
│   ├── auth/             # 认证页面
│   │   └── login/
│   ├── today/            # 今日行动页面（核心）
│   ├── goals/            # 目标规划页面
│   ├── dashboard/        # 复盘看板页面
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── ui/               # shadcn/ui 组件
│   ├── today-view.tsx
│   ├── goals-view.tsx
│   └── dashboard-view.tsx
├── lib/
│   ├── supabase/         # Supabase 客户端
│   ├── system-state.ts   # 系统状态推进逻辑（核心）
│   └── types.ts
├── supabase/
│   └── schema.sql        # 数据库表结构
└── package.json
```

## 核心功能

### 1. /today 页面（核心执行页面）
- 展示当前目标、阶段、今日唯一 Action
- 显示 Action 的完成标准
- 提供【完成】/【未完成】按钮
- 完成时记录难度和精力状态

### 2. /goals 页面（规划页面）
- 创建 Goal
- 为 Goal 创建 Phase
- 为 Phase 创建 Action
- 设置当前目标

### 3. /dashboard 页面（复盘页面）
- 显示连续完成天数
- 每个 Goal 的推进进度
- 识别卡住的阶段（超过 7 天未完成）

## 系统状态推进逻辑

核心逻辑在 `lib/system-state.ts` 中：

1. **完成检查**: 只有今天完成的 Action 才能推进
2. **顺序推进**: 按 order_index 顺序推进 Action
3. **阶段切换**: 当前 Phase 完成后，自动切换到下一个 Phase 的第一个 Action
4. **目标完成**: 所有 Phase 完成后，系统状态保持不变，等待用户设置新目标

## 本地开发

### 1. 安装依赖
```bash
npm install
```

### 2. 配置 Supabase
1. 在 Supabase 创建项目
2. 在 SQL Editor 中执行 `supabase/schema.sql`
3. 创建 `.env.local` 文件：
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. 运行开发服务器
```bash
npm run dev
```

访问 http://localhost:3000

## Zeabur 部署

### 1. 准备环境变量
在 Zeabur 项目设置中添加：
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase 项目 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase Anon Key

### 2. 连接 GitHub 仓库
1. 在 Zeabur 创建新项目
2. 选择 "Deploy from GitHub"
3. 选择你的仓库

### 3. 配置构建
- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`

### 4. 部署
Zeabur 会自动检测 Next.js 项目并配置，点击部署即可。

### 5. 域名配置（可选）
在 Zeabur 项目设置中配置自定义域名。

## 使用流程

1. **注册/登录**: 访问 `/auth/login`
2. **创建目标**: 在 `/goals` 页面创建 Goal、Phase、Action
3. **设置当前目标**: 点击"设为当前目标"
4. **每日执行**: 在 `/today` 页面完成当日 Action
5. **查看复盘**: 在 `/dashboard` 查看进度和统计

## 注意事项

- 系统使用 Row Level Security (RLS)，用户只能访问自己的数据
- 每个用户有独立的 SystemState
- Action 必须按顺序完成，不能跳过
- 未完成的 Action 会阻止系统推进

## 许可证

MIT

