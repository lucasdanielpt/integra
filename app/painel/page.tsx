'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'

type TicketBrief = {
  id: number
  name: string
  calledGuiche?: number | null
}

interface QueueState {
  currentTicket: number
  lastTicket: number
  currentTicketInfo?: TicketBrief | null
  nextTicketInfo?: TicketBrief | null
}

export default function PainelPage() {
  const [queue, setQueue] = useState<QueueState>({
    currentTicket: 0,
    lastTicket: 0,
  })
  const [isBlinking, setIsBlinking] = useState(false)
  const previousTicket = useRef(0)

  const fetchQueue = useCallback(async () => {
    try {
      const response = await fetch('/api/queue')
      const data = (await response.json()) as QueueState

      if (data.currentTicket !== previousTicket.current && data.currentTicket > 0) {
        setIsBlinking(true)
        playSound()
        setTimeout(() => setIsBlinking(false), 3000)
      }

      previousTicket.current = data.currentTicket
      setQueue(data)
    } catch {
      console.error('Erro ao buscar fila')
    }
  }, [])

  const playSound = () => {
    try {
      const AudioContextCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const audioContext = new AudioContextCtor()

      const playBeep = (frequency: number, startTime: number) => {
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)

        oscillator.frequency.value = frequency
        oscillator.type = 'sine'

        gainNode.gain.setValueAtTime(0.3, startTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3)

        oscillator.start(startTime)
        oscillator.stop(startTime + 0.3)
      }

      playBeep(800, audioContext.currentTime)
      playBeep(1000, audioContext.currentTime + 0.35)
      playBeep(1200, audioContext.currentTime + 0.7)
    } catch {
      console.log('Audio não suportado')
    }
  }

  useEffect(() => {
    fetchQueue()
    const interval = setInterval(fetchQueue, 2000)
    return () => clearInterval(interval)
  }, [fetchQueue])

  const current = queue.currentTicketInfo
  const next = queue.nextTicketInfo

  const currentGuicheLabel =
    typeof current?.calledGuiche === 'number' ? current.calledGuiche : null

  return (
    <main className="min-h-screen flex flex-col bg-background">
      <header className="flex items-center justify-center gap-6 py-8 border-b border-border">
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

        <div className="text-center max-w-3xl px-4">
          <p className="text-xl text-muted-foreground mb-2 uppercase tracking-widest">
            Próxima senha
          </p>
          <div className="text-6xl font-semibold text-muted-foreground">
            {next ? String(next.id).padStart(3, '0') : '---'}
          </div>
          {next?.name ? (
            <p className="mt-4 text-2xl md:text-3xl font-medium text-foreground">{next.name}</p>
          ) : null}
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
