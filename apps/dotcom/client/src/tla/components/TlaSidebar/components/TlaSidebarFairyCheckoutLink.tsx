import { useCallback, useEffect, useState } from 'react'
import { useValue } from 'tldraw'
import { isStagingEnv } from '../../../../utils/env'
import { useApp } from '../../../hooks/useAppState'
import { useFairyLimit } from '../../../hooks/useFairyAccess'
import { F } from '../../../utils/i18n'
import styles from '../sidebar.module.css'

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

export function TlaSidebarFairyCheckoutLink() {
	const app = useApp()
	const [paddleLoaded, setPaddleLoaded] = useState(false)

	// Load Paddle script
	const loadPaddleScript = useCallback(() => {
		if (paddleLoaded) return

		// Check if script already exists
		if (window.Paddle) {
			setPaddleLoaded(true)
			return
		}

		// Get env and token from environment variables
		const paddleEnv =
			// @ts-expect-error Vite env vars not typed
			(import.meta.env.PADDLE_ENVIRONMENT as 'sandbox' | 'production') ?? 'sandbox'
		// @ts-expect-error Vite env vars not typed
		const paddleToken = import.meta.env.PADDLE_CLIENT_TOKEN

		if (!paddleToken) {
			console.error('Paddle client token not configured')
			return
		}

		const script = document.createElement('script')
		script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js'
		script.async = true
		script.onload = () => {
			// Initialize Paddle once when script loads
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

	// Show button only if user has no fairy access
	const currentFairyLimit = useFairyLimit()
	const user = useValue('user', () => app.getUser(), [app])
	const userEmail = user?.email

	// Load Paddle on mount
	useEffect(() => {
		loadPaddleScript()
	}, [loadPaddleScript])

	// Early returns after all hooks
	if (currentFairyLimit === null || currentFairyLimit > 0) return null // Hide button if user already has access
	if (isStagingEnv) return null

	const handlePurchase = () => {
		const userId = app.userId
		if (!userId) {
			console.error('No user ID found')
			return
		}

		// Wait for Paddle to load
		if (!paddleLoaded || !window.Paddle) {
			console.error('Paddle.js not loaded yet')
			return
		}

		// @ts-expect-error Vite env vars not typed
		const paddlePriceId = import.meta.env.PADDLE_FAIRY_PRICE_ID

		if (!paddlePriceId) {
			console.error('Paddle price ID not configured')
			return
		}

		try {
			// Open checkout with quantity 1 (which grants 3 fairies)
			window.Paddle.Checkout.open({
				items: [{ priceId: paddlePriceId, quantity: 1 }],
				customData: {
					userId,
				},
				customer: {
					email: userEmail,
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

	return (
		<div className={styles.sidebarDotDevLink}>
			<button
				data-testid="tla-sidebar-fairy-checkout"
				onClick={handlePurchase}
				className={styles.sidebarFairyCheckoutButton}
			>
				<span>
					<F defaultMessage="Purchase fairy access" />
				</span>
				<span className={styles.sidebarFairyCheckoutButtonPrice}>
					<F defaultMessage="$" />
				</span>
			</button>
		</div>
	)
}
