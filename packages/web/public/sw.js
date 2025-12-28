// Service Worker for PWA
// 缓存策略：Network First for HTML pages, Cache First for static assets, Network First for API

const CACHE_NAME = 'pes-v4'
const STATIC_CACHE = 'pes-static-v4'
const API_CACHE = 'pes-api-v4'

// 需要缓存的静态资源
const STATIC_ASSETS = [
  '/',
  '/today',
  '/goals',
  '/dashboard',
  '/auth/login',
]

// 安装 Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
  self.skipWaiting()
})

// 监听消息（用于强制更新）
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// 激活 Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      // 清除所有旧版本的缓存
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('pes-') && name !== STATIC_CACHE && name !== API_CACHE)
          .map((name) => {
            console.log('删除旧缓存:', name)
            return caches.delete(name)
          })
      )
    }).then(() => {
      // 强制立即控制所有客户端
      return self.clients.claim()
    })
  )
})

// 拦截请求
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // API 请求：Network First 策略
  // 注意：只缓存 GET 请求，不缓存 POST、PUT、DELETE、PATCH 等修改性请求
  if (url.pathname.startsWith('/api/')) {
    // 对于非 GET 请求（POST、PUT、DELETE、PATCH 等），直接通过网络请求，不缓存
    if (request.method !== 'GET') {
      event.respondWith(fetch(request))
      return
    }

    // GET 请求使用 Network First 策略
    event.respondWith(
      fetch(request)
        .then((response) => {
          // 只缓存成功的 GET 响应
          if (response.status === 200 && response.ok) {
            const responseToCache = response.clone()
            caches.open(API_CACHE).then((cache) => {
              // 确保请求方法是 GET（Cache API 只支持 GET）
              if (request.method === 'GET') {
                cache.put(request, responseToCache).catch((err) => {
                  console.warn('Failed to cache API response:', err)
                })
              }
            })
          }
          return response
        })
        .catch(() => {
          // 网络失败，尝试从缓存获取（仅 GET 请求）
          return caches.match(request)
        })
    )
    return
  }

  // HTML 页面：Network First 策略（确保总是获取最新版本）
  if (request.method === 'GET' && request.headers.get('accept')?.includes('text/html')) {
    // 跳过非 http/https 协议的请求
    if (!url.protocol.startsWith('http')) {
      event.respondWith(fetch(request))
      return
    }

    event.respondWith(
      fetch(request)
        .then((response) => {
          // 只缓存成功的 HTML 响应
          if (response.status === 200 && response.ok) {
            const responseToCache = response.clone()
            caches.open(STATIC_CACHE).then((cache) => {
              // 确保是 http/https 协议
              if (url.protocol.startsWith('http')) {
                cache.put(request, responseToCache).catch((err) => {
                  console.warn('Failed to cache HTML response:', err)
                })
              }
            })
          }
          return response
        })
        .catch(() => {
          // 网络失败，尝试从缓存获取
          return caches.match(request)
        })
    )
    return
  }

  // 静态资源（JS、CSS、图片等）：Cache First 策略
  // 只处理 GET 请求
  if (request.method !== 'GET') {
    event.respondWith(fetch(request))
    return
  }

  // 跳过 chrome-extension 和其他非 http/https 协议的请求
  if (!url.protocol.startsWith('http')) {
    event.respondWith(fetch(request))
    return
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse
      }
      return fetch(request).then((response) => {
        // 只缓存成功的 GET 响应
        if (response.status === 200 && response.ok && request.method === 'GET') {
          const responseToCache = response.clone()
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(request, responseToCache).catch((err) => {
              console.warn('Failed to cache static resource:', err)
            })
          })
        }
        return response
      })
    })
  )
})

