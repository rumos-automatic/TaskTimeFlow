'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Mail, Lock, Eye, EyeOff, User, CheckCircle } from 'lucide-react'

export function SignupForm() {
  const { signUp, signInWithOAuth, loading, error } = useAuth()
  const router = useRouter()
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [signupSuccess, setSignupSuccess] = useState(false)

  const passwordStrength = {
    length: formData.password.length >= 8,
    uppercase: /[A-Z]/.test(formData.password),
    lowercase: /[a-z]/.test(formData.password),
    number: /\d/.test(formData.password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password)
  }

  const isPasswordStrong = Object.values(passwordStrength).every(Boolean)
  const passwordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword.length > 0

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.email || !formData.password || !passwordsMatch || !acceptTerms) return

    setIsSubmitting(true)
    
    const { error: signupError } = await signUp({
      email: formData.email,
      password: formData.password,
      display_name: formData.displayName || undefined
    })
    
    if (!signupError) {
      setSignupSuccess(true)
    }
    
    setIsSubmitting(false)
  }

  const handleGoogleSignup = async () => {
    setIsSubmitting(true)
    
    const { error: oauthError } = await signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect=/dashboard`
      }
    })
    
    if (oauthError) {
      setIsSubmitting(false)
    }
  }

  if (signupSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-tasktime-50 to-blue-50">
        <Card className="w-full max-w-md glass-card">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto w-12 h-12 bg-success-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-success-600" />
            </div>
            <CardTitle className="text-2xl font-bold">
              アカウントが作成されました！
            </CardTitle>
            <CardDescription>
              確認メールを送信しました。メールをチェックしてアカウントを有効化してください。
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="text-center text-sm text-gray-600">
              メールが届かない場合は、迷惑メールフォルダもご確認ください。
            </div>
          </CardContent>

          <CardFooter>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push('/login')}
            >
              ログインページに戻る
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-tasktime-50 to-blue-50">
      <Card className="w-full max-w-md glass-card">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            TaskTimeFlow に登録
          </CardTitle>
          <CardDescription className="text-center">
            アカウントを作成して生産性を向上させましょう
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleEmailSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">表示名 (オプション)</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="displayName"
                  type="text"
                  placeholder="田中太郎"
                  value={formData.displayName}
                  onChange={(e) => handleInputChange('displayName', e.target.value)}
                  className="pl-10"
                  disabled={isSubmitting || loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@example.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="pl-10"
                  required
                  disabled={isSubmitting || loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="パスワードを入力"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="pl-10 pr-10"
                  required
                  disabled={isSubmitting || loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={isSubmitting || loading}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
              
              {formData.password && (
                <div className="text-xs space-y-1">
                  <div className={`flex items-center space-x-1 ${passwordStrength.length ? 'text-success-600' : 'text-gray-400'}`}>
                    <CheckCircle className="w-3 h-3" />
                    <span>8文字以上</span>
                  </div>
                  <div className={`flex items-center space-x-1 ${passwordStrength.uppercase ? 'text-success-600' : 'text-gray-400'}`}>
                    <CheckCircle className="w-3 h-3" />
                    <span>大文字を含む</span>
                  </div>
                  <div className={`flex items-center space-x-1 ${passwordStrength.lowercase ? 'text-success-600' : 'text-gray-400'}`}>
                    <CheckCircle className="w-3 h-3" />
                    <span>小文字を含む</span>
                  </div>
                  <div className={`flex items-center space-x-1 ${passwordStrength.number ? 'text-success-600' : 'text-gray-400'}`}>
                    <CheckCircle className="w-3 h-3" />
                    <span>数字を含む</span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">パスワード確認</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="パスワードを再入力"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className="pl-10 pr-10"
                  required
                  disabled={isSubmitting || loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={isSubmitting || loading}
                >
                  {showConfirmPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
              {formData.confirmPassword && !passwordsMatch && (
                <p className="text-xs text-danger-600">パスワードが一致しません</p>
              )}
              {passwordsMatch && formData.confirmPassword && (
                <p className="text-xs text-success-600">パスワードが一致しています</p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="terms"
                checked={acceptTerms}
                onCheckedChange={setAcceptTerms}
                disabled={isSubmitting || loading}
              />
              <Label htmlFor="terms" className="text-sm">
                <Link href="/terms" className="text-tasktime-600 hover:text-tasktime-800 underline">
                  利用規約
                </Link>
                と
                <Link href="/privacy" className="text-tasktime-600 hover:text-tasktime-800 underline">
                  プライバシーポリシー
                </Link>
                に同意する
              </Label>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={
                isSubmitting || 
                loading || 
                !formData.email || 
                !isPasswordStrong || 
                !passwordsMatch || 
                !acceptTerms
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  アカウント作成中...
                </>
              ) : (
                'アカウントを作成'
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">または</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignup}
            disabled={isSubmitting || loading}
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            Google でサインアップ
          </Button>
        </CardContent>

        <CardFooter>
          <div className="text-center text-sm text-gray-600 w-full">
            既にアカウントをお持ちの場合{' '}
            <Link 
              href="/login" 
              className="text-tasktime-600 hover:text-tasktime-800 font-medium transition-colors"
            >
              ログイン
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}

export default SignupForm