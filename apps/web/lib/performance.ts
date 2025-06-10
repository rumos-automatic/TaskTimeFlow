// Performance monitoring utilities

declare global {
  interface Window {
    gtag?: (command: string, targetId: string, config?: any) => void
  }
}

// Web Vitals tracking
export function measureWebVitals() {
  if (typeof window === 'undefined') return

  // Track Core Web Vitals
  import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
    getCLS(sendToAnalytics)
    getFID(sendToAnalytics)
    getFCP(sendToAnalytics)
    getLCP(sendToAnalytics)
    getTTFB(sendToAnalytics)
  }).catch(error => {
    console.warn('Web Vitals could not be loaded:', error)
  })
}

function sendToAnalytics(metric: any) {
  // Send to Google Analytics if available
  if (window.gtag) {
    window.gtag('event', metric.name, {
      event_category: 'Web Vitals',
      event_label: metric.id,
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      non_interaction: true,
    })
  }

  // Send to Vercel Analytics
  if (typeof window !== 'undefined' && window.va) {
    window.va('track', 'Web Vitals', {
      metric: metric.name,
      value: metric.value,
      label: metric.id,
    })
  }

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Web Vital:', metric)
  }
}

// Performance observer for monitoring
export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private observers: PerformanceObserver[] = []

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  init() {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return
    }

    this.observeResourceTiming()
    this.observeNavigationTiming()
    this.observeLongTasks()
    this.observeLayoutShifts()
  }

  private observeResourceTiming() {
    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'resource') {
            this.logResourceTiming(entry as PerformanceResourceTiming)
          }
        })
      })
      
      observer.observe({ entryTypes: ['resource'] })
      this.observers.push(observer)
    } catch (error) {
      console.warn('Resource timing observation failed:', error)
    }
  }

  private observeNavigationTiming() {
    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'navigation') {
            this.logNavigationTiming(entry as PerformanceNavigationTiming)
          }
        })
      })
      
      observer.observe({ entryTypes: ['navigation'] })
      this.observers.push(observer)
    } catch (error) {
      console.warn('Navigation timing observation failed:', error)
    }
  }

  private observeLongTasks() {
    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'longtask') {
            this.logLongTask(entry)
          }
        })
      })
      
      observer.observe({ entryTypes: ['longtask'] })
      this.observers.push(observer)
    } catch (error) {
      console.warn('Long task observation failed:', error)
    }
  }

  private observeLayoutShifts() {
    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'layout-shift') {
            const layoutShift = entry as LayoutShift
            if (!layoutShift.hadRecentInput) {
              this.logLayoutShift(entry)
            }
          }
        })
      })
      
      observer.observe({ entryTypes: ['layout-shift'] })
      this.observers.push(observer)
    } catch (error) {
      console.warn('Layout shift observation failed:', error)
    }
  }

  private logResourceTiming(entry: PerformanceResourceTiming) {
    const duration = entry.duration
    const size = entry.transferSize || 0
    
    // Log slow resources
    if (duration > 1000) { // More than 1 second
      console.warn(`Slow resource: ${entry.name} took ${duration.toFixed(2)}ms (${this.formatBytes(size)})`)
    }
    
    // Track resource types
    if (process.env.NODE_ENV === 'development') {
      const resourceType = this.getResourceType(entry.name)
      console.log(`Resource: ${resourceType} - ${entry.name} - ${duration.toFixed(2)}ms`)
    }
  }

  private logNavigationTiming(entry: PerformanceNavigationTiming) {
    const metrics = {
      'DNS Lookup': entry.domainLookupEnd - entry.domainLookupStart,
      'TCP Connection': entry.connectEnd - entry.connectStart,
      'TLS Handshake': entry.requestStart - entry.secureConnectionStart,
      'Request': entry.responseStart - entry.requestStart,
      'Response': entry.responseEnd - entry.responseStart,
      'DOM Processing': entry.domComplete - entry.domLoading,
      'Load Event': entry.loadEventEnd - entry.loadEventStart,
    }

    if (process.env.NODE_ENV === 'development') {
      console.table(metrics)
    }

    // Track slow navigation
    const totalTime = entry.loadEventEnd - entry.navigationStart
    if (totalTime > 3000) { // More than 3 seconds
      console.warn(`Slow navigation: ${totalTime.toFixed(2)}ms`)
    }
  }

  private logLongTask(entry: PerformanceEntry) {
    console.warn(`Long task detected: ${entry.duration.toFixed(2)}ms at ${entry.startTime.toFixed(2)}ms`)
    
    // Send to analytics
    if (window.gtag) {
      window.gtag('event', 'long_task', {
        event_category: 'Performance',
        value: Math.round(entry.duration),
        non_interaction: true,
      })
    }
  }

  private logLayoutShift(entry: PerformanceEntry) {
    const layoutShift = entry as LayoutShift
    if (layoutShift.value > 0.1) { // Significant layout shift
      console.warn(`Layout shift detected: ${layoutShift.value.toFixed(4)}`)
    }
  }

  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'JavaScript'
    if (url.includes('.css')) return 'CSS'
    if (url.match(/\.(png|jpg|jpeg|gif|webp|svg)$/)) return 'Image'
    if (url.match(/\.(woff|woff2|ttf|eot)$/)) return 'Font'
    if (url.includes('/api/')) return 'API'
    return 'Other'
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  disconnect() {
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []
  }
}

// React component performance tracking
export function trackComponentRender(componentName: string, props?: any) {
  if (process.env.NODE_ENV === 'development') {
    const start = performance.now()
    
    return () => {
      const end = performance.now()
      const duration = end - start
      
      if (duration > 16) { // Longer than 1 frame at 60fps
        console.warn(`Slow component render: ${componentName} took ${duration.toFixed(2)}ms`, props)
      }
    }
  }
  
  return () => {} // No-op in production
}

// Intersection Observer for tracking visibility
export function createVisibilityTracker(element: Element, callback: (isVisible: boolean) => void) {
  if (!('IntersectionObserver' in window)) {
    callback(true) // Fallback
    return () => {}
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        callback(entry.isIntersecting)
      })
    },
    {
      threshold: 0.1,
      rootMargin: '50px'
    }
  )

  observer.observe(element)

  return () => observer.disconnect()
}

// Memory usage tracking
export function trackMemoryUsage() {
  if (typeof window === 'undefined' || !performance.memory) {
    return null
  }

  const memory = performance.memory
  
  return {
    usedJSHeapSize: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
    totalJSHeapSize: Math.round(memory.totalJSHeapSize / 1024 / 1024), // MB
    jsHeapSizeLimit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024), // MB
    usagePercentage: Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100)
  }
}

// Bundle size tracking
export function trackBundleSize() {
  if (typeof window === 'undefined') return

  // Track main bundle size
  const scripts = document.querySelectorAll('script[src*="_next/static"]')
  let totalSize = 0

  scripts.forEach(script => {
    const src = script.getAttribute('src')
    if (!src) return
    
    fetch(src)
      .then(response => {
        const size = parseInt(response.headers.get('content-length') || '0')
        totalSize += size
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`Bundle: ${script.getAttribute('src')} - ${(size / 1024).toFixed(2)} KB`)
        }
      })
      .catch(() => {
        // Ignore errors
      })
  })
}

// Initialize performance monitoring
export function initPerformanceMonitoring() {
  if (typeof window === 'undefined') return

  // Initialize Web Vitals
  measureWebVitals()
  
  // Initialize performance monitor
  const monitor = PerformanceMonitor.getInstance()
  monitor.init()
  
  // Track memory usage periodically
  if (process.env.NODE_ENV === 'development') {
    setInterval(() => {
      const memory = trackMemoryUsage()
      if (memory && memory.usagePercentage > 80) {
        console.warn(`High memory usage: ${memory.usagePercentage}% (${memory.usedJSHeapSize}MB)`)
      }
    }, 30000) // Check every 30 seconds
  }
  
  // Track bundle size
  trackBundleSize()
}

export default {
  measureWebVitals,
  PerformanceMonitor,
  trackComponentRender,
  createVisibilityTracker,
  trackMemoryUsage,
  trackBundleSize,
  initPerformanceMonitoring
}