# Zeabur 环境变量配置

## 📋 需要在 Zeabur 中配置的环境变量

登录 [Zeabur Dashboard](https://zeabur.com)，进入你的项目设置，添加以下环境变量：

### 必需的环境变量

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_SITE_URL=https://psongoal.zeabur.app
```

### 配置步骤

1. 登录 Zeabur Dashboard
2. 选择你的项目
3. 进入 **Settings** → **Environment Variables**
4. 添加上述三个环境变量
5. 点击 **Save** 保存
6. 重新部署项目（Zeabur 会自动触发）

### 重要提示

- `NEXT_PUBLIC_SITE_URL` 必须设置为 `https://psongoal.zeabur.app`，用于 Supabase Auth 邮件验证链接
- 如果不设置 `NEXT_PUBLIC_SITE_URL`，代码会使用默认值，但建议显式配置
- 修改环境变量后，Zeabur 会自动重新部署

### 验证配置

配置完成后，让朋友重新注册，检查收到的确认邮件：
- ✅ 链接应该指向 `https://psongoal.zeabur.app/auth/callback`
- ❌ 不应该再出现 `localhost:3000`

