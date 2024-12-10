'use client'

import { track } from '@vercel/analytics'
import clsx from 'clsx'
import Link from 'next/link'

export function PricingButton({
	tier,
}: {
	tier: {
		id: string
		type: 'secondary' | 'primary'
		href: string
	}
}) {
	return (
		<Link
			href={tier.href}
			aria-describedby={tier.id}
			onClick={() => track('pricing', { tier: tier.id })}
			className={clsx(
				'mt-10 block rounded-md px-3 py-2 text-center text-sm/6 font-semibold shadow-sm',
				{
					'bg-blue-500 text-white hover:bg-blue-600': tier.type === 'primary',
					'bg-transparent border-blue-500 border-sm border text-blue-500 dark:text-white hover:border-blue-600 hover:text-blue-600':
						tier.type === 'secondary',
				}
			)}
		>
			{tier.id === 'business' ? 'Contact us' : 'Get started'}
		</Link>
	)
}
