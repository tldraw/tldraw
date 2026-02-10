'use client'

import { urlFor } from '@/sanity/image'
import type { Testimonial } from '@/sanity/types'
import Image from 'next/image'
import { useState } from 'react'

interface TestimonialCarouselProps {
	title?: string
	testimonials: Testimonial[]
}

export function TestimonialCarousel({ title, testimonials }: TestimonialCarouselProps) {
	const [current, setCurrent] = useState(0)

	if (!testimonials?.length) return null

	return (
		<section className="bg-zinc-50 py-16 dark:bg-zinc-900 sm:py-24">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				{title && (
					<h2 className="text-center text-3xl font-semibold tracking-tight text-black dark:text-white sm:text-4xl">
						{title}
					</h2>
				)}
				<div className="mt-12">
					<div className="mx-auto max-w-3xl text-center">
						<blockquote className="text-xl font-semibold italic leading-[1.3] text-black dark:text-white sm:text-2xl">
							&ldquo;{testimonials[current].quote}&rdquo;
						</blockquote>
						<div className="mt-8 flex items-center justify-center gap-4">
							{testimonials[current].avatar && (
								<Image
									src={urlFor(testimonials[current].avatar!).width(48).height(48).url()}
									alt={testimonials[current].author}
									width={48}
									height={48}
									className="rounded-full"
								/>
							)}
							<div className="text-left">
								<p className="font-semibold text-black dark:text-white">
									{testimonials[current].author}
								</p>
								<p className="text-sm text-body dark:text-zinc-400">
									{testimonials[current].role}, {testimonials[current].company}
								</p>
							</div>
						</div>
					</div>
					{testimonials.length > 1 && (
						<div className="mt-8 flex items-center justify-center gap-2">
							{testimonials.map((_, i) => (
								<button
									key={i}
									type="button"
									onClick={() => setCurrent(i)}
									className={`h-2 w-2 rounded-full transition-colors ${
										i === current ? 'bg-zinc-900 dark:bg-white' : 'bg-zinc-300 dark:bg-zinc-600'
									}`}
									aria-label={`Go to testimonial ${i + 1}`}
								/>
							))}
						</div>
					)}
				</div>
			</div>
		</section>
	)
}
