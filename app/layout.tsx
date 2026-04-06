import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Wind Ventures · Trend Intelligence',
  description: 'Weekly trend summaries for Energy, Mobility, and Convenience sectors',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#080b10' }}>{children}</body>
    </html>
  )
}
