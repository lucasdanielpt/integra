'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel } from '@/components/ui/field'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

type AuthPayload =
  | { role: 'master'; guiche: null }
  | { role: 'guiche'; guiche: number }

type QueueBoardRow = {
  ticketNumber: number
  status: 'WAITING' | 'CALLED'
  patientName: string
  cpf: string
  phone: string | null
  calledGuiche: number | null
}

type TicketInfoClient = {
  id: number
  name: string
  cpf: string
  phone?: string | null
  calledGuiche?: number | null
}

interface QueueState {
  currentTicket: number
  lastTicket: number
  waitingBoard?: QueueBoardRow[]
  currentTicketInfo?: TicketInfoClient | null
}

function LoginForm({ onLogin }: { onLogin: (auth: AuthPayload) => void }) {
  const [password, setPassword] = useState('')
  const [loginMode, setLoginMode] = useState<'master' | 'guiche'>('master')
  const [guicheSel, setGuicheSel] = useState<string>('1')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const body: Record<string, unknown> =
        loginMode === 'master'
          ? { password, mode: 'master' }
          : { password, mode: 'guiche', guiche: parseInt(guicheSel, 10) }

      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = (await response.json()) as Record<string, unknown>

      if (data.success === true) {
        if (data.role === 'master') {
          onLogin({ role: 'master', guiche: null })
        } else if (data.role === 'guiche' && typeof data.guiche === 'number') {
          onLogin({ role: 'guiche', guiche: data.guiche })
        }
      } else {
        setError(typeof data.error === 'string' ? data.error : 'Senha incorreta')
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
          <CardTitle className="text-2xl">Área administrativa</CardTitle>
          <CardDescription>
            As senhas da coordenação e dos guichês ficam no banco de dados. A coordenação cadastra os
            guichês após entrar. No primeiro deploy, use a senha definida em{' '}
            <code className="text-xs">ADMIN_MASTER_PASSWORD</code> (ou <code className="text-xs">ADMIN_PASSWORD</code>)
            uma vez para gravar o master no banco.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field>
              <FieldLabel>Tipo de acesso</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={loginMode === 'master' ? 'default' : 'outline'}
                  onClick={() => setLoginMode('master')}
                  className="h-11"
                >
                  Coordenação
                </Button>
                <Button
                  type="button"
                  variant={loginMode === 'guiche' ? 'default' : 'outline'}
                  onClick={() => setLoginMode('guiche')}
                  className="h-11"
                >
                  Guichê
                </Button>
              </div>
            </Field>

            {loginMode === 'guiche' ? (
              <Field>
                <FieldLabel>Guichê</FieldLabel>
                <Select value={guicheSel} onValueChange={setGuicheSel}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Escolha o guichê" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Guichê 1</SelectItem>
                    <SelectItem value="2">Guichê 2</SelectItem>
                    <SelectItem value="3">Guichê 3</SelectItem>
                    <SelectItem value="4">Guichê 4</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            ) : null}

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
                Voltar para início
              </Button>
            </Link>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}

type StaffDeskStatusResponse = {
  masterConfigured: boolean
  guiches: { 1: boolean; 2: boolean; 3: boolean; 4: boolean }
}

function DeskPasswordBlock({
  label,
  subtitle,
  deskSlot,
  configured,
  onSaved,
}: {
  label: string
  subtitle?: string
  deskSlot: number
  configured: boolean
  onSaved: () => void
}) {
  const [pwd, setPwd] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  const save = async () => {
    setBusy(true)
    setNote(null)
    try {
      const response = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deskSlot, password: pwd }),
      })
      const data: unknown = await response.json()
      if (!response.ok) {
        const rec = data as Record<string, unknown>
        setNote(typeof rec.error === 'string' ? rec.error : 'Não foi possível salvar')
        return
      }
      setNote('Senha atualizada.')
      setPwd('')
      onSaved()
    } catch {
      setNote('Erro de conexão.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <div className="font-medium text-foreground">{label}</div>
          {subtitle ? <div className="text-xs text-muted-foreground">{subtitle}</div> : null}
        </div>
        {configured ? (
          <Badge variant="secondary">Senha definida</Badge>
        ) : (
          <Badge variant="destructive">Sem senha</Badge>
        )}
      </div>
      <Input
        type="password"
        autoComplete="new-password"
        placeholder="Nova senha (mín. 8 caracteres)"
        value={pwd}
        onChange={(e) => setPwd(e.target.value)}
      />
      <Button type="button" onClick={save} disabled={busy || pwd.trim().length < 8}>
        {busy ? <Spinner className="h-4 w-4" /> : 'Salvar'}
      </Button>
      {note ? <p className="text-sm text-muted-foreground">{note}</p> : null}
    </div>
  )
}

function StaffAccountsPanel() {
  const [status, setStatus] = useState<StaffDeskStatusResponse | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/staff')
      const data: unknown = await response.json()
      if (!response.ok) {
        const rec = data as Record<string, unknown>
        setErr(typeof rec.error === 'string' ? rec.error : 'Erro ao carregar')
        return
      }
      setErr(null)
      setStatus(data as StaffDeskStatusResponse)
    } catch {
      setErr('Erro de conexão')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Contas da recepção</CardTitle>
        <CardDescription>
          Defina ou altere a senha da coordenação e a de cada guichê. Todas ficam apenas no Postgres
          (hash). Nos guichês, use sempre senhas com pelo menos 8 caracteres.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {err ? (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{err}</div>
        ) : null}

        {!status ? (
          <div className="flex justify-center py-6">
            <Spinner className="h-8 w-8 text-primary" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <DeskPasswordBlock
              label="Coordenação (master)"
              subtitle="Pode zerar a fila e cadastrar guichês."
              deskSlot={0}
              configured={status.masterConfigured}
              onSaved={load}
            />
            <DeskPasswordBlock
              label="Guichê 1"
              deskSlot={1}
              configured={status.guiches[1]}
              onSaved={load}
            />
            <DeskPasswordBlock
              label="Guichê 2"
              deskSlot={2}
              configured={status.guiches[2]}
              onSaved={load}
            />
            <DeskPasswordBlock
              label="Guichê 3"
              deskSlot={3}
              configured={status.guiches[3]}
              onSaved={load}
            />
            <DeskPasswordBlock
              label="Guichê 4"
              deskSlot={4}
              configured={status.guiches[4]}
              onSaved={load}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function AdminDashboard({
  auth,
  onLogout,
}: {
  auth: AuthPayload
  onLogout: () => void
}) {
  const [queue, setQueue] = useState<QueueState>({
    currentTicket: 0,
    lastTicket: 0,
    waitingBoard: [],
  })
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const fetchQueue = useCallback(async () => {
    try {
      const response = await fetch('/api/queue')
      const data: unknown = await response.json()
      setQueue(data as QueueState)
    } catch {
      console.error('Erro ao buscar fila')
    }
  }, [])

  useEffect(() => {
    fetchQueue()
    const interval = setInterval(fetchQueue, 3000)
    return () => clearInterval(interval)
  }, [fetchQueue])

  const waitingCount =
    queue.waitingBoard?.filter((r) => r.status === 'WAITING').length ?? 0

  const board = queue.waitingBoard ?? []

  const callNext = async () => {
    setIsLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'call' }),
      })

      const dataUnknown: unknown = await response.json()
      const rec = dataUnknown as Record<string, unknown>

      if (response.ok) {
        setQueue(dataUnknown as QueueState)
        const info = rec.ticket_info as TicketInfoClient | undefined
        const called = typeof rec.called === 'number' ? rec.called : '?'
        const g = typeof info?.calledGuiche === 'number' ? info.calledGuiche : null
        setMessage(
          info
            ? `Senha ${String(called).padStart(3, '0')} chamada • ${info.name} • Guichê ${g ?? '—'} • CPF ${info.cpf}${info.phone ? ` • ${info.phone}` : ''}`
            : `Senha ${String(called).padStart(3, '0')} chamada!`
        )
      } else {
        setMessage(typeof rec.error === 'string' ? rec.error : 'Não foi possível chamar')
      }
    } catch {
      setMessage('Erro de conexão')
    } finally {
      setIsLoading(false)
    }
  }

  const resetQueueAction = async () => {
    setIsLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      })

      const dataUnknown: unknown = await response.json()
      const rec = dataUnknown as Record<string, unknown>

      if (response.ok) {
        setQueue(dataUnknown as QueueState)
        setMessage('Fila zerada com sucesso!')
      } else {
        setMessage(typeof rec.error === 'string' ? rec.error : 'Não autorizado.')
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

  const roleLabel =
    auth.role === 'master'
      ? 'Coordenação'
      : `Guichê ${auth.guiche} — apenas este posto pode chamar senhas daqui`

  return (
    <main className="min-h-screen flex flex-col items-center p-6 bg-background">
      <div className="w-full max-w-4xl flex flex-col gap-6">
        <header className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Image
              src="/logo-integra.png"
              alt="Clínica Íntegra"
              width={60}
              height={60}
              className="rounded-full"
            />
            <div>
              <h1 className="text-xl font-semibold text-foreground">Administração</h1>
              <p className="text-sm text-muted-foreground">Gerenciamento de filas</p>
              <p className="text-xs text-primary mt-1 font-medium">{roleLabel}</p>
            </div>
          </div>

          <nav className="flex gap-2 shrink-0">
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
                Senha atual
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
                Última senha emitida
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-foreground">
                {queue.lastTicket === 0 ? '---' : String(queue.lastTicket).padStart(3, '0')}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Aguardando atendimento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-foreground">{waitingCount}</div>
            </CardContent>
          </Card>
        </div>

        {auth.role === 'master' ? <StaffAccountsPanel /> : null}

        {message ? (
          <div className="p-4 rounded-lg bg-muted text-center text-foreground">{message}</div>
        ) : null}

        {queue.currentTicketInfo ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Paciente da senha atual no painel
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              <div className="text-base font-semibold text-foreground">
                {queue.currentTicketInfo.name}
              </div>
              {typeof queue.currentTicketInfo.calledGuiche === 'number' ? (
                <div className="text-sm font-semibold text-primary">
                  Dirigir-se ao Guichê {queue.currentTicketInfo.calledGuiche}
                </div>
              ) : null}
              <div className="text-sm text-muted-foreground">
                CPF: {queue.currentTicketInfo.cpf}
              </div>
              {queue.currentTicketInfo.phone ? (
                <div className="text-sm text-muted-foreground">
                  Celular: {queue.currentTicketInfo.phone}
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ordem na fila (nome por senha)</CardTitle>
            <CardDescription>Pacientes que ainda não concluíram o dia ou estão sendo chamados.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {board.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ninguém na fila hoje.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Senha</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead>Guichê</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {board.map((row) => (
                    <TableRow key={row.ticketNumber}>
                      <TableCell className="font-mono font-semibold">
                        {String(row.ticketNumber).padStart(3, '0')}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{row.patientName}</div>
                        <div className="text-xs text-muted-foreground">{row.cpf}</div>
                      </TableCell>
                      <TableCell>
                        {row.status === 'WAITING' ? (
                          <Badge variant="secondary">Aguardando</Badge>
                        ) : (
                          <Badge>Chamada</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {typeof row.calledGuiche === 'number' ? row.calledGuiche : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex flex-col gap-4">
            {auth.role === 'guiche' ? (
              <Button
                onClick={callNext}
                disabled={isLoading || waitingCount === 0}
                size="lg"
                className="h-20 text-xl font-semibold"
              >
                <PhoneCall className="mr-3 h-7 w-7" />
                Chamar próxima senha neste Guichê {auth.guiche}
              </Button>
            ) : (
              <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground text-center">
                Entre como <strong className="text-foreground">Guichê 1–4</strong> para chamar senhas daqui. A coordenação
                acompanha a lista ao vivo; o painel da recepção mostra o número do guichê ao paciente.
              </div>
            )}

            {auth.role === 'master' ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isLoading} className="h-12">
                    <RotateCcw className="mr-2 h-5 w-5" />
                    Zerar fila do dia
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar ação</AlertDialogTitle>
                    <AlertDialogDescription>
                      Zerar todas as senhas de hoje? Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={resetQueueAction}>Confirmar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Dados atualizados automaticamente a cada 3 segundos.
        </p>
      </div>
    </main>
  )
}

export default function AdminPage() {
  const [bootstrap, setBootstrap] = useState<'loading' | 'anon' | AuthPayload>('loading')

  const refreshAuth = async () => {
    try {
      const response = await fetch('/api/auth')
      const data = (await response.json()) as {
        authenticated?: boolean
        role?: string
        guiche?: number | null
      }
      if (!data.authenticated) {
        setBootstrap('anon')
        return
      }
      if (data.role === 'master') setBootstrap({ role: 'master', guiche: null })
      else if (data.role === 'guiche' && typeof data.guiche === 'number')
        setBootstrap({ role: 'guiche', guiche: data.guiche })
      else setBootstrap('anon')
    } catch {
      setBootstrap('anon')
    }
  }

  useEffect(() => {
    refreshAuth()
  }, [])

  if (bootstrap === 'loading') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <Spinner className="h-8 w-8 text-primary" />
      </main>
    )
  }

  if (bootstrap === 'anon') {
    return <LoginForm onLogin={(a) => setBootstrap(a)} />
  }

  return (
    <AdminDashboard
      auth={bootstrap}
      onLogout={() => {
        setBootstrap('anon')
      }}
    />
  )
}
