# 个人目标执行系统 (Personal Execution System, PES)

一个专注于"强制执行"的个人目标管理系统，通过"每日唯一承诺"机制，将长期目标拆解为可执行路径。

## ✨ 核心特性

- 🎯 **每日唯一承诺**: 每天只要求一次承诺，强制聚焦
- 📊 **多阶段模板**: 支持多阶段目标模板，快速创建复杂目标
- 📈 **复盘看板**: 完整的统计和趋势分析，数据独立存储
- 🔔 **提醒系统**: 浏览器通知提醒，提高完成率
- 💾 **数据管理**: 支持数据导出/导入，一键清空数据
- 📱 **PWA 支持**: 可安装到设备，离线使用
- 🔒 **多用户支持**: 完整的多用户隔离架构
- 🎨 **现代化 UI**: 美观的界面设计，流畅的交互体验
- ⚡ **性能优化**: 乐观更新、防抖、重试机制，提升用户体验
- 🛡️ **类型安全**: 完整的 TypeScript 类型定义，减少错误

## 🏗️ 技术栈

- **前端框架**: Next.js 14 (App Router)
- **UI 组件**: shadcn/ui + Tailwind CSS
- **认证**: Supabase Auth (SSR)
- **后端/数据库**: Supabase (PostgreSQL)
- **状态管理**: React Server Components
- **类型安全**: TypeScript
- **部署**: Zeabur / Vercel

## 🎯 核心设计理念

1. **每日唯一承诺**: 系统每天只要求用户兑现一次承诺，强制聚焦，但允许一个承诺包含多个行为
2. **完成标准明确**: 每个 Action 必须有客观可判断的完成标准
3. **不可跳过**: 未完成的 Action 不能被跳过，必须完成才能推进
4. **阶段产出导向**: 强调阶段性的产出，而非零散的任务

**核心理念说明**：
- 系统限制的是"承诺数量"（一天一个），而不是"行为数量"
- 一个 Action 可以包含多个现实行为，但只有一个"完成判断"
- 例如健身：Action = "完成今日健身训练"，完成标准 = "热身≥10分钟 + 训练≥40分钟 + 拉伸≥10分钟"

## 📋 核心功能

### 1. 今日行动 (`/today`)
- 展示当前目标、阶段、今日唯一 Action
- 显示 Action 的完成标准
- 提供【完成】/【未完成】按钮
- 完成时记录难度和精力状态
- 可选专注计时器

### 2. 专注空间 (`/focus`)
- 显示今日主线 Action（未完成时）
- 显示代办任务列表
- 可选择任务开始专注（可选）
- 可直接标记完成（不强制使用计时器）
- 25分钟番茄钟计时器

### 3. 目标规划 (`/goals`)
- 创建 Goal（目标）
- 为 Goal 创建 Phase（阶段）
- 为 Phase 创建 Action（行动）
- 设置当前目标
- 支持使用多阶段模板快速创建

### 4. 复盘看板 (`/dashboard`)
- 显示连续完成天数
- 每个 Goal 的推进进度
- 识别卡住的阶段（超过 7 天未完成）
- 行动历史记录
- 完成率趋势图表
- 难度和精力统计

### 5. 模板库 (`/templates`)
- 行动模板管理（个人模板）
- 目标模板管理（系统模板 + 个人模板）
- 支持多阶段模板
- 支持创建、编辑、删除模板
- 支持初始化默认模板
- 支持自定义分类

### 6. 设置 (`/settings`)
- 提醒设置（每日提醒时间）
- 数据导出/导入（JSON 格式）
- 一键清空所有数据（保留账户）
- 账户信息
- 关于信息

## 🚀 快速开始

### 本地开发

#### 1. 克隆仓库
```bash
git clone https://github.com/your-username/psongoal.git
cd psongoal
```

#### 2. 安装依赖
```bash
npm install
```

#### 3. 配置 Supabase

1. 在 [Supabase](https://supabase.com) 创建项目
2. 在 SQL Editor 中**按顺序**执行以下迁移文件：
   ```sql
   -- 1. 行动模板
   supabase/migration_add_action_templates.sql
   
   -- 2. 目标模板（单阶段）
   supabase/migration_add_goal_templates.sql
   
   -- 3. 多阶段模板支持（重要！）
   supabase/migration_add_multi_phase_templates.sql
   
   -- 4. 代办事项
   supabase/migration_add_todos.sql
   
   -- 5. 专注会话
   supabase/migration_add_focus_sessions.sql
   
   -- 6. 复盘数据独立性（推荐）
   supabase/migration_preserve_review_data.sql
   ```

3. 创建 `.env.local` 文件：
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# 可选：自定义验证限制
# NEXT_PUBLIC_MAX_TODO_CONTENT_LENGTH=500
# NEXT_PUBLIC_MAX_GOAL_NAME_LENGTH=100
```

#### 4. 运行开发服务器
```bash
npm run dev
```

访问 http://localhost:3000

#### 5. 构建生产版本
```bash
npm run build
npm start
```

## 🌐 部署

### Zeabur 部署

#### 1. 准备环境变量
在 Zeabur 项目设置中添加：
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase 项目 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase Legacy Anon Key（或新的 Publishable Key）

#### 2. 连接 GitHub 仓库
1. 在 [Zeabur](https://zeabur.com) 创建新项目
2. 选择 "Deploy from GitHub"
3. 选择你的仓库

#### 3. 配置构建
- **Framework Preset**: Next.js（自动检测）
- **Build Command**: `npm run build`（默认）
- **Output Directory**: `.next`（默认）

#### 4. 部署
Zeabur 会自动检测 Next.js 项目并配置，点击部署即可。

### Vercel 部署

1. 导入 GitHub 仓库
2. 配置环境变量（同上）
3. 自动部署

## 📊 数据库结构

### 核心实体
1. **Goal（目标）**: 长期目标，如"练出腹肌"
2. **Phase（阶段）**: 目标的执行阶段，如"核心力量阶段"
3. **Action（行动单元）**: 可执行的行动，如"核心训练 Day 3"
4. **DailyExecution（每日执行记录）**: 记录每日完成情况
5. **SystemState（系统状态）**: 每个用户独立的状态记录
6. **ActionTemplate（行动模板）**: 个人行动模板
7. **GoalTemplate（目标模板）**: 系统/个人目标模板，支持多阶段
8. **Todo（代办事项）**: 记忆容器，7天后自动清理
9. **FocusSession（专注会话）**: 专注计时记录

### 数据安全
- ✅ **Row Level Security (RLS)**: 所有表都启用了 RLS
- ✅ **用户隔离**: 每个用户只能访问自己的数据
- ✅ **API 验证**: 所有 API 路由都验证用户身份

详细 SQL 见 `supabase/` 目录下的迁移文件。

## 🔐 多用户支持

项目完全支持多人同时使用：

- ✅ **三层隔离**: 数据库层（RLS）+ API 层（用户验证）+ 前端层（Session）
- ✅ **无共享状态**: 所有数据按 `user_id` 隔离
- ✅ **并发安全**: 支持大量并发用户
- ✅ **系统模板**: 所有用户共享（只读），个人模板完全隔离

详细说明见 `MULTI_USER_ARCHITECTURE.md`

## 📁 项目结构

```
psongoal/
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   ├── auth/              # 认证页面
│   ├── today/             # 今日行动页面
│   ├── goals/             # 目标规划页面
│   ├── dashboard/         # 复盘看板页面
│   ├── focus/             # 专注空间页面
│   ├── templates/         # 模板库页面
│   └── settings/          # 设置页面
├── components/            # React 组件
│   ├── ui/               # shadcn/ui 基础组件
│   └── *.tsx             # 业务组件
├── lib/                   # 工具函数和配置
│   ├── core/             # 核心业务逻辑
│   ├── features/         # 功能模块逻辑
│   ├── utils/            # 工具函数
│   ├── constants/        # 常量定义（验证限制、错误消息）
│   └── supabase/        # Supabase 客户端
├── hooks/                # React Hooks
├── supabase/             # 数据库迁移文件
└── public/               # 静态资源
```

## 🔄 系统状态推进逻辑

核心逻辑在 `lib/core/system-state.ts`：

1. **完成检查**: 只有今天完成的 Action 才能推进
2. **顺序推进**: 按 `order_index` 顺序推进 Action
3. **阶段切换**: 当前 Phase 完成后，自动切换到下一个 Phase 的第一个 Action
4. **目标完成**: 所有 Phase 完成后，系统状态保持不变，等待用户设置新目标

## 💡 使用流程

1. **注册/登录**: 访问 `/auth/login`
2. **创建目标**: 在 `/goals` 页面创建 Goal、Phase、Action，或使用模板快速创建
3. **设置当前目标**: 点击"设为当前目标"
4. **每日执行**: 
   - 在 `/today` 页面完成当日 Action
   - 或在 `/focus` 专注空间中完成（可选使用专注计时器）
5. **处理代办**: 在 `/focus` 专注空间中处理代办事项（可选）
6. **查看复盘**: 在 `/dashboard` 查看进度和统计
7. **管理模板**: 在 `/templates` 管理行动和目标模板
8. **系统设置**: 在 `/settings` 配置提醒、导出/导入数据

## 🛠️ 开发指南

### 添加新功能
1. 在 `app/api/` 下创建新的 API 路由
2. 在 `components/` 下创建对应的 UI 组件
3. 更新 `lib/core/types.ts` 添加新的类型定义（如需要）
4. 确保所有数据库操作都通过 RLS 策略保护

### 数据库迁移
1. 在 `supabase/` 目录下创建新的 SQL 迁移文件
2. 在 Supabase Dashboard 的 SQL Editor 中执行
3. 确保所有迁移文件按顺序执行

### 必需迁移文件（按顺序执行）
1. `migration_add_action_templates.sql` - 行动模板
2. `migration_add_goal_templates.sql` - 目标模板（单阶段）
3. `migration_add_multi_phase_templates.sql` - **多阶段模板支持（重要！）**
4. `migration_add_todos.sql` - 代办事项
5. `migration_add_focus_sessions.sql` - 专注会话
6. `migration_preserve_review_data.sql` - **复盘数据独立性（推荐）**

## 🎨 最新更新 (v2.1)

### 功能改进
- ✅ **复盘数据独立性**: 执行记录独立存储，删除目标/阶段/行动不影响历史数据
- ✅ **排序优化**: 拖拽排序支持防抖、重试、乐观更新，提升用户体验
- ✅ **批量操作优化**: 批量删除支持并发处理，提供详细反馈
- ✅ **常量系统**: 集中管理验证限制和错误消息，支持环境变量配置
- ✅ **认证工具**: 统一的认证工具函数，减少代码重复
- ✅ **Hydration 修复**: 修复了 React hydration 错误，提升稳定性

### 用户体验优化
- ✅ **乐观更新**: 创建、删除、排序操作立即反馈，无需等待服务器响应
- ✅ **错误恢复**: 操作失败时自动回滚，保持数据一致性
- ✅ **加载状态**: 完善的加载状态提示，提升用户体验
- ✅ **错误提示**: 友好的错误消息，帮助用户理解问题

### 代码质量
- ✅ **类型安全**: 完善的 TypeScript 类型定义
- ✅ **错误处理**: 统一的错误处理机制
- ✅ **代码规范**: 统一的代码风格和最佳实践

## 📝 注意事项

- ✅ 系统使用 Row Level Security (RLS)，用户只能访问自己的数据
- ✅ 每个用户有独立的 SystemState
- ✅ Action 必须按顺序完成，不能跳过
- ✅ 未完成的 Action 会阻止系统推进
- ✅ 确保使用 `@supabase/ssr@^0.8.0` 或更高版本
- ✅ 复盘数据独立存储，删除目标不影响历史统计

## 📄 许可证

MIT

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**版本**: v2.1  
**最后更新**: 2024-12-20
