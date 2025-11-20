import { hasActiveFairyAccess } from '@tldraw/dotcom-shared'
import { fetch } from '@tldraw/utils'
import { useState } from 'react'
import { useValue } from 'tldraw'
import { useApp } from '../../../hooks/useAppState'
import { F, useIntl } from '../../../utils/i18n'
import { customFeatureFlags } from '../../TlaEditor/TlaEditor'
import styles from '../sidebar.module.css'

interface FairyPriceOption {
	priceId: string
	fairyLimit: number
	amount: string
	currency: string
}

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
				}): void
			}
		}
	}
}

export function TlaSidebarFairyCheckoutLink() {
	const app = useApp()
	const intl = useIntl()
	const [prices, setPrices] = useState<FairyPriceOption[]>([])
	const [selectedPriceId, setSelectedPriceId] = useState<string | null>(null)
	const [loading, setLoading] = useState(false)
	const [showDropdown, setShowDropdown] = useState(false)

	// Check if fairy feature is enabled via debug flag
	const fairyEnabled = useValue('fairy_enabled', () => customFeatureFlags.fairies.get(), [])
	if (!fairyEnabled) return null

	// Don't show button if user already has active fairy access
	const user = app.getUser()
	const userHasActiveFairyAccess = hasActiveFairyAccess(user?.fairyAccessExpiresAt)
	if (userHasActiveFairyAccess) return null

	const handleClick = async () => {
		// If already open, just close
		if (showDropdown) {
			setShowDropdown(false)
			return
		}

		// If prices already loaded, just open
		if (prices.length > 0) {
			setShowDropdown(true)
			return
		}

		// Fetch prices
		setLoading(true)
		try {
			const response = await fetch('/api/app/fairy/prices')
			if (!response.ok) {
				console.error('Failed to fetch fairy prices')
				return
			}
			const data = await response.json()
			setPrices(data.prices || [])
			// Select 3 fairies by default (recommended), fallback to first price
			if (data.prices && data.prices.length > 0) {
				const recommendedPrice = data.prices.find((p: FairyPriceOption) => p.fairyLimit === 3)
				setSelectedPriceId(recommendedPrice?.priceId || data.prices[0].priceId)
			}
			setShowDropdown(true)
		} catch (error) {
			console.error('Error fetching fairy prices:', error)
		} finally {
			setLoading(false)
		}
	}

	const handlePurchase = () => {
		const userId = app.userId
		if (!userId) {
			console.error('No user ID found')
			return
		}

		if (!selectedPriceId) {
			console.error('No price selected')
			return
		}

		// Initialize Paddle if not already initialized
		if (!window.Paddle) {
			console.error('Paddle.js not loaded')
			return
		}

		// Get env from environment variable or default to sandbox
		const paddleEnv =
			// @ts-expect-error Vite env vars not typed
			(import.meta.env.VITE_PADDLE_ENVIRONMENT as 'sandbox' | 'production') ?? 'sandbox'
		// @ts-expect-error Vite env vars not typed
		const paddleToken = import.meta.env.VITE_PADDLE_CLIENT_TOKEN

		if (!paddleToken) {
			console.error('Paddle client token not configured')
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

			// Open checkout with custom_data
			window.Paddle.Checkout.open({
				items: [{ priceId: selectedPriceId, quantity: 1 }],
				customData: {
					userId,
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
				disabled={loading}
				style={{
					cursor: loading ? 'wait' : 'pointer',
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
				<span style={{ marginLeft: '8px' }}>{loading ? '...' : '$'}</span>
			</button>

			{showDropdown && prices.length > 0 && (
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
					{prices.map((price) => (
						<button
							key={price.priceId}
							onClick={() => setSelectedPriceId(price.priceId)}
							style={{
								width: '100%',
								padding: '8px',
								border: 'none',
								background:
									price.priceId === selectedPriceId ? 'var(--tla-color-hover-2)' : 'transparent',
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
										defaultMessage: '{count, plural, one {# fairy} other {# fairies}} - ${amount}',
									},
									{ count: price.fairyLimit, amount: price.amount }
								)}
							</span>
							{price.fairyLimit === 3 && (
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
