'use client'

import { Button } from '@/components/common/button'
import { cn } from '@/utils/cn'
import { useMemo, useState } from 'react'

const DEFAULT_COUNTS = [1, 2, 3, 4, 5]

export interface FairyPricingSelectorProps {
	pricePerFairy: number
	minFairies: number
	maxFairies: number
	checkoutUrl: string
}

export function FairyPricingSelector({
	pricePerFairy,
	minFairies,
	maxFairies,
	checkoutUrl,
}: FairyPricingSelectorProps) {
	const allowedCounts = useMemo(
		() => DEFAULT_COUNTS.filter((count) => count >= minFairies && count <= maxFairies),
		[minFairies, maxFairies]
	)

	const initialCount = useMemo(() => {
		const midpoint = Math.ceil((minFairies + maxFairies) / 2)
		if (midpoint < minFairies) return minFairies
		if (midpoint > maxFairies) return maxFairies
		return midpoint
	}, [minFairies, maxFairies])

	const [count, setCount] = useState(initialCount)
	const currencyFormatter = useMemo(
		() =>
			new Intl.NumberFormat('en-US', {
				style: 'currency',
				currency: 'USD',
				minimumFractionDigits: 2,
			}),
		[]
	)

	const total = count * pricePerFairy

	const checkoutHref = useMemo(() => {
		const separator = checkoutUrl.includes('?') ? '&' : '?'
		return `${checkoutUrl}${checkoutUrl ? `${separator}quantity=${count}` : ''}`
	}, [checkoutUrl, count])

	return (
		<div className="rounded-3xl border border-zinc-200 bg-white/70 p-6 shadow-[0_35px_120px_-50px_rgba(15,23,42,0.45)] backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/70">
			<div className="flex items-center justify-between gap-4">
				<div>
					<p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-500">Pricing</p>
					<h2 className="mt-2 text-4xl font-semibold text-zinc-900 dark:text-white">
						${pricePerFairy} <span className="text-base font-medium text-zinc-500">/ Fairy</span>
					</h2>
				</div>
				<span className="rounded-full bg-blue-100 px-4 py-1 text-sm font-medium text-blue-600 dark:bg-blue-500/20 dark:text-blue-300">
					December only
				</span>
			</div>
			<p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
				Choose how many Fairies you want working in your tldraw canvases.
			</p>
			<div className="mt-6">
				<p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
					Number of Fairies
				</p>
				<div className="mt-3 grid grid-cols-5 gap-2">
					{allowedCounts.map((value) => {
						const isActive = value === count
						return (
							<button
								key={value}
								type="button"
								onClick={() => setCount(value)}
								className={cn(
									'flex flex-col items-center justify-center rounded-2xl border px-3 py-4 text-sm transition',
									isActive
										? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-500/20 dark:text-blue-100'
										: 'border-zinc-200 bg-white text-zinc-600 hover:border-blue-200 hover:text-blue-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:border-blue-400'
								)}
								aria-pressed={isActive}
							>
								<span className="text-lg font-semibold text-zinc-900 dark:text-white">{value}</span>
								<span className="text-xs text-zinc-500 dark:text-zinc-400">
									{value > 1 ? 'Fairies' : 'Fairy'}
								</span>
							</button>
						)
					})}
				</div>
			</div>
			<dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
				<div className="rounded-2xl border border-zinc-100 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
					<dt className="text-xs uppercase tracking-[0.2em] text-zinc-500">Selected</dt>
					<dd className="mt-1 text-lg font-semibold text-zinc-900 dark:text-white">
						{count} {count > 1 ? 'Fairies' : 'Fairy'}
					</dd>
				</div>
				<div className="rounded-2xl border border-zinc-100 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
					<dt className="text-xs uppercase tracking-[0.2em] text-zinc-500">Total</dt>
					<dd className="mt-1 text-lg font-semibold text-green-600 dark:text-green-400">
						{currencyFormatter.format(total)}
					</dd>
				</div>
			</dl>
			<div className="mt-6 rounded-2xl border border-dashed border-zinc-200 bg-white/60 p-4 dark:border-zinc-700 dark:bg-zinc-900/60">
				<p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Access window</p>
				<p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
					December 1 – December 31, 23:59.
				</p>
			</div>
			<Button
				id="fairy-checkout"
				href={checkoutHref || checkoutUrl || '#'}
				caption={`Checkout ${count} ${count > 1 ? 'Fairies' : 'Fairy'}`}
				className="mt-6 w-full justify-center"
				size="lg"
				type="black"
			/>
		</div>
	)
}
