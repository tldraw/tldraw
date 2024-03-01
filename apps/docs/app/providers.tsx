'use client'

import { ThemeProvider } from 'next-themes'

export function Providers({ children }: { children: any }) {
	return <ThemeProvider enableSystem>{children}</ThemeProvider>
}
