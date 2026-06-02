'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { Lock, LogOut } from 'lucide-react'
import { playQueueChime } from '@/lib/queue-chime'

type TicketBrief = {
  id: number
  name: string
  calledGuiche?: number | null
}

interface QueueState {
  access?: 'public' | 'full'
  currentTicket: number
  lastTicket: number
  currentTicketInfo?: TicketBrief | null
  nextWaitingTickets?: TicketBrief[]
}

export default function PainelPage() {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [pin, setPin] = useState('')
  const [gateError, setGateError] = useState<string | null>(null)
  const [gateBusy, setGateBusy] = useState(false)

  const [queue, setQueue] = useState<QueueState>({
    currentTicket: 0,
    lastTicket: 0,
  })
  const [isBlinking, setIsBlinking] = useState(false)
  const previousTicket = useRef(0)

  const fetchQueue = useCallback(async () => {
    try {
      const response = await fetch('/api/queue', { cache: 'no-store' })
      if (!response.ok) return
      const data = (await response.json()) as QueueState

      if (data.access !== 'full') {
        setAuthed(false)
        return
      }

      if (data.currentTicket !== previousTicket.current && data.currentTicket > 0) {
        setIsBlinking(true)
        playQueueChime()
        setTimeout(() => setIsBlinking(false), 3000)
      }

      previousTicket.current = data.currentTicket
      setQueue(data)
    } catch {
      console.error('Erro ao buscar fila')
    }
  }, [])

  const checkSession = useCallback(async () => {
    try {
      const r = await fetch('/api/painel/session', { cache: 'no-store' })
      const d = (await r.json()) as { authenticated?: boolean }
      if (d.authenticated) {
        setAuthed(true)
        await fetchQueue()
      } else {
        setAuthed(false)
      }
    } catch {
      setAuthed(false)
    }
  }, [fetchQueue])

  useEffect(() => {
    void checkSession()
  }, [checkSession])

  useEffect(() => {
    if (authed !== true) return
    const interval = setInterval(() => void fetchQueue(), 2000)
    return () => clearInterval(interval)
  }, [authed, fetchQueue])

  const unlock = async (e: React.FormEvent) => {
    e.preventDefault()
    setGateBusy(true)
    setGateError(null)
    try {
      const response = await fetch('/api/painel/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pin }),
      })
      const body = (await response.json()) as { success?: boolean; error?: string }
      if (!response.ok) {
        setGateError(body.error ?? 'Não foi possível entrar.')
        return
      }
      setPin('')
      setAuthed(true)
      await fetchQueue()
    } catch {
      setGateError('Erro de conexão.')
    } finally {
      setGateBusy(false)
    }
  }

  const logout = async () => {
    await fetch('/api/painel/session', { method: 'DELETE' })
    setAuthed(false)
    previousTicket.current = 0
    setQueue({ currentTicket: 0, lastTicket: 0 })
  }

  const current = queue.currentTicketInfo
  const upcomingSlots = queue.nextWaitingTickets ?? []
  const currentGuicheLabel =
    typeof current?.calledGuiche === 'number' ? current.calledGuiche : null

  if (authed === null) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <Spinner className="h-10 w-10 text-primary" />
      </main>
    )
  }

  if (authed === false) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-xl">
              <Lock className="h-5 w-5" />
              Painel da recepção
            </CardTitle>
            <CardDescription>
              Digite a senha configurada na Vercel (<code className="text-xs">PAINEL_DISPLAY_PASSWORD</code>
              ) para exibir nomes e a fila completa nesta TV.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={unlock} className="flex flex-col gap-4">
              <Field>
                <FieldLabel htmlFor="painel-pin">Senha do painel</FieldLabel>
                <Input
                  id="painel-pin"
                  type="password"
                  autoComplete="off"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Senha definida no ambiente"
                  autoFocus
                />
              </Field>
              {gateError ? (
                <p className="text-sm text-destructive text-center">{gateError}</p>
              ) : null}
              <Button type="submit" disabled={gateBusy || !pin.trim()} className="w-full">
                {gateBusy ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Abrindo...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col bg-background">
      <header className="flex items-center justify-center gap-6 py-8 border-b border-border relative">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="absolute right-4 top-4"
          onClick={() => void logout()}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </Button>
        <Image
          src="/logo-integra.png"
          alt="Clínica Íntegra"
          width={100}
          height={100}
          className="rounded-full"
        />
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground tracking-wide">CLÍNICA ÍNTEGRA</h1>
          <p className="text-muted-foreground text-lg">Cardiologia e Medicina Especializada</p>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-10">
        <div
          className={`text-center transition-all duration-300 max-w-3xl px-4 ${
            isBlinking ? 'scale-105' : ''
          }`}
        >
          <p className="text-2xl text-muted-foreground mb-4 uppercase tracking-widest">
            Senha atual
          </p>
          <div
            className={`text-[12rem] font-bold leading-none transition-colors duration-300 ${
              isBlinking ? 'text-primary animate-pulse' : 'text-primary'
            }`}
          >
            {queue.currentTicket === 0 ? '---' : String(queue.currentTicket).padStart(3, '0')}
          </div>

          {queue.currentTicket > 0 && current?.name ? (
            <div className="mt-6 space-y-2">
              <p className="text-4xl md:text-5xl font-semibold text-foreground leading-tight">
                {current.name}
              </p>
              {currentGuicheLabel !== null ? (
                <p className="text-3xl md:text-4xl font-bold text-primary">
                  Dirigir-se ao Guichê {currentGuicheLabel}
                </p>
              ) : (
                <p className="text-xl text-muted-foreground">Aguarde a indicação do guichê</p>
              )}
            </div>
          ) : null}
        </div>

        <div className="w-full max-w-xl h-px bg-border" />

        <div className="w-full max-w-4xl px-4">
          <p className="text-xl text-muted-foreground mb-8 text-center uppercase tracking-widest">
            Próximas senhas na fila
          </p>
          <ol className="flex flex-col gap-8 list-none p-0 m-0">
            {[0, 1, 2].map((index) => {
              const item = upcomingSlots[index]
              return (
                <li
                  key={index}
                  className="flex flex-col sm:flex-row sm:items-baseline sm:justify-center gap-2 sm:gap-10 text-center sm:text-left border-b border-border/60 pb-8 last:border-0 last:pb-0"
                >
                  <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider shrink-0 sm:w-28 sm:text-right">
                    {index + 1}ª na fila
                  </span>
                  <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-6 min-w-0 flex-1 justify-center sm:justify-start">
                    {item ? (
                      <>
                        <span className="text-5xl md:text-6xl font-semibold text-muted-foreground tabular-nums shrink-0">
                          {String(item.id).padStart(3, '0')}
                        </span>
                        <span className="text-2xl md:text-3xl font-medium text-foreground break-words">
                          {item.name}
                        </span>
                      </>
                    ) : (
                      <span className="text-3xl md:text-4xl text-muted-foreground">—</span>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      </div>

      <footer className="py-4 border-t border-border">
        <p className="text-center text-sm text-muted-foreground">
          Aguarde sua senha e o número do guichê no painel
        </p>
      </footer>
    </main>
  )
}
