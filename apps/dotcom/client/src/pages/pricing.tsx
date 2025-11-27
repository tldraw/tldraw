import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDialogs } from 'tldraw'
import { TlaSignInDialog } from '../tla/components/dialogs/TlaSignInDialog'
import { useTldrawUser } from '../tla/hooks/useUser'
import '../tla/styles/fairy.css'
import { F } from '../tla/utils/i18n'
import styles from './pricing.module.css'

const FairySprite = lazy(() =>
	import('../fairy/fairy-sprite/FairySprite').then((m) => ({ default: m.FairySprite }))
)

declare global {
	interface Window {
		Paddle?: {
			Environment: {
				set(env: 'sandbox' | 'production'): void
			}
			Initialize(config: { token: string; eventCallback?(data: any): void }): void
			Checkout: {
				open(options: {
					items: Array<{ priceId: string; quantity: number }>
					customData?: Record<string, any>
					customer?: {
						email?: string
					}
					settings?: {
						allowDiscountRemoval?: boolean
						displayMode?: string
						showAddDiscounts?: boolean
					}
				}): void
			}
		}
	}
}

export function Component() {
	const user = useTldrawUser()
	const { addDialog } = useDialogs()
	const [paddleLoaded, setPaddleLoaded] = useState(false)

	// Load Paddle script
	const loadPaddleScript = useCallback(() => {
		if (paddleLoaded || window.Paddle) {
			setPaddleLoaded(true)
			return
		}

		const paddleEnv = (process.env.PADDLE_ENVIRONMENT as 'sandbox' | 'production') ?? 'sandbox'
		const paddleToken = process.env.PADDLE_CLIENT_TOKEN

		if (!paddleToken) {
			console.error('[Paddle] Client token not configured')
			return
		}

		const script = document.createElement('script')
		script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js'
		script.async = true
		script.onload = () => {
			if (window.Paddle) {
				window.Paddle.Environment.set(paddleEnv)
				window.Paddle.Initialize({
					token: paddleToken,
					eventCallback: (data) => {
						if (data.name === 'checkout.completed') {
							console.warn('[Paddle] Checkout completed', data.data?.transaction_id)
						}
					},
				})
				setPaddleLoaded(true)
			}
		}
		script.onerror = () => {
			console.error('Failed to load Paddle script')
		}

		document.head.appendChild(script)
	}, [paddleLoaded])

	// Load Paddle on mount
	useEffect(() => {
		loadPaddleScript()
	}, [loadPaddleScript])

	// Handle checkout intent after sign-in
	useEffect(() => {
		const hasCheckoutIntent = sessionStorage.getItem('pricing-checkout-intent') === 'true'

		if (user && hasCheckoutIntent && paddleLoaded && window.Paddle) {
			// Clear intent
			sessionStorage.removeItem('pricing-checkout-intent')

			// Open Paddle checkout
			const paddlePriceId = process.env.PADDLE_FAIRY_PRICE_ID
			if (!paddlePriceId) {
				console.error('[Paddle] Price ID not configured')
				return
			}

			try {
				window.Paddle.Checkout.open({
					items: [{ priceId: paddlePriceId, quantity: 1 }],
					customData: {
						userId: user.id,
					},
					customer: {
						email: user.clerkUser.primaryEmailAddress?.emailAddress,
					},
					settings: {
						allowDiscountRemoval: false,
						displayMode: 'overlay',
						showAddDiscounts: false,
					},
				})
			} catch (error) {
				console.error('Failed to open Paddle checkout:', error)
			}
		}
	}, [user, paddleLoaded])

	const handlePurchaseClick = useCallback(() => {
		if (!user) {
			// Store checkout intent
			sessionStorage.setItem('pricing-checkout-intent', 'true')

			// Open sign-in dialog (redirect to pricing handled by TlaRootProviders)
			addDialog({ component: TlaSignInDialog })
			return
		}

		// User is signed in, open Paddle directly
		if (!paddleLoaded || !window.Paddle) {
			console.error('Paddle.js not loaded yet')
			return
		}

		const paddlePriceId = process.env.PADDLE_FAIRY_PRICE_ID
		if (!paddlePriceId) {
			console.error('[Paddle] Price ID not configured')
			return
		}

		try {
			window.Paddle.Checkout.open({
				items: [{ priceId: paddlePriceId, quantity: 1 }],
				customData: {
					userId: user.id,
				},
				customer: {
					email: user.clerkUser.primaryEmailAddress?.emailAddress,
				},
				settings: {
					allowDiscountRemoval: false,
					displayMode: 'overlay',
					showAddDiscounts: false,
				},
			})
		} catch (error) {
			console.error('Failed to open Paddle checkout:', error)
		}
	}, [user, paddleLoaded, addDialog])

	return (
		<div className={styles.container}>
			<div className={styles.content}>
				{user && (
					<Link to="/" className={styles.homeButton}>
						<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
							<path d="M8 2l6 5v7H10V9H6v5H2V7l6-5z" />
						</svg>
					</Link>
				)}
				<div className={styles.logo} />

				<p className={styles.title}>
					<F defaultMessage="Fairies have come to tldraw for the month of December." />
				</p>

				<p className={styles.description}>
					<F defaultMessage="A fairy is a little guy that can work with you on the canvas. Fairies can work alone or as a team. There is no limit to what a fairy can do. Nobody knows where they came from." />
				</p>

				<p className={styles.temporaryNotice}>
					<F
						defaultMessage="Fairies are a <strong>temporary</strong> feature. On January 1st, 2026, all fairies will be removed from the application. Perhaps they will return again someday. Your purchase is for access to fairies for December 2025 only."
						values={{
							strong: (chunks) => <strong>{chunks}</strong>,
						}}
					/>
				</p>

				<div className={styles.pricingCard}>
					<div className={styles.pricingCardContent}>
						<div className={styles.pricingInfo}>
							<div className={styles.price}>$25</div>
							<div className={styles.priceDetails}>
								<div className={styles.priceDetail}>
									<F defaultMessage="three fairies" />
								</div>
								<div className={styles.priceDetail}>
									<F defaultMessage="one time payment" />
								</div>
							</div>
						</div>
						<div className={styles.fairyIcons}>
							<Suspense fallback={<div />}>
								<FairySprite pose="idle" hatColor="var(--tl-color-fairy-pink)" />
								<FairySprite pose="reading" hatColor="var(--tl-color-fairy-green)" />
								<FairySprite pose="thinking" hatColor="var(--tl-color-fairy-purple)" />
							</Suspense>
						</div>
					</div>
					<button className={styles.purchaseButton} onClick={handlePurchaseClick}>
						{user ? (
							<F defaultMessage="Purchase Fairy Bundle" />
						) : (
							<F defaultMessage="Start your fairy adventure" />
						)}
					</button>
				</div>

				<footer className={styles.footer}>
					<a href="/privacy.html" className={styles.footerLink}>
						<F defaultMessage="Privacy Policy" />
					</a>
					<a href="/tos.html" className={styles.footerLink}>
						<F defaultMessage="Terms of Service" />
					</a>
					<a href="https://tldraw.dev" className={styles.footerLink}>
						<F defaultMessage="Build with the tldraw SDK" />
					</a>
				</footer>
			</div>
		</div>
	)
}
