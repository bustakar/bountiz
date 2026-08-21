import { useState } from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authClient } from '@/lib/auth-client'
import { getSession } from '@/lib/auth-functions'

export const Route = createFileRoute('/sign-in')({
  beforeLoad: async () => {
    if (await getSession()) throw redirect({ to: '/' })
  },
  component: SignInPage,
})

function SignInPage() {
  const navigate = useNavigate()
  const [register, setRegister] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    const result = register
      ? await authClient.signUp.email({ name, email, password })
      : await authClient.signIn.email({ email, password })
    setPending(false)
    if (result.error)
      return setError(result.error.message ?? 'Authentication failed')
    await navigate({ to: '/' })
  }

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            {register ? 'Create your account' : 'Sign in to Bountiz'}
          </CardTitle>
          <CardDescription>
            {register
              ? 'Create and manage performance-based creator campaigns.'
              : 'Open your campaigns and account.'}
          </CardDescription>
        </CardHeader>
        <form onSubmit={submit}>
          <CardContent className="grid gap-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {register && (
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={register ? 'new-password' : 'current-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
              />
            </div>
            <Button type="submit" disabled={pending}>
              {pending
                ? 'Please wait…'
                : register
                  ? 'Create account'
                  : 'Sign in'}
            </Button>
          </CardContent>
        </form>
        <CardFooter>
          <Button
            variant="link"
            className="h-auto p-0"
            onClick={() => setRegister((value) => !value)}
          >
            {register
              ? 'Already have an account? Sign in'
              : 'Need an account? Create one'}
          </Button>
        </CardFooter>
      </Card>
    </main>
  )
}
