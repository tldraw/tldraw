'use client'

import { track } from '@vercel/analytics'
import Link from 'next/link'

export function PricingButton({ tier }: { tier: { id: string; href: string } }) {
	return (
		<Link
			href={tier.href}
			aria-describedby={tier.id}
			onClick={() => track('pricing', { tier: tier.id })}
			className="mt-10 block rounded-md bg-blue-500 px-3 py-2 text-center text-sm/6 font-semibold shadow-sm bg-blue-500 text-white hover:bg-blue-600 dark:hover:bg-blue-400"
		>
			{tier.id === 'business' ? 'Contact us' : 'Buy now'}
		</Link>
	)
}
