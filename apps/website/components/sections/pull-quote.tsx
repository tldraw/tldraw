'use client'

import { urlFor } from '@/sanity/image'
import type { SanityImage } from '@/sanity/types'
import Image from 'next/image'
import { useMemo } from 'react'

export interface PullQuoteTestimonial {
	quote: string
	author: string
	role: string
	company: string
	avatar?: SanityImage | string
}

interface PullQuoteProps {
	testimonials: PullQuoteTestimonial[]
}

/** Displays a randomly selected testimonial quote from the CMS. */
export function PullQuote({ testimonials }: PullQuoteProps) {
	const testimonial = useMemo(() => {
		if (!testimonials?.length) return null
		const index = Math.floor(Math.random() * testimonials.length)
		return testimonials[index]
	}, [testimonials])

	if (!testimonial) return null

	const avatarSrc =
		testimonial.avatar &&
		(typeof testimonial.avatar === 'string'
			? testimonial.avatar
			: urlFor(testimonial.avatar as SanityImage)
					.width(48)
					.height(48)
					.url())

	return (
		<div>
			{/* Author info at top */}
			<div className="mb-8 flex items-center gap-3">
				{avatarSrc && (
					<Image
						src={avatarSrc}
						alt={testimonial.author}
						width={48}
						height={48}
						className="rounded-full"
					/>
				)}
				<p className="text-sm text-body dark:text-zinc-400">
					<span className="font-semibold text-black dark:text-white">{testimonial.author},</span>{' '}
					{testimonial.role} at{' '}
					<span className="font-semibold text-black dark:text-white">{testimonial.company}</span>
				</p>
			</div>

			{/* Quote */}
			<blockquote className="text-2xl font-semibold italic leading-[1.3] tracking-heading text-black dark:text-white sm:text-3xl">
				&ldquo;{testimonial.quote}&rdquo;
			</blockquote>
		</div>
	)
}
