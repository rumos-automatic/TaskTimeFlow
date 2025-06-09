import { Metadata } from 'next'
import SignupForm from '@/components/auth/SignupForm'

export const metadata: Metadata = {
  title: 'サインアップ | TaskTimeFlow',
  description: 'TaskTimeFlowでアカウントを作成して、生産性を向上させましょう。',
}

export default function SignupPage() {
  return <SignupForm />
}