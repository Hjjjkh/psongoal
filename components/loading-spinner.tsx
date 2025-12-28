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
    <div className="min-h-screen flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="text-center space-y-4">
        <div className="relative">
          <div className={`animate-spin rounded-full border-4 border-primary/20 mx-auto ${sizeClasses[size]}`}></div>
          <div className={`animate-spin rounded-full border-4 border-transparent border-t-primary absolute top-0 left-1/2 -translate-x-1/2 ${sizeClasses[size]}`}></div>
        </div>
        <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
      </div>
    </div>
  )
}

