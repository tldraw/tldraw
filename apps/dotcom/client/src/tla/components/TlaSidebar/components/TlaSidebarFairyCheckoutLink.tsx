import { MAX_FAIRY_COUNT } from '@tldraw/dotcom-shared'
import { useState } from 'react'
import { Spinner, useValue } from 'tldraw'
import { useApp } from '../../../hooks/useAppState'
import { F, useIntl } from '../../../utils/i18n'
import { customFeatureFlags } from '../../TlaEditor/TlaEditor'
import styles from '../sidebar.module.css'

// Generate fairy quantity options from 1 to MAX_FAIRY_COUNT
const FAIRY_QUANTITY_OPTIONS = Array.from({ length: MAX_FAIRY_COUNT }, (_, i) => i + 1)

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
	const intl = useIntl()
	const [showDropdown, setShowDropdown] = useState(false)
	const [paddleLoaded, setPaddleLoaded] = useState(false)

	// Check if fairy feature is enabled via debug flag
	const fairyEnabled = useValue('fairy_enabled', () => customFeatureFlags.fairies.get(), [])

	// Load Paddle script
	const loadPaddleScript = () => {
		if (paddleLoaded) return

		// Check if script already exists
		if (window.Paddle) {
			setPaddleLoaded(true)
			return
		}

		const script = document.createElement('script')
		script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js'
		script.async = true
		script.onload = () => {
			setPaddleLoaded(true)
		}
		script.onerror = () => {
			console.error('Failed to load Paddle script')
		}

		document.head.appendChild(script)
	}

	// Show button if user doesn't have max fairies yet (allow upsells)
	const user = useValue('user', () => app.getUser(), [app])
	const currentFairyLimit = user?.fairyLimit ?? 0
	const userEmail = user?.email

	// Calculate available quantities (only show options that won't exceed max)
	const remainingFairies = MAX_FAIRY_COUNT - currentFairyLimit
	const availableQuantities = FAIRY_QUANTITY_OPTIONS.filter((qty) => qty <= remainingFairies)

	// Default selection: 3 if available, otherwise the max available
	const [selectedQuantity, setSelectedQuantity] = useState<number>(
		availableQuantities.includes(3) ? 3 : availableQuantities[availableQuantities.length - 1] || 1
	)

	// Early returns after all hooks
	if (!fairyEnabled) return null
	if (currentFairyLimit >= MAX_FAIRY_COUNT) return null

	const handleClick = () => {
		setShowDropdown(!showDropdown)
	}

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

		// Ensure quantity doesn't exceed remaining fairies
		const actualQuantity = Math.min(selectedQuantity, remainingFairies)
		if (actualQuantity <= 0) {
			console.error('No fairies available to purchase')
			return
		}

		// Get env and token from environment variables
		const paddleEnv =
			// @ts-expect-error Vite env vars not typed
			(import.meta.env.VITE_PADDLE_ENVIRONMENT as 'sandbox' | 'production') ?? 'sandbox'
		// @ts-expect-error Vite env vars not typed
		const paddleToken = import.meta.env.VITE_PADDLE_CLIENT_TOKEN
		// @ts-expect-error Vite env vars not typed
		const paddlePriceId = import.meta.env.VITE_PADDLE_FAIRY_PRICE_ID

		if (!paddleToken) {
			console.error('Paddle client token not configured')
			return
		}

		if (!paddlePriceId) {
			console.error('Paddle price ID not configured')
			return
		}

		try {
			window.Paddle.Environment.set(paddleEnv)
			window.Paddle.Initialize({
				token: paddleToken,
				eventCallback: (data) => {
					if (data.name === 'checkout.completed') {
						console.warn('[Paddle] Checkout completed', data.data?.transaction_id)
					}
				},
			})

			// Open checkout with quantity and prepopulated email
			window.Paddle.Checkout.open({
				items: [{ priceId: paddlePriceId, quantity: actualQuantity }],
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

			// Close dropdown after opening checkout
			setShowDropdown(false)
		} catch (error) {
			console.error('Failed to open Paddle checkout:', error)
		}
	}

	return (
		<div className={styles.sidebarDotDevLink}>
			<button
				data-testid="tla-sidebar-fairy-checkout"
				onMouseEnter={loadPaddleScript}
				onClick={handleClick}
				className={styles.sidebarFairyCheckoutButton}
			>
				<span>
					{currentFairyLimit > 0 ? (
						<F defaultMessage="Purchase more fairies" />
					) : (
						<F defaultMessage="Purchase fairy access" />
					)}
				</span>
				<span className={styles.sidebarFairyCheckoutButtonPrice}>
					<F defaultMessage="$" />
				</span>
			</button>

			{showDropdown && (
				<div className={styles.sidebarFairyCheckoutDropdown}>
					{paddleLoaded ? (
						<>
							{availableQuantities.map((quantity) => (
								<button
									key={quantity}
									onClick={() => setSelectedQuantity(quantity)}
									className={styles.sidebarFairyCheckoutQuantityOption}
									data-selected={quantity === selectedQuantity}
								>
									<span>
										{intl.formatMessage(
											{
												defaultMessage: '{count, plural, one {# fairy} other {# fairies}}',
											},
											{ count: quantity }
										)}
									</span>
									{quantity === 3 && availableQuantities.includes(3) && (
										<span className={styles.sidebarFairyCheckoutQuantityOptionBadge}>
											<F defaultMessage="Recommended" />
										</span>
									)}
								</button>
							))}
							<button onClick={handlePurchase} className={styles.sidebarFairyCheckoutProceedButton}>
								<F defaultMessage="Continue to checkout" />
							</button>
						</>
					) : (
						<div className={styles.sidebarFairyCheckoutLoading}>
							<Spinner />
						</div>
					)}
				</div>
			)}
		</div>
	)
}
