'use client'

import { useEffect } from 'react'

/**
 * Service Worker 注册组件
 * 在客户端注册 Service Worker，并处理更新
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // 先注销所有现有的 Service Worker
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister()
        })
      })

      // 等待一小段时间后重新注册
      setTimeout(() => {
        navigator.serviceWorker
          .register('/sw.js', { updateViaCache: 'none' })
          .then((registration) => {
            console.log('Service Worker 注册成功:', registration.scope)
            
            // 检查更新
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // 新版本已安装，立即激活
                    newWorker.postMessage({ type: 'SKIP_WAITING' })
                    window.location.reload()
                  }
                })
              }
            })

            // 定期检查更新（每小时）
            setInterval(() => {
              registration.update()
            }, 3600000)
          })
          .catch((error) => {
            console.error('Service Worker 注册失败:', error)
          })
      }, 100)
    }
  }, [])

  return null
}

