import { hasActiveFairyAccess, MAX_FAIRY_COUNT } from '@tldraw/dotcom-shared'
import { useState } from 'react'
import { useValue } from 'tldraw'
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
	const [selectedQuantity, setSelectedQuantity] = useState<number>(3) // Default to 3 (recommended)
	const [showDropdown, setShowDropdown] = useState(false)

	// Check if fairy feature is enabled via debug flag
	const fairyEnabled = useValue('fairy_enabled', () => customFeatureFlags.fairies.get(), [])
	if (!fairyEnabled) return null

	// Don't show button if user already has active fairy access
	const user = app.getUser()
	const userHasActiveFairyAccess = hasActiveFairyAccess(user?.fairyAccessExpiresAt)
	if (userHasActiveFairyAccess) return null

	const handleClick = () => {
		setShowDropdown(!showDropdown)
	}

	const handlePurchase = () => {
		const userId = app.userId
		if (!userId) {
			console.error('No user ID found')
			return
		}

		// Initialize Paddle if not already initialized
		if (!window.Paddle) {
			console.error('Paddle.js not loaded')
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
				items: [{ priceId: paddlePriceId, quantity: selectedQuantity }],
				customData: {
					userId,
				},
				customer: {
					email: user?.email,
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
		<div className={styles.sidebarDotDevLink} style={{ position: 'relative' }}>
			<button
				data-testid="tla-sidebar-fairy-checkout"
				onClick={handleClick}
				style={{
					cursor: 'pointer',
					padding: '0px 8px',
					width: '100%',
					height: '100%',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					background: 'transparent',
					border: 'none',
					color: 'inherit',
					fontSize: 'inherit',
				}}
			>
				<span>
					<F defaultMessage="Purchase fairy access" />
				</span>
				<span style={{ marginLeft: '8px' }}>$</span>
			</button>

			{showDropdown && (
				<div
					style={{
						position: 'absolute',
						bottom: '100%',
						left: '1px',
						right: '1px',
						backgroundColor: 'var(--tla-color-panel)',
						border: '1px solid var(--tla-color-text-2)',
						borderRadius: '4px',
						marginBottom: '4px',
						overflow: 'hidden',
						zIndex: 1000,
					}}
				>
					{FAIRY_QUANTITY_OPTIONS.map((quantity) => (
						<button
							key={quantity}
							onClick={() => setSelectedQuantity(quantity)}
							style={{
								width: '100%',
								padding: '8px',
								border: 'none',
								background:
									quantity === selectedQuantity ? 'var(--tla-color-hover-2)' : 'transparent',
								color: 'var(--tla-color-text-1)',
								cursor: 'pointer',
								textAlign: 'left',
								fontSize: '12px',
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'center',
							}}
						>
							<span>
								{intl.formatMessage(
									{
										defaultMessage: '{count, plural, one {# fairy} other {# fairies}}',
									},
									{ count: quantity }
								)}
							</span>
							{quantity === 3 && (
								<span
									style={{
										fontSize: '10px',
										padding: '2px 6px',
										borderRadius: '3px',
										border: '1px solid var(--tla-color-accent)',
										color: 'var(--tla-color-accent)',
										fontWeight: 'bold',
									}}
								>
									<F defaultMessage="Recommended" />
								</span>
							)}
						</button>
					))}
					<button
						onClick={handlePurchase}
						style={{
							width: '100%',
							padding: '8px',
							border: 'none',
							borderTop: '1px solid var(--tla-color-text-2)',
							background: 'var(--tla-color-hover-2)',
							color: 'var(--tla-color-text-1)',
							cursor: 'pointer',
							textAlign: 'center',
							fontSize: '12px',
							fontWeight: 'bold',
						}}
					>
						<F defaultMessage="Continue to checkout" />
					</button>
				</div>
			)}
		</div>
	)
}
