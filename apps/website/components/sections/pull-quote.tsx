'use client'

import Image from 'next/image'
import { useMemo } from 'react'

export interface PullQuoteTestimonial {
	quote: string
	author: string
	role: string
	company: string
	avatar?: string
}

interface PullQuoteProps {
	testimonials: PullQuoteTestimonial[]
}

/** Displays a randomly selected testimonial quote. */
export function PullQuote({ testimonials }: PullQuoteProps) {
	const testimonial = useMemo(() => {
		if (!testimonials?.length) return null
		const index = Math.floor(Math.random() * testimonials.length)
		return testimonials[index]
	}, [testimonials])

	if (!testimonial) return null

	return (
		<div>
			{/* Author info at top */}
			<div className="mb-8 flex items-center gap-3">
				{testimonial.avatar && (
					<Image
						src={testimonial.avatar}
						alt={testimonial.author}
						width={48}
						height={48}
						className="rounded-full"
					/>
				)}
				<p className="text-body text-sm dark:text-zinc-400">
					<span className="font-semibold text-black dark:text-white">{testimonial.author},</span>{' '}
					{testimonial.role} at{' '}
					<span className="font-semibold text-black dark:text-white">{testimonial.company}</span>
				</p>
			</div>

			{/* Quote */}
			<blockquote className="tracking-heading text-2xl leading-[1.3] font-semibold text-black italic sm:text-3xl dark:text-white">
				&ldquo;{testimonial.quote}&rdquo;
			</blockquote>
		</div>
	)
}
