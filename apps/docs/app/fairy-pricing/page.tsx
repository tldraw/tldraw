import { TldrawLink } from '@/components/common/tldraw-link'
import { FairyPricingSelector } from '@/components/fairy/fairy-pricing-selector'
import { Metadata } from 'next'

const PRICE_PER_FAIRY = 10
const MIN_FAIRIES = 1
const MAX_FAIRIES = 5
const PADDLE_CHECKOUT_URL =
	process.env.NEXT_PUBLIC_PADDLE_FAIRY_CHECKOUT_URL ??
	'https://checkout.paddle.com/checkout/custom/tldraw-fairy'

export const metadata: Metadata = {
	title: 'December Fairies Pricing',
	description: 'Fairies are AI assistants that live inside tldraw.',
}

export default function FairyPricingPage() {
	return (
		<main className="relative overflow-hidden bg-gradient-to-b from-blue-50 via-white to-white pb-24 pt-16 dark:from-zinc-900 dark:via-zinc-950 dark:pb-32">
			<div className="pointer-events-none absolute inset-0 -z-10 opacity-70 blur-3xl">
				<div className="absolute left-1/4 top-10 h-72 w-72 rounded-full bg-blue-200/40 dark:bg-blue-500/10" />
				<div className="absolute bottom-0 right-1/4 h-72 w-72 rounded-full bg-pink-100/40 dark:bg-pink-500/10" />
			</div>
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-5 sm:px-8">
				<section className="mt-8 max-w-3xl">
					<p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-500">
						December limited run
					</p>
					<h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-900 dark:text-white sm:text-5xl">
						Fairies for your tldraw canvases
					</h1>
					<p className="mt-4 text-lg text-zinc-600 dark:text-zinc-300">
						Fairies are AI assistants that live inside tldraw. Each Fairy is a creative collaborator
						that can sketch, organize, and respond to your prompts right on the canvas.
					</p>
				</section>
				<section className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
					<FairyPricingSelector
						pricePerFairy={PRICE_PER_FAIRY}
						minFairies={MIN_FAIRIES}
						maxFairies={MAX_FAIRIES}
						checkoutUrl={PADDLE_CHECKOUT_URL}
					/>
					<div className="rounded-3xl border border-zinc-200 bg-white/80 p-6 shadow-[0_35px_120px_-50px_rgba(15,23,42,0.35)] backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/70">
						<div>
							<p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
								What you get
							</p>
							<h2 className="mt-3 text-2xl font-semibold text-zinc-900 dark:text-white">
								A tldraw drop
							</h2>
							<p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
								You decide how many Fairies you need, and they stay with you for the entire month of
								December.
							</p>
						</div>
						<div className="mt-6 space-y-4">
							<div className="rounded-2xl border border-zinc-100 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
								<p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Fairies</p>
								<p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-white">
									Choose 1 – 5 Fairies
								</p>
								<p className="text-sm text-zinc-600 dark:text-zinc-400">
									Mix and match personalities or keep a single specialist—every Fairy costs $10
									flat.
								</p>
							</div>
							<div className="rounded-2xl border border-zinc-100 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
								<p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Access window</p>
								<p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-white">
									December 1 – 31
								</p>
								<p className="text-sm text-zinc-600 dark:text-zinc-400">
									Access automatically ends at 23:59 on 12/31.
								</p>
							</div>
						</div>
						<ul className="mt-6 list-disc space-y-2 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
							<li>Works in the latest tldraw builds—no extra installs.</li>
							<li>Fairies respond directly in your canvas chat or via prompts.</li>
							<li>Perfect for rapid ideation, wireframing, and playful December projects.</li>
						</ul>
					</div>
				</section>
				<section className="border-t border-zinc-200/60 pt-6 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
					<p className="text-sm text-zinc-600 dark:text-zinc-300">
						Questions about the drop? Contact us at{' '}
						<TldrawLink
							href="mailto:hello@tldraw.com"
							className="font-medium text-blue-600 dark:text-blue-300"
						>
							hello@tldraw.com
						</TldrawLink>
						.
					</p>
					<div className="mt-4 flex items-center justify-center gap-4 text-xs font-medium">
						<TldrawLink
							href="https://tldraw.com/tos.html"
							className="text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-300"
						>
							Terms of Service
						</TldrawLink>
						<span aria-hidden="true">•</span>
						<TldrawLink
							href="https://tldraw.com/privacy.html"
							className="text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-300"
						>
							Privacy Policy
						</TldrawLink>
					</div>
				</section>
			</div>
		</main>
	)
}
