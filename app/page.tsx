'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { WorkspaceNew } from '@/components/workspace/workspace-new'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // URLからエラーパラメータをクリア
    if (window.location.search.includes('error=auth_callback_failed')) {
      console.log('Clearing auth error from URL')
      router.replace('/', { scroll: false })
    }
  }, [router])

  return <WorkspaceNew />
}