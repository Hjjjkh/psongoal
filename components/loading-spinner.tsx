/**
 * 通用加载状态组件
 * 用于页面和组件的加载状态显示
 */
export default function LoadingSpinner({ 
  message = '加载中...',
  size = 'md'
}: { 
  message?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-2">
        <div className={`animate-spin rounded-full border-b-2 border-primary mx-auto ${sizeClasses[size]}`}></div>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}

