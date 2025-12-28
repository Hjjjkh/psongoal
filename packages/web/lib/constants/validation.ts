/**
 * 默认验证限制（硬编码，作为后备值）
 */
const DEFAULT_VALIDATION_LIMITS = {
  // 待办事项
  MAX_TODO_CONTENT_LENGTH: 500,
  
  // 目标
  MAX_GOAL_NAME_LENGTH: 100,
  
  // 阶段
  MAX_PHASE_NAME_LENGTH: 100,
  MAX_PHASE_DESCRIPTION_LENGTH: 1000,
  
  // 行动
  MAX_ACTION_TITLE_LENGTH: 200,
  MAX_ACTION_DEFINITION_LENGTH: 1000,
  MAX_ACTION_ESTIMATED_TIME: 1440, // 分钟（24小时）
  MIN_ACTION_ESTIMATED_TIME: 1,
  
  // 批量操作
  MAX_BATCH_ACTIONS_COUNT: 1000,
} as const

/**
 * 输入验证常量（支持环境变量配置，实现自适应）
 * 
 * 使用方式：
 * 1. 默认值：使用 DEFAULT_VALIDATION_LIMITS 中的值
 * 2. 环境变量：可以通过环境变量覆盖（如 MAX_TODO_CONTENT_LENGTH=1000）
 * 3. 不同环境：可以根据 NODE_ENV 设置不同值
 * 
 * 示例 .env.local：
 * MAX_TODO_CONTENT_LENGTH=1000
 * MAX_GOAL_NAME_LENGTH=200
 */
export const VALIDATION_LIMITS = {
  // 待办事项 - 支持环境变量配置
  MAX_TODO_CONTENT_LENGTH: parseInt(
    process.env.MAX_TODO_CONTENT_LENGTH || 
    String(DEFAULT_VALIDATION_LIMITS.MAX_TODO_CONTENT_LENGTH),
    10
  ),
  
  // 目标 - 支持环境变量配置
  MAX_GOAL_NAME_LENGTH: parseInt(
    process.env.MAX_GOAL_NAME_LENGTH || 
    String(DEFAULT_VALIDATION_LIMITS.MAX_GOAL_NAME_LENGTH),
    10
  ),
  
  // 阶段
  MAX_PHASE_NAME_LENGTH: parseInt(
    process.env.MAX_PHASE_NAME_LENGTH || 
    String(DEFAULT_VALIDATION_LIMITS.MAX_PHASE_NAME_LENGTH),
    10
  ),
  MAX_PHASE_DESCRIPTION_LENGTH: parseInt(
    process.env.MAX_PHASE_DESCRIPTION_LENGTH || 
    String(DEFAULT_VALIDATION_LIMITS.MAX_PHASE_DESCRIPTION_LENGTH),
    10
  ),
  
  // 行动
  MAX_ACTION_TITLE_LENGTH: parseInt(
    process.env.MAX_ACTION_TITLE_LENGTH || 
    String(DEFAULT_VALIDATION_LIMITS.MAX_ACTION_TITLE_LENGTH),
    10
  ),
  MAX_ACTION_DEFINITION_LENGTH: parseInt(
    process.env.MAX_ACTION_DEFINITION_LENGTH || 
    String(DEFAULT_VALIDATION_LIMITS.MAX_ACTION_DEFINITION_LENGTH),
    10
  ),
  MAX_ACTION_ESTIMATED_TIME: parseInt(
    process.env.MAX_ACTION_ESTIMATED_TIME || 
    String(DEFAULT_VALIDATION_LIMITS.MAX_ACTION_ESTIMATED_TIME),
    10
  ),
  MIN_ACTION_ESTIMATED_TIME: parseInt(
    process.env.MIN_ACTION_ESTIMATED_TIME || 
    String(DEFAULT_VALIDATION_LIMITS.MIN_ACTION_ESTIMATED_TIME),
    10
  ),
  
  // 批量操作 - 根据环境改变（生产环境更严格）
  MAX_BATCH_ACTIONS_COUNT: process.env.NODE_ENV === 'production'
    ? parseInt(
        process.env.MAX_BATCH_ACTIONS_COUNT || 
        String(DEFAULT_VALIDATION_LIMITS.MAX_BATCH_ACTIONS_COUNT),
        10
      )
    : parseInt(
        process.env.MAX_BATCH_ACTIONS_COUNT || '5000',  // 开发环境允许更多
        10
      ),
} as const

/**
 * 错误消息常量
 */
export const ERROR_MESSAGES = {
  // 认证
  UNAUTHORIZED: 'Unauthorized',
  FORBIDDEN: 'Forbidden',
  
  // 资源
  NOT_FOUND: 'Resource not found',
  ALREADY_EXISTS: 'Resource already exists',
  
  // 输入验证
  INVALID_INPUT: 'Invalid input',
  CONTENT_TOO_LONG: 'Content too long',
  CONTENT_REQUIRED: 'Content is required',
  
  // 服务器
  INTERNAL_SERVER_ERROR: 'Internal server error',
  DATABASE_ERROR: 'Database error',
  
  // 业务逻辑
  INVALID_OPERATION: 'Invalid operation',
  OPERATION_FAILED: 'Operation failed',
} as const

/**
 * 用户友好的错误消息
 */
export const USER_FRIENDLY_ERRORS: Record<string, string> = {
  '42P01': '数据库表不存在，请联系管理员',
  '42501': '权限不足，请检查账户设置',
  '23505': '数据已存在，请勿重复创建',
  '23503': '关联数据不存在，请检查输入',
} as const

