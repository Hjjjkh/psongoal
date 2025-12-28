# 移动端 App 和小程序准备文档

## 📋 文档概述

本文档旨在为将 PES（个人目标执行系统）扩展到移动端（iOS/Android App 和微信小程序）提供全面的技术准备和规划指导。

**版本**: v1.0  
**创建日期**: 2024-12-20  
**适用项目**: PES v2.1+

---

## 🎯 目标

### 短期目标（3-6个月）
- ✅ 完成 API 标准化和文档化
- ✅ 实现统一的认证机制
- ✅ 建立移动端开发环境
- ✅ 完成核心功能的最小可行产品（MVP）

### 长期目标（6-12个月）
- ✅ iOS/Android 原生 App 发布
- ✅ 微信小程序上线
- ✅ 多端数据同步
- ✅ 离线功能支持

---

## 📊 当前架构分析

### 1. 技术栈现状

#### 前端
- **框架**: Next.js 14 (App Router)
- **UI 库**: shadcn/ui + Tailwind CSS
- **状态管理**: React Server Components
- **类型**: TypeScript
- **图表**: Recharts
- **拖拽**: @dnd-kit

#### 后端
- **数据库**: Supabase (PostgreSQL)
- **认证**: Supabase Auth
- **API**: Next.js API Routes
- **存储**: Supabase Storage（如需要）

#### 核心特性
- ✅ 多用户隔离（RLS）
- ✅ 服务端渲染（SSR）
- ✅ 客户端状态管理
- ✅ PWA 支持

### 2. API 架构分析

#### API 端点概览

**目标管理**
- `GET /api/goals` - 获取目标列表
- `POST /api/goals` - 创建目标
- `GET /api/goals/[id]` - 获取目标详情
- `PATCH /api/goals/[id]` - 更新目标
- `DELETE /api/goals/[id]` - 删除目标
- `POST /api/goals/[id]/status` - 更新目标状态
- `POST /api/goals/create-from-template` - 从模板创建目标
- `POST /api/set-current-goal` - 设置当前目标

**阶段管理**
- `GET /api/phases` - 获取阶段列表
- `POST /api/phases` - 创建阶段
- `GET /api/phases/[id]` - 获取阶段详情
- `PATCH /api/phases/[id]` - 更新阶段
- `DELETE /api/phases/[id]` - 删除阶段
- `POST /api/phases/reorder` - 重新排序阶段

**行动管理**
- `GET /api/actions` - 获取行动列表
- `POST /api/actions` - 创建行动
- `GET /api/actions/[id]` - 获取行动详情
- `PATCH /api/actions/[id]` - 更新行动
- `DELETE /api/actions/[id]` - 删除行动
- `POST /api/actions/batch` - 批量操作
- `POST /api/actions/reorder` - 重新排序行动
- `POST /api/complete-action` - 完成行动
- `POST /api/mark-incomplete` - 标记未完成

**执行记录**
- `GET /api/daily-executions` - 获取执行记录（通过 Supabase 直接查询）

**模板管理**
- `GET /api/action-templates` - 获取行动模板
- `POST /api/action-templates` - 创建行动模板
- `GET /api/goal-templates` - 获取目标模板
- `POST /api/goal-templates` - 创建目标模板
- `POST /api/goal-templates/init-defaults` - 初始化默认模板

**代办事项**
- `GET /api/todos` - 获取代办列表
- `POST /api/todos` - 创建代办
- `PATCH /api/todos/[id]` - 更新代办
- `DELETE /api/todos/[id]` - 删除代办
- `POST /api/todos/check` - 检查代办
- `POST /api/todos/cleanup` - 清理过期代办

**专注会话**
- `GET /api/focus-sessions` - 获取专注会话
- `POST /api/focus-sessions` - 创建专注会话
- `GET /api/focus-sessions/[id]` - 获取会话详情
- `POST /api/focus-sessions/check` - 检查会话状态

**数据管理**
- `GET /api/export` - 导出数据
- `POST /api/import` - 导入数据
- `DELETE /api/data/clear-all` - 清空所有数据

**设置**
- `GET /api/reminder-settings` - 获取提醒设置
- `POST /api/reminder-settings` - 更新提醒设置

#### API 特点
- ✅ RESTful 设计
- ✅ 统一的错误处理
- ✅ 用户认证（Supabase Auth）
- ✅ 类型安全（TypeScript）
- ✅ 统一的响应格式

### 3. 数据模型

#### 核心实体
```typescript
- Goal (目标)
- Phase (阶段)
- Action (行动)
- DailyExecution (每日执行记录)
- SystemState (系统状态)
- ActionTemplate (行动模板)
- GoalTemplate (目标模板)
- Todo (代办事项)
- FocusSession (专注会话)
```

#### 关系
- Goal 1:N Phase
- Phase 1:N Action
- Action 1:N DailyExecution
- User 1:1 SystemState
- User 1:N ActionTemplate
- User 1:N GoalTemplate

---

## 🛠️ 移动端技术选型

### 1. 原生 App 开发

#### iOS
**推荐方案**: React Native 或 Flutter
- **React Native**: 
  - ✅ 与现有 React 技术栈一致
  - ✅ 代码复用率高
  - ✅ 社区活跃
  - ⚠️ 需要学习原生桥接
  
- **Flutter**:
  - ✅ 性能优秀
  - ✅ UI 一致性高
  - ⚠️ 需要学习 Dart
  - ⚠️ 代码复用率较低

**备选方案**: Swift + SwiftUI（原生开发）
- ✅ 性能最佳
- ✅ 原生体验
- ⚠️ 需要单独开发
- ⚠️ 维护成本高

#### Android
**推荐方案**: React Native 或 Flutter（与 iOS 统一）
- 与 iOS 使用相同技术栈，实现跨平台开发

### 2. 微信小程序

**推荐方案**: 原生小程序开发
- ✅ 官方支持
- ✅ 性能稳定
- ✅ 生态完善
- ⚠️ 需要学习小程序框架

**备选方案**: uni-app / Taro
- ✅ 跨平台（小程序 + App）
- ✅ 代码复用
- ⚠️ 性能可能略逊于原生

### 3. 推荐技术栈组合

#### 方案 A: React Native（推荐）
```
- React Native (iOS + Android)
- React Native Paper / NativeBase (UI 组件)
- React Query / SWR (数据获取)
- React Navigation (路由)
- Supabase JS Client (API 调用)
- TypeScript (类型安全)
```

**优点**:
- ✅ 与现有技术栈一致
- ✅ 代码复用率高（70-80%）
- ✅ 社区支持好
- ✅ 热更新支持

**缺点**:
- ⚠️ 需要处理原生模块
- ⚠️ 性能略逊于原生

#### 方案 B: Flutter
```
- Flutter (iOS + Android)
- Material Design / Cupertino (UI)
- Provider / Riverpod (状态管理)
- Supabase Dart Client (API 调用)
- Dart (语言)
```

**优点**:
- ✅ 性能优秀
- ✅ UI 一致性高
- ✅ 单代码库

**缺点**:
- ⚠️ 需要学习 Dart
- ⚠️ 与现有代码复用率低（30-40%）

#### 方案 C: 混合方案
```
- React Native (App)
- 原生小程序 (微信小程序)
- 共享 API 层
```

**优点**:
- ✅ 各平台最优体验
- ✅ 技术栈灵活

**缺点**:
- ⚠️ 维护成本高
- ⚠️ 代码复用率中等（50-60%）

---

## 🔌 API 兼容性分析

### 1. 当前 API 兼容性

#### ✅ 完全兼容
- 所有 REST API 端点
- JSON 请求/响应格式
- Supabase Auth 认证
- 错误处理机制

#### ⚠️ 需要适配
- **Cookie 认证**: 移动端需要使用 Token 认证
- **文件上传**: 需要支持移动端文件选择
- **推送通知**: 需要移动端推送服务
- **离线支持**: 需要本地存储和同步机制

### 2. 认证机制适配

#### 当前实现（Web）
```typescript
// 使用 Cookie 存储 Session
const supabase = createServerClient(url, key, {
  cookies: {
    getAll() { return cookieStore.getAll() },
    setAll(cookiesToSet) { /* ... */ }
  }
})
```

#### 移动端适配
```typescript
// 使用 Token 存储
const supabase = createClient(url, key, {
  auth: {
    storage: AsyncStorage, // React Native
    // 或
    storage: SecureStorage, // 安全存储
  }
})
```

**需要修改**:
- ✅ 使用 `@supabase/supabase-js` 客户端（而非 SSR）
- ✅ Token 存储在安全存储中
- ✅ 实现 Token 刷新机制
- ✅ 处理 Token 过期

### 3. API 响应格式标准化

#### 当前格式
```typescript
// 成功
{ data: {...} }

// 错误
{ error: "错误消息", details?: "详细信息" }
```

#### 建议标准化
```typescript
// 统一响应格式
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: string
  }
  timestamp: string
}
```

**需要修改**:
- ✅ 统一所有 API 响应格式
- ✅ 添加错误代码
- ✅ 添加时间戳
- ✅ 版本控制（可选）

---

## 📱 UI/UX 适配方案

### 1. 设计原则

#### 移动端优先
- ✅ 触摸友好的交互
- ✅ 大按钮和点击区域
- ✅ 手势支持
- ✅ 响应式布局

#### 一致性
- ✅ 保持品牌风格
- ✅ 统一的颜色系统
- ✅ 一致的交互模式
- ✅ 相同的功能逻辑

### 2. 页面适配

#### 今日行动 (`/today`)
**Web 版本**:
- 大卡片展示
- 详细信息
- 多个操作按钮

**移动端适配**:
- ✅ 全屏展示
- ✅ 大按钮设计
- ✅ 简化信息展示
- ✅ 滑动操作（可选）

#### 目标规划 (`/goals`)
**Web 版本**:
- 树形结构
- 拖拽排序
- 批量操作

**移动端适配**:
- ✅ 列表/卡片视图
- ✅ 长按菜单
- ✅ 滑动操作
- ✅ 简化批量操作

#### 复盘看板 (`/dashboard`)
**Web 版本**:
- 多列布局
- 图表展示
- 详细信息

**移动端适配**:
- ✅ 单列滚动
- ✅ 简化图表
- ✅ 可展开详情
- ✅ 手势导航

#### 专注空间 (`/focus`)
**Web 版本**:
- 计时器
- 任务列表
- 操作按钮

**移动端适配**:
- ✅ 全屏计时器
- ✅ 手势控制
- ✅ 后台运行
- ✅ 通知提醒

### 3. 组件库选择

#### React Native
- **React Native Paper**: Material Design
- **NativeBase**: 跨平台组件
- **React Native Elements**: 通用组件

#### Flutter
- **Material Design**: 官方组件
- **Cupertino**: iOS 风格
- **Flutter Hooks**: 状态管理

#### 小程序
- **WeUI**: 微信官方组件
- **Vant Weapp**: 第三方组件库

---

## 🔄 数据同步策略

### 1. 同步架构

#### 在线优先
```
移动端 → API → Supabase
         ↓
    本地缓存（可选）
```

#### 离线优先（推荐）
```
移动端 → 本地存储 → 后台同步 → Supabase
         ↓
    冲突解决
```

### 2. 本地存储方案

#### React Native
- **AsyncStorage**: 简单键值存储
- **Realm**: 本地数据库
- **WatermelonDB**: 高性能数据库
- **SQLite**: 轻量级数据库

#### Flutter
- **SharedPreferences**: 简单存储
- **Hive**: 轻量级数据库
- **SQLite**: 本地数据库
- **Isar**: 高性能数据库

#### 小程序
- **Storage API**: 本地存储
- **云数据库**: 微信云开发

### 3. 同步策略

#### 实时同步
- ✅ 在线时实时同步
- ✅ WebSocket 连接（可选）
- ✅ 推送通知

#### 后台同步
- ✅ 定期同步（每 5-10 分钟）
- ✅ 应用启动时同步
- ✅ 网络恢复时同步

#### 冲突解决
- ✅ 最后写入获胜（Last Write Wins）
- ✅ 时间戳比较
- ✅ 用户确认（重要操作）

### 4. 离线功能

#### 核心功能（必须离线）
- ✅ 查看今日行动
- ✅ 标记完成/未完成
- ✅ 查看历史记录
- ✅ 查看目标列表

#### 次要功能（可在线）
- ✅ 创建新目标
- ✅ 编辑目标
- ✅ 查看统计
- ✅ 模板管理

---

## 📋 功能迁移计划

### 阶段 1: 基础准备（1-2个月）

#### API 标准化
- [ ] 统一 API 响应格式
- [ ] 添加 API 版本控制
- [ ] 完善 API 文档（OpenAPI/Swagger）
- [ ] 实现 Token 认证
- [ ] 添加请求限流

#### 开发环境
- [ ] 搭建 React Native / Flutter 项目
- [ ] 配置开发工具
- [ ] 建立 CI/CD 流程
- [ ] 设置测试环境

#### 基础功能
- [ ] 用户认证
- [ ] 数据同步
- [ ] 基础 UI 组件
- [ ] 导航系统

### 阶段 2: 核心功能（2-3个月）

#### MVP 功能
- [ ] 今日行动页面
- [ ] 目标列表页面
- [ ] 完成行动功能
- [ ] 基础统计展示

#### 数据同步
- [ ] 实现离线存储
- [ ] 实现后台同步
- [ ] 处理冲突解决
- [ ] 添加同步状态提示

### 阶段 3: 完整功能（3-4个月）

#### 完整功能
- [ ] 目标规划（创建/编辑）
- [ ] 阶段管理
- [ ] 行动管理
- [ ] 复盘看板
- [ ] 模板管理
- [ ] 设置页面

#### 优化
- [ ] 性能优化
- [ ] 动画效果
- [ ] 手势支持
- [ ] 推送通知

### 阶段 4: 小程序（1-2个月）

#### 微信小程序
- [ ] 小程序项目搭建
- [ ] 核心功能迁移
- [ ] 微信登录集成
- [ ] 小程序审核准备

---

## 🚀 开发路线图

### Q1 (1-3月)
- ✅ API 标准化
- ✅ 开发环境搭建
- ✅ 基础功能开发
- ✅ 内部测试

### Q2 (4-6月)
- ✅ 完整功能开发
- ✅ 性能优化
- ✅ Beta 测试
- ✅ App Store 准备

### Q3 (7-9月)
- ✅ 正式发布 iOS/Android
- ✅ 小程序开发
- ✅ 用户反馈收集
- ✅ 迭代优化

### Q4 (10-12月)
- ✅ 小程序上线
- ✅ 功能增强
- ✅ 数据分析
- ✅ 规划下一版本

---

## 🔧 技术挑战和解决方案

### 1. 认证机制

#### 挑战
- Web 使用 Cookie，移动端需要使用 Token
- Token 刷新机制
- 安全存储

#### 解决方案
- ✅ 使用 Supabase Auth Token
- ✅ 实现自动刷新
- ✅ 使用安全存储（Keychain/Keystore）

### 2. 数据同步

#### 挑战
- 离线数据存储
- 冲突解决
- 同步性能

#### 解决方案
- ✅ 使用本地数据库（Realm/WatermelonDB）
- ✅ 实现乐观更新
- ✅ 后台同步队列
- ✅ 增量同步

### 3. 推送通知

#### 挑战
- 跨平台推送
- 后台运行
- 用户权限

#### 解决方案
- ✅ 使用 Firebase Cloud Messaging (FCM)
- ✅ 使用 Apple Push Notification (APNs)
- ✅ 小程序使用微信推送
- ✅ 统一推送服务

### 4. 性能优化

#### 挑战
- 列表渲染性能
- 图片加载
- 动画流畅度

#### 解决方案
- ✅ 虚拟列表（FlatList/ListView）
- ✅ 图片懒加载
- ✅ 使用原生动画
- ✅ 代码分割

### 5. 跨平台一致性

#### 挑战
- iOS/Android 差异
- 小程序限制
- UI 一致性

#### 解决方案
- ✅ 使用跨平台组件库
- ✅ 平台特定适配
- ✅ 设计系统统一
- ✅ 测试覆盖

---

## 📝 准备工作清单

### 1. API 准备

- [ ] **API 文档化**
  - [ ] 生成 OpenAPI/Swagger 文档
  - [ ] 编写 API 使用指南
  - [ ] 添加请求/响应示例

- [ ] **API 标准化**
  - [ ] 统一响应格式
  - [ ] 添加错误代码
  - [ ] 实现版本控制

- [ ] **认证适配**
  - [ ] Token 认证实现
  - [ ] 刷新机制
  - [ ] 安全存储

- [ ] **测试**
  - [ ] API 单元测试
  - [ ] 集成测试
  - [ ] 性能测试

### 2. 开发环境

- [ ] **项目搭建**
  - [ ] React Native / Flutter 项目初始化
  - [ ] 依赖安装
  - [ ] 开发工具配置

- [ ] **CI/CD**
  - [ ] 构建流程
  - [ ] 自动化测试
  - [ ] 发布流程

- [ ] **开发工具**
  - [ ] 代码格式化
  - [ ] 类型检查
  - [ ] 调试工具

### 3. 设计准备

- [ ] **设计系统**
  - [ ] 颜色规范
  - [ ] 字体规范
  - [ ] 组件规范
  - [ ] 交互规范

- [ ] **UI 设计**
  - [ ] 移动端设计稿
  - [ ] 小程序设计稿
  - [ ] 图标资源
  - [ ] 启动画面

### 4. 数据准备

- [ ] **数据模型**
  - [ ] 本地数据模型定义
  - [ ] 同步策略设计
  - [ ] 冲突解决规则

- [ ] **存储方案**
  - [ ] 选择本地数据库
  - [ ] 实现存储层
  - [ ] 迁移脚本

### 5. 功能准备

- [ ] **核心功能**
  - [ ] 功能优先级排序
  - [ ] MVP 功能清单
  - [ ] 功能依赖关系

- [ ] **测试准备**
  - [ ] 测试用例编写
  - [ ] 测试数据准备
  - [ ] 测试环境搭建

### 6. 发布准备

- [ ] **应用商店**
  - [ ] App Store 账号
  - [ ] Google Play 账号
  - [ ] 应用图标和截图
  - [ ] 应用描述

- [ ] **小程序**
  - [ ] 微信小程序账号
  - [ ] 小程序认证
  - [ ] 小程序审核准备

---

## 📚 推荐资源

### 文档
- [React Native 官方文档](https://reactnative.dev/)
- [Flutter 官方文档](https://flutter.dev/)
- [微信小程序文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)
- [Supabase 移动端文档](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native)

### 工具
- **API 文档**: Swagger UI / Postman
- **设计工具**: Figma / Sketch
- **测试工具**: Jest / Detox
- **分析工具**: Firebase Analytics / Mixpanel

### 社区
- React Native 社区
- Flutter 社区
- Supabase 社区
- 微信小程序开发者社区

---

## 🎯 成功指标

### 技术指标
- ✅ API 响应时间 < 500ms
- ✅ 应用启动时间 < 2s
- ✅ 崩溃率 < 0.1%
- ✅ 同步成功率 > 99%

### 用户体验
- ✅ 应用评分 > 4.5
- ✅ 日活跃用户增长
- ✅ 用户留存率 > 60%
- ✅ 功能使用率

### 业务指标
- ✅ 用户注册转化率
- ✅ 目标完成率
- ✅ 用户满意度
- ✅ 功能使用频率

---

## 📞 联系和支持

### 开发团队
- **后端**: API 开发和维护
- **移动端**: App 和小程序开发
- **设计**: UI/UX 设计
- **测试**: 质量保证

### 技术支持
- **文档**: 本文档和相关技术文档
- **问题反馈**: GitHub Issues
- **社区**: 开发者社区

---

## 📄 附录

### A. API 端点完整列表
（见上方 API 架构分析部分）

### B. 数据模型完整定义
（见 `lib/core/types.ts`）

### C. 环境变量配置
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# 移动端特定
MOBILE_API_BASE_URL=
MOBILE_API_VERSION=v1
```

### D. 参考项目
- [Supabase React Native Example](https://github.com/supabase/supabase/tree/master/examples/user-management/react-native-user-management)
- [React Native Paper Example](https://github.com/callstack/react-native-paper)
- [Flutter Supabase Example](https://github.com/supabase/supabase-flutter)

---

**文档维护**: 本文档应随项目发展持续更新  
**最后更新**: 2024-12-20  
**版本**: v1.0

