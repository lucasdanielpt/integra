'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel } from '@/components/ui/field'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { PhoneCall, RotateCcw, Home, Monitor, Users, Lock, LogOut } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'

interface QueueState {
  currentTicket: number
  lastTicket: number
  currentTicketInfo?: {
    id: number
    name: string
    cpf: string
  } | null
}

function LoginForm({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      const data = await response.json()

      if (data.success) {
        onLogin()
      } else {
        setError(data.error || 'Senha incorreta')
      }
    } catch {
      setError('Erro de conexão')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Image
              src="/logo-integra.png"
              alt="Clínica Íntegra"
              width={80}
              height={80}
              className="rounded-full"
            />
          </div>
          <CardTitle className="text-2xl">Área Administrativa</CardTitle>
          <CardDescription>
            Digite a senha para acessar o painel de controle
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="password">Senha</FieldLabel>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite a senha"
                  className="pl-10"
                  autoFocus
                />
              </div>
            </Field>

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">
                {error}
              </div>
            )}

            <Button type="submit" disabled={isLoading || !password} className="h-12">
              {isLoading ? (
                <>
                  <Spinner className="mr-2" />
                  Verificando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>

            <Link href="/" className="text-center">
              <Button variant="ghost" type="button" className="text-muted-foreground">
                <Home className="mr-2 h-4 w-4" />
                Voltar para Início
              </Button>
            </Link>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}

function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [queue, setQueue] = useState<QueueState>({
    currentTicket: 0,
    lastTicket: 0,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const fetchQueue = useCallback(async () => {
    try {
      const response = await fetch('/api/queue')
      const data = await response.json()
      setQueue(data)
    } catch {
      console.error('Erro ao buscar fila')
    }
  }, [])

  useEffect(() => {
    fetchQueue()
    const interval = setInterval(fetchQueue, 3000)
    return () => clearInterval(interval)
  }, [fetchQueue])

  const callNext = async () => {
    setIsLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'call' }),
      })

      const data = await response.json()

      if (response.ok) {
        setQueue(data)
        const info = data.ticket_info as
          | { id: number; name: string; cpf: string }
          | undefined
        setMessage(
          info
            ? `Senha ${String(data.called).padStart(3, '0')} chamada! (${info.name} • CPF ${info.cpf})`
            : `Senha ${String(data.called).padStart(3, '0')} chamada!`
        )
      } else {
        setMessage(data.error)
      }
    } catch {
      setMessage('Erro de conexão')
    } finally {
      setIsLoading(false)
    }
  }

  const resetQueue = async () => {
    setIsLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      })

      const data = await response.json()

      if (response.ok) {
        setQueue(data)
        setMessage('Fila zerada com sucesso!')
      }
    } catch {
      setMessage('Erro de conexão')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      })
      onLogout()
    } catch {
      console.error('Erro ao sair')
    }
  }

  const waitingCount = queue.lastTicket - queue.currentTicket

  return (
    <main className="min-h-screen flex flex-col items-center p-6 bg-background">
      <div className="w-full max-w-2xl flex flex-col gap-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Image
              src="/logo-integra.png"
              alt="Clínica Íntegra"
              width={60}
              height={60}
              className="rounded-full"
            />
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                Administração
              </h1>
              <p className="text-sm text-muted-foreground">
                Gerenciamento de Filas
              </p>
            </div>
          </div>

          <nav className="flex gap-2">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <Home className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/painel">
              <Button variant="ghost" size="icon">
                <Monitor className="h-5 w-5" />
              </Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Sair">
              <LogOut className="h-5 w-5" />
            </Button>
          </nav>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Senha Atual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-primary">
                {queue.currentTicket === 0
                  ? '---'
                  : String(queue.currentTicket).padStart(3, '0')}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Última Senha
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-foreground">
                {queue.lastTicket === 0
                  ? '---'
                  : String(queue.lastTicket).padStart(3, '0')}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Aguardando
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-foreground">
                {waitingCount}
              </div>
            </CardContent>
          </Card>
        </div>

        {message && (
          <div className="p-4 rounded-lg bg-muted text-center text-foreground">
            {message}
          </div>
        )}

        {queue.currentTicketInfo && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Paciente da Senha Atual
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              <div className="text-base font-semibold text-foreground">
                {queue.currentTicketInfo.name}
              </div>
              <div className="text-sm text-muted-foreground">
                CPF: {queue.currentTicketInfo.cpf}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-6 flex flex-col gap-4">
            <Button
              onClick={callNext}
              disabled={isLoading || waitingCount === 0}
              size="lg"
              className="h-20 text-xl font-semibold"
            >
              <PhoneCall className="mr-3 h-7 w-7" />
              Chamar Próxima Senha
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  disabled={isLoading}
                  className="h-12"
                >
                  <RotateCcw className="mr-2 h-5 w-5" />
                  Zerar Fila
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar Ação</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja zerar a fila? Esta ação não pode ser
                    desfeita e todas as senhas serão perdidas.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={resetQueue}>
                    Confirmar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Os dados são atualizados automaticamente a cada 3 segundos
        </p>
      </div>
    </main>
  )
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth')
        const data = await response.json()
        setIsAuthenticated(data.authenticated)
      } catch {
        setIsAuthenticated(false)
      }
    }

    checkAuth()
  }, [])

  if (isAuthenticated === null) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <Spinner className="h-8 w-8 text-primary" />
      </main>
    )
  }

  if (!isAuthenticated) {
    return <LoginForm onLogin={() => setIsAuthenticated(true)} />
  }

  return <AdminDashboard onLogout={() => setIsAuthenticated(false)} />
}
