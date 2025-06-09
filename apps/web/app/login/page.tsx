import { Metadata } from 'next'
import LoginForm from '@/components/auth/LoginForm'

export const metadata: Metadata = {
  title: 'ログイン | TaskTimeFlow',
  description: 'TaskTimeFlowにログインして、生産性を向上させましょう。',
}

export default function LoginPage() {
  return <LoginForm />
}