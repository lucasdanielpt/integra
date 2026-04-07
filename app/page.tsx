'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Ticket, Clock } from 'lucide-react'

const STORAGE_KEY = 'integra_ticket'

interface QueueState {
  currentTicket: number
  lastTicket: number
}

export default function ClientePage() {
  const [ticket, setTicket] = useState<number | null>(null)
  const [queueState, setQueueState] = useState<QueueState | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchQueueState = useCallback(async () => {
    try {
      const response = await fetch('/api/queue')
      if (response.ok) {
        const data = await response.json()
        setQueueState(data)
        return data as QueueState
      }
    } catch {
      // Silently fail for queue state fetch
    }
    return null
  }, [])

  const checkSavedTicket = useCallback(async () => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) {
      setIsChecking(false)
      return
    }

    try {
      const { ticket: savedTicket, timestamp } = JSON.parse(saved)
      
      // Check if ticket is older than 24 hours
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
      if (timestamp < oneDayAgo) {
        localStorage.removeItem(STORAGE_KEY)
        setIsChecking(false)
        return
      }

      const state = await fetchQueueState()
      
      if (state) {
        // Ticket is still valid if it hasn't been called yet (greater than current)
        // and is within the valid range (less than or equal to lastTicket)
        if (savedTicket > state.currentTicket && savedTicket <= state.lastTicket) {
          setTicket(savedTicket)
        } else {
          // Ticket was already called or queue was reset
          localStorage.removeItem(STORAGE_KEY)
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
    
    setIsChecking(false)
  }, [fetchQueueState])

  useEffect(() => {
    checkSavedTicket()
  }, [checkSavedTicket])

  // Poll queue state to update position
  useEffect(() => {
    if (ticket === null) return

    const interval = setInterval(async () => {
      const state = await fetchQueueState()
      if (state) {
        // Check if ticket was called or queue was reset
        if (ticket <= state.currentTicket || ticket > state.lastTicket) {
          localStorage.removeItem(STORAGE_KEY)
          setTicket(null)
        }
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [ticket, fetchQueueState])

  const handleGenerateTicket = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate' }),
      })

      const data = await response.json()

      if (response.ok) {
        setTicket(data.ticket)
        // Save to localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          ticket: data.ticket,
          timestamp: Date.now()
        }))
        // Update queue state
        await fetchQueueState()
      } else {
        setError(data.error || 'Erro ao gerar senha')
      }
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  const calculatePosition = () => {
    if (ticket === null || queueState === null) return null
    return ticket - queueState.currentTicket
  }

  const position = calculatePosition()

  if (isChecking) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
        <div className="flex flex-col items-center gap-4">
          <Image
            src="/logo-integra.png"
            alt="Clínica Íntegra - Cardiologia e Medicina Especializada"
            width={180}
            height={180}
            className="rounded-full"
            priority
          />
          <p className="text-muted-foreground">Verificando...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md flex flex-col items-center gap-8">
        <Image
          src="/logo-integra.png"
          alt="Clínica Íntegra - Cardiologia e Medicina Especializada"
          width={180}
          height={180}
          className="rounded-full"
          priority
        />

        {ticket === null ? (
          <Card className="w-full border-border">
            <CardContent className="p-8 flex flex-col items-center gap-6">
              <div className="text-center">
                <h1 className="text-2xl font-semibold text-foreground mb-2">
                  Bem-vindo
                </h1>
                <p className="text-muted-foreground">
                  Retire sua senha para atendimento
                </p>
              </div>

              {error && (
                <p className="text-destructive text-sm text-center">{error}</p>
              )}

              <Button
                onClick={handleGenerateTicket}
                disabled={isLoading}
                size="lg"
                className="w-full h-16 text-lg font-semibold"
              >
                <Ticket className="mr-2 h-6 w-6" />
                {isLoading ? 'Gerando...' : 'Retirar Senha'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="w-full border-primary">
            <CardContent className="p-8 flex flex-col items-center gap-6">
              <div className="text-center">
                <p className="text-muted-foreground mb-2">Sua senha é</p>
                <div className="text-7xl font-bold text-primary">
                  {String(ticket).padStart(3, '0')}
                </div>
              </div>

              {position !== null && position > 0 && (
                <div className="flex items-center gap-2 text-muted-foreground bg-secondary px-4 py-2 rounded-lg">
                  <Clock className="h-4 w-4" />
                  <span>
                    {position === 1 
                      ? 'Você é o próximo!' 
                      : `${position} pessoas na sua frente`}
                  </span>
                </div>
              )}

              <div className="text-center text-sm text-muted-foreground">
                <p>Aguarde ser chamado no painel.</p>
                <p>Não feche esta página para acompanhar sua posição.</p>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Sua senha está salva. Você pode fechar o navegador e voltar depois.
              </p>
            </CardContent>
          </Card>
        )}

        <nav className="flex gap-4 text-sm text-muted-foreground">
          <Link href="/admin" className="hover:text-primary transition-colors">
            Administração
          </Link>
          <span>|</span>
          <Link href="/painel" className="hover:text-primary transition-colors">
            Painel
          </Link>
        </nav>
      </div>
    </main>
  )
}
