'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'

interface QueueState {
  currentTicket: number
  lastTicket: number
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
      const data = await response.json()

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
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      
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

  const nextTicket = queue.currentTicket < queue.lastTicket 
    ? queue.currentTicket + 1 
    : null

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
          <h1 className="text-3xl font-bold text-foreground tracking-wide">
            CLÍNICA ÍNTEGRA
          </h1>
          <p className="text-muted-foreground text-lg">
            Cardiologia e Medicina Especializada
          </p>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-12">
        <div 
          className={`text-center transition-all duration-300 ${
            isBlinking ? 'scale-105' : ''
          }`}
        >
          <p className="text-2xl text-muted-foreground mb-4 uppercase tracking-widest">
            Senha Atual
          </p>
          <div 
            className={`text-[12rem] font-bold leading-none transition-colors duration-300 ${
              isBlinking ? 'text-primary animate-pulse' : 'text-primary'
            }`}
          >
            {queue.currentTicket === 0 
              ? '---' 
              : String(queue.currentTicket).padStart(3, '0')}
          </div>
        </div>

        <div className="w-full max-w-xl h-px bg-border" />

        <div className="text-center">
          <p className="text-xl text-muted-foreground mb-2 uppercase tracking-widest">
            Próxima Senha
          </p>
          <div className="text-6xl font-semibold text-muted-foreground">
            {nextTicket ? String(nextTicket).padStart(3, '0') : '---'}
          </div>
        </div>
      </div>

      <footer className="py-4 border-t border-border">
        <p className="text-center text-sm text-muted-foreground">
          Aguarde sua senha ser chamada no painel
        </p>
      </footer>
    </main>
  )
}
