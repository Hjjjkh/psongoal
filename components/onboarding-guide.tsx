'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Target, ArrowRight, CheckCircle2 } from 'lucide-react'

interface OnboardingGuideProps {
  onStart: () => void
  onDismiss: () => void
}

/**
 * 新用户引导组件
 * 帮助新用户快速了解如何使用系统
 */
export default function OnboardingGuide({ onStart, onDismiss }: OnboardingGuideProps) {
  const [currentStep, setCurrentStep] = useState(0)

  const steps = [
    {
      title: '欢迎使用目标执行系统',
      description: '这是一个专注于"强制执行"的个人目标管理系统，通过"每日唯一任务"机制，将长期目标拆解为可执行路径。\n\n💡 核心理念：每天只有一个必须完成的任务，但允许你用任何方式完成它。',
      icon: Target,
    },
    {
      title: '核心设计理念',
      description: '• 每日唯一任务：每天只有一个必须完成的任务，但可以包含多个行为\n• 完成标准明确：每个 Action 必须有客观可判断的完成标准（可包含多个行为）\n• 不可跳过：未完成的 Action 不能被跳过，必须完成才能推进\n• 阶段产出导向：强调阶段性的产出，而非零散的任务\n\n💡 例如健身：一个 Action 可以是"完成今日健身训练"，完成标准可以是"热身≥10分钟 + 训练≥40分钟 + 拉伸≥10分钟"',
      icon: CheckCircle2,
    },
    {
      title: '使用流程',
      description: '1. 创建目标：在规划页面创建 Goal、Phase、Action\n2. 设置当前目标：点击"设为当前目标"开始执行\n3. 每日执行：在今日页面完成当日 Action\n4. 查看复盘：在复盘页面查看进度和统计',
      icon: ArrowRight,
    },
  ]

  const currentStepData = steps[currentStep]
  const Icon = currentStepData.icon
  const isLastStep = currentStep === steps.length - 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <Card className="max-w-2xl w-full shadow-2xl border-2 border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
              <Icon className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-2xl">{currentStepData.title}</CardTitle>
            </div>
          </div>
          <CardDescription className="text-base whitespace-pre-line">
            {currentStepData.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 步骤指示器 */}
          <div className="flex items-center justify-center gap-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'w-8 bg-primary'
                    : index < currentStep
                    ? 'w-2 bg-primary/50'
                    : 'w-2 bg-muted'
                }`}
              />
            ))}
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3">
            {currentStep > 0 && (
              <Button
                variant="outline"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="flex-1"
              >
                上一步
              </Button>
            )}
            {!isLastStep ? (
              <Button
                onClick={() => setCurrentStep(currentStep + 1)}
                className="flex-1"
              >
                下一步
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={onDismiss}
                  className="flex-1"
                >
                  稍后了解
                </Button>
                <Button
                  onClick={onStart}
                  className="flex-1 bg-gradient-to-r from-primary to-primary/80"
                >
                  开始创建目标
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

