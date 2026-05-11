import type { Metadata, Viewport } from 'next'

export const viewport: Viewport = {
  /** Tablet em borda/contorno (notch): área útil até as bordas em fullscreen onde o SO permitir */
  viewportFit: 'cover',
  themeColor: '#2d4a5e',
}

export const metadata: Metadata = {
  title: 'Totem · Retirada de senha',
  description: 'Totem para retirada de senha na recepção',
}

export default function TotemLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children
}
