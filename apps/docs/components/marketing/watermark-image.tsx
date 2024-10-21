'use client'
import { useTheme } from 'next-themes'

export function WatermarkImage() {
	const { theme } = useTheme()
	return (
		<div className="watermark">
			<img
				src={theme === 'dark' ? '/watermark-desktop-dark.svg' : '/watermark-desktop.svg'}
				className="h-20"
			/>
		</div>
	)
}
