'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Sparkles, Trophy } from 'lucide-react'

interface CompletionAnimationProps {
  onComplete: () => void
  isGoalCompleted?: boolean
}

/**
 * 完成行动动画组件
 * 提供视觉反馈和成就感
 */
export default function CompletionAnimation({ onComplete, isGoalCompleted = false }: CompletionAnimationProps) {
  const [show, setShow] = useState(true)
  const [phase, setPhase] = useState<'explode' | 'fade' | 'done'>('explode')

  useEffect(() => {
    // 第一阶段：爆炸效果
    const timer1 = setTimeout(() => {
      setPhase('fade')
    }, 800)

    // 第二阶段：淡出
    const timer2 = setTimeout(() => {
      setPhase('done')
      setTimeout(() => {
        setShow(false)
        onComplete()
      }, 300)
    }, 2000)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [onComplete])

  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className={`relative transition-all duration-500 ${
        phase === 'explode' 
          ? 'scale-150 opacity-100' 
          : phase === 'fade'
          ? 'scale-100 opacity-100'
          : 'scale-75 opacity-0'
      }`}>
        {/* 主图标 */}
        <div className="relative">
          {isGoalCompleted ? (
            <Trophy className="w-32 h-32 text-yellow-500 animate-bounce" />
          ) : (
            <CheckCircle2 className="w-32 h-32 text-green-500 animate-bounce" />
          )}
          
          {/* 装饰性星星 */}
          {phase === 'explode' && (
            <>
              {[...Array(12)].map((_, i) => {
                const angle = (i * 30) * (Math.PI / 180)
                const distance = 80
                const x = Math.cos(angle) * distance
                const y = Math.sin(angle) * distance
                return (
                  <Sparkles
                    key={i}
                    className="w-6 h-6 text-yellow-400 absolute animate-pulse"
                    style={{
                      left: `calc(50% + ${x}px)`,
                      top: `calc(50% + ${y}px)`,
                      transform: 'translate(-50%, -50%)',
                      animationDelay: `${i * 50}ms`,
                    }}
                  />
                )
              })}
            </>
          )}
        </div>

        {/* 文字提示 */}
        <div className={`mt-8 text-center transition-all duration-500 ${
          phase === 'explode' ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
        }`}>
          <h2 className="text-4xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent mb-2">
            {isGoalCompleted ? '🎉 目标已完成！' : '✅ 行动已完成！'}
          </h2>
          <p className="text-lg text-muted-foreground">
            {isGoalCompleted ? '恭喜你坚持完成了这个目标！' : '继续保持这个节奏！'}
          </p>
        </div>
      </div>
    </div>
  )
}

