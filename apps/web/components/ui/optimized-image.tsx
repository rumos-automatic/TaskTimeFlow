'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
  lazy?: boolean
  placeholder?: 'blur' | 'empty'
  blurDataURL?: string
  quality?: number
  sizes?: string
  onLoad?: () => void
  onError?: () => void
  fallback?: string
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  lazy = true,
  placeholder = 'blur',
  blurDataURL,
  quality = 75,
  sizes,
  onLoad,
  onError,
  fallback = '/images/placeholder.jpg'
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [isVisible, setIsVisible] = useState(!lazy || priority)
  const imgRef = useRef<HTMLDivElement>(null)

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || priority || isVisible) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      {
        rootMargin: '50px',
        threshold: 0.1
      }
    )

    const currentRef = imgRef.current
    if (currentRef) {
      observer.observe(currentRef)
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef)
      }
    }
  }, [lazy, priority, isVisible])

  const handleLoad = () => {
    setIsLoading(false)
    onLoad?.()
  }

  const handleError = () => {
    setHasError(true)
    setIsLoading(false)
    onError?.()
  }

  // Generate blur data URL if not provided
  const getBlurDataURL = () => {
    if (blurDataURL) return blurDataURL
    
    // Simple base64 encoded 1x1 pixel transparent image
    return 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=='
  }

  return (
    <div
      ref={imgRef}
      className={cn(
        'relative overflow-hidden',
        isLoading && 'animate-pulse bg-gray-200',
        className
      )}
      style={{ width, height }}
    >
      {isVisible && (
        <>
          {!hasError ? (
            <Image
              src={src}
              alt={alt}
              width={width}
              height={height}
              priority={priority}
              quality={quality}
              placeholder={placeholder}
              blurDataURL={getBlurDataURL()}
              sizes={sizes}
              onLoad={handleLoad}
              onError={handleError}
              className={cn(
                'transition-opacity duration-300',
                isLoading ? 'opacity-0' : 'opacity-100'
              )}
              style={{
                objectFit: 'cover',
                objectPosition: 'center'
              }}
            />
          ) : (
            <Image
              src={fallback}
              alt={`Failed to load: ${alt}`}
              width={width}
              height={height}
              className="opacity-50"
              style={{
                objectFit: 'cover',
                objectPosition: 'center'
              }}
            />
          )}

          {/* Loading skeleton */}
          {isLoading && !hasError && (
            <div className="absolute inset-0 bg-gray-200 animate-pulse">
              <div className="w-full h-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-shimmer" />
            </div>
          )}
        </>
      )}

      {/* Lazy loading placeholder */}
      {!isVisible && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-gray-400 text-sm">Loading...</div>
        </div>
      )}
    </div>
  )
}

// Avatar component with optimized image loading
interface AvatarProps {
  src?: string
  alt: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  fallback?: string
  className?: string
}

export function Avatar({ 
  src, 
  alt, 
  size = 'md', 
  fallback, 
  className 
}: AvatarProps) {
  const [hasError, setHasError] = useState(false)

  const sizeMap = {
    sm: { width: 32, height: 32 },
    md: { width: 48, height: 48 },
    lg: { width: 64, height: 64 },
    xl: { width: 96, height: 96 }
  }

  const dimensions = sizeMap[size]

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div
      className={cn(
        'relative rounded-full overflow-hidden bg-gray-200 flex items-center justify-center',
        className
      )}
      style={dimensions}
    >
      {src && !hasError ? (
        <OptimizedImage
          src={src}
          alt={alt}
          width={dimensions.width}
          height={dimensions.height}
          onError={() => setHasError(true)}
          className="rounded-full"
          quality={90}
          priority={size === 'lg' || size === 'xl'} // Prioritize larger avatars
        />
      ) : (
        <div className="text-gray-600 font-medium text-sm">
          {fallback || getInitials(alt)}
        </div>
      )}
    </div>
  )
}

// Lazy loading component for any content
interface LazyLoadProps {
  children: React.ReactNode
  className?: string
  threshold?: number
  rootMargin?: string
  fallback?: React.ReactNode
}

export function LazyLoad({ 
  children, 
  className, 
  threshold = 0.1,
  rootMargin = '50px',
  fallback 
}: LazyLoadProps) {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold, rootMargin }
    )

    const currentRef = ref.current
    if (currentRef) {
      observer.observe(currentRef)
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef)
      }
    }
  }, [threshold, rootMargin])

  return (
    <div ref={ref} className={className}>
      {isVisible ? children : (fallback || <div className="animate-pulse bg-gray-200 rounded" />)}
    </div>
  )
}

// Progressive image loading with multiple sources
interface ProgressiveImageProps {
  lowQualitySrc: string
  highQualitySrc: string
  alt: string
  width?: number
  height?: number
  className?: string
}

export function ProgressiveImage({
  lowQualitySrc,
  highQualitySrc,
  alt,
  width,
  height,
  className
}: ProgressiveImageProps) {
  const [highQualityLoaded, setHighQualityLoaded] = useState(false)
  const [lowQualityLoaded, setLowQualityLoaded] = useState(false)

  return (
    <div className={cn('relative', className)} style={{ width, height }}>
      {/* Low quality image */}
      <Image
        src={lowQualitySrc}
        alt={alt}
        width={width}
        height={height}
        onLoad={() => setLowQualityLoaded(true)}
        className={cn(
          'absolute inset-0 transition-opacity duration-300',
          highQualityLoaded ? 'opacity-0' : 'opacity-100'
        )}
        style={{ filter: 'blur(5px)', transform: 'scale(1.1)' }}
      />

      {/* High quality image */}
      {lowQualityLoaded && (
        <Image
          src={highQualitySrc}
          alt={alt}
          width={width}
          height={height}
          onLoad={() => setHighQualityLoaded(true)}
          className={cn(
            'absolute inset-0 transition-opacity duration-500',
            highQualityLoaded ? 'opacity-100' : 'opacity-0'
          )}
        />
      )}
    </div>
  )
}

export default OptimizedImage