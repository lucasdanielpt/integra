/** Três bips curtos (mesmo padrão do painel da TV) para avisar chamada de senha. */
export function playQueueChime(): void {
  try {
    const AudioContextCtor =
      typeof window !== 'undefined' &&
      (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)
    if (!AudioContextCtor) return

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
    /* navegador sem áudio ou política de autoplay */
  }
}
