'use client'
import WatermarkDark from '@/public/watermark-desktop-dark.svg'
import Watermark from '@/public/watermark-desktop.svg'
import Image from 'next/image'

export function WatermarkImage() {
	return (
		<div className="watermark">
			<Image src={WatermarkDark} alt="Watermark" className="hidden dark:block" height={80} />
			<Image src={Watermark} alt="Watermark" className="block dark:hidden" height={80} />
		</div>
	)
}
