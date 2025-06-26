'use client'

import { useState, useEffect, useCallback } from 'react'

export type ViewType = 'tasks' | 'timeline' | 'focus'
export type ViewMode = 'mobile' | 'desktop' | 'desktop-focus'

interface ViewState {
  currentView: ViewType
  viewMode: ViewMode
  isMobile: boolean
}

export function useViewState() {
  const [viewState, setViewState] = useState<ViewState>({
    currentView: 'timeline',
    viewMode: 'mobile',
    isMobile: false
  })

  // レスポンシブブレークポイント検出
  useEffect(() => {
    const checkBreakpoint = () => {
      const isMobile = window.innerWidth < 768
      
      setViewState(prev => ({
        ...prev,
        isMobile,
        viewMode: isMobile ? 'mobile' : 
                 prev.currentView === 'focus' ? 'desktop-focus' : 'desktop'
      }))
    }

    checkBreakpoint()
    window.addEventListener('resize', checkBreakpoint)
    return () => window.removeEventListener('resize', checkBreakpoint)
  }, [])

  const setCurrentView = useCallback((view: ViewType) => {
    setViewState(prev => ({
      ...prev,
      currentView: view,
      viewMode: prev.isMobile ? 'mobile' : 
               view === 'focus' ? 'desktop-focus' : 'desktop'
    }))
  }, [])

  const nextView = useCallback(() => {
    const views: ViewType[] = ['tasks', 'timeline', 'focus']
    const currentIndex = views.indexOf(viewState.currentView)
    const nextIndex = (currentIndex + 1) % views.length
    setCurrentView(views[nextIndex])
  }, [viewState.currentView, setCurrentView])

  const prevView = useCallback(() => {
    const views: ViewType[] = ['tasks', 'timeline', 'focus']
    const currentIndex = views.indexOf(viewState.currentView)
    const prevIndex = (currentIndex - 1 + views.length) % views.length
    setCurrentView(views[prevIndex])
  }, [viewState.currentView, setCurrentView])

  // キーボードショートカット
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case '1':
            event.preventDefault()
            setCurrentView('tasks')
            break
          case '2':
            event.preventDefault()
            setCurrentView('timeline')
            break
          case '3':
            event.preventDefault()
            setCurrentView('focus')
            break
        }
      }
      
      // 矢印キーでの切り替え（フォーカスモード以外）
      if (!viewState.isMobile && viewState.currentView !== 'focus') {
        switch (event.key) {
          case 'ArrowLeft':
            event.preventDefault()
            prevView()
            break
          case 'ArrowRight':
            event.preventDefault()
            nextView()
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [viewState.isMobile, viewState.currentView, nextView, prevView, setCurrentView])

  return {
    ...viewState,
    setCurrentView,
    nextView,
    prevView
  }
}