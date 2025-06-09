// Service Worker for TaskTimeFlow PWA
const CACHE_NAME = 'tasktimeflow-v1.0.0'
const STATIC_CACHE_NAME = 'tasktimeflow-static-v1.0.0'
const DYNAMIC_CACHE_NAME = 'tasktimeflow-dynamic-v1.0.0'

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/tasks',
  '/timeline',
  '/pomodoro',
  '/analytics',
  '/settings',
  '/offline',
  '/_next/static/css/app/layout.css',
  '/_next/static/chunks/main.js',
  '/_next/static/chunks/webpack.js',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
]

// Assets that should always be fetched from network
const NETWORK_ONLY = [
  '/api/',
  '/auth/',
  '/_next/webpack-hmr'
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...')
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching static assets')
        return cache.addAll(STATIC_ASSETS)
      })
      .catch(error => {
        console.error('[SW] Cache failed:', error)
      })
  )
  
  // Skip waiting to activate immediately
  self.skipWaiting()
})

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...')
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(cacheName => {
            return cacheName !== STATIC_CACHE_NAME && 
                   cacheName !== DYNAMIC_CACHE_NAME
          })
          .map(cacheName => {
            console.log('[SW] Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          })
      )
    })
  )
  
  // Take control of all clients
  self.clients.claim()
})

// Fetch event - handle requests with cache strategies
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }
  
  // Skip chrome extension requests
  if (url.protocol === 'chrome-extension:') {
    return
  }
  
  // Network only for API calls and auth
  if (NETWORK_ONLY.some(path => url.pathname.startsWith(path))) {
    event.respondWith(networkOnly(request))
    return
  }
  
  // Cache first for static assets
  if (STATIC_ASSETS.includes(url.pathname) || url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request))
    return
  }
  
  // Stale while revalidate for pages
  if (request.mode === 'navigate' || (request.method === 'GET' && request.headers.get('accept').includes('text/html'))) {
    event.respondWith(staleWhileRevalidate(request))
    return
  }
  
  // Default to network first
  event.respondWith(networkFirst(request))
})

// Cache strategies
async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    
    const networkResponse = await fetch(request)
    if (networkResponse.status === 200) {
      const cache = await caches.open(STATIC_CACHE_NAME)
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    console.error('[SW] Cache first failed:', error)
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' })
  }
}

async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request)
    if (networkResponse.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME)
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url)
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlinePage = await caches.match('/offline')
      if (offlinePage) {
        return offlinePage
      }
    }
    
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' })
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE_NAME)
  const cachedResponse = await cache.match(request)
  
  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.status === 200) {
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  }).catch(() => {
    // Network failed, return cached version if available
    return cachedResponse
  })
  
  // Return cached version immediately if available, otherwise wait for network
  return cachedResponse || fetchPromise
}

async function networkOnly(request) {
  try {
    return await fetch(request)
  } catch (error) {
    // For API requests, return error response
    return new Response(
      JSON.stringify({ error: 'Network unavailable', offline: true }), 
      { 
        status: 503, 
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag)
  
  if (event.tag === 'background-sync-tasks') {
    event.waitUntil(syncOfflineActions())
  }
})

async function syncOfflineActions() {
  try {
    // Get offline actions from IndexedDB
    const offlineActions = await getOfflineActions()
    
    for (const action of offlineActions) {
      try {
        const response = await fetch(action.url, {
          method: action.method,
          headers: action.headers,
          body: action.body
        })
        
        if (response.ok) {
          await removeOfflineAction(action.id)
          console.log('[SW] Synced offline action:', action.id)
        }
      } catch (error) {
        console.error('[SW] Failed to sync action:', action.id, error)
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error)
  }
}

// Push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event)
  
  const options = {
    body: event.data ? event.data.text() : 'New notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    tag: 'tasktimeflow-notification',
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/icons/action-view.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/action-dismiss.png'
      }
    ]
  }
  
  event.waitUntil(
    self.registration.showNotification('TaskTimeFlow', options)
  )
})

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click:', event.notification.tag, event.action)
  
  event.notification.close()
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    )
  }
})

// Message handler for client communication
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data)
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  
  if (event.data && event.data.type === 'GET_CACHE_NAMES') {
    event.ports[0].postMessage({
      type: 'CACHE_NAMES',
      cacheNames: [STATIC_CACHE_NAME, DYNAMIC_CACHE_NAME]
    })
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.delete(DYNAMIC_CACHE_NAME).then(() => {
        event.ports[0].postMessage({ type: 'CACHE_CLEARED' })
      })
    )
  }
})

// Utility functions for IndexedDB operations
async function getOfflineActions() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('TaskTimeFlowDB', 1)
    
    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction(['offlineActions'], 'readonly')
      const store = transaction.objectStore('offlineActions')
      const getAllRequest = store.getAll()
      
      getAllRequest.onsuccess = () => {
        resolve(getAllRequest.result || [])
      }
      
      getAllRequest.onerror = () => {
        reject(getAllRequest.error)
      }
    }
    
    request.onerror = () => {
      reject(request.error)
    }
  })
}

async function removeOfflineAction(id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('TaskTimeFlowDB', 1)
    
    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction(['offlineActions'], 'readwrite')
      const store = transaction.objectStore('offlineActions')
      const deleteRequest = store.delete(id)
      
      deleteRequest.onsuccess = () => {
        resolve()
      }
      
      deleteRequest.onerror = () => {
        reject(deleteRequest.error)
      }
    }
    
    request.onerror = () => {
      reject(request.error)
    }
  })
}