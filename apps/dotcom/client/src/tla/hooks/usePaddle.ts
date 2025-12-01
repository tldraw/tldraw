import { type PaddleCustomData } from '@tldraw/dotcom-shared'
import { useCallback, useEffect, useRef, useState } from 'react'

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
					customData?: PaddleCustomData
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

export function usePaddle() {
	const [paddleLoaded, setPaddleLoaded] = useState(false)
	const scriptLoadingRef = useRef(false)

	const loadPaddleScript = useCallback(() => {
		if (paddleLoaded || window.Paddle || scriptLoadingRef.current) {
			if (window.Paddle) setPaddleLoaded(true)
			return
		}

		// Check if script already exists in DOM
		if (document.querySelector('script[src*="paddle.com/paddle"]')) {
			if (window.Paddle) setPaddleLoaded(true)
			return
		}

		scriptLoadingRef.current = true

		const paddleEnv = (process.env.PADDLE_ENVIRONMENT as 'sandbox' | 'production') ?? 'sandbox'
		const paddleToken = process.env.PADDLE_CLIENT_TOKEN

		if (!paddleToken) {
			scriptLoadingRef.current = false
			return
		}

		const script = document.createElement('script')
		script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js'
		script.async = true
		script.onload = () => {
			scriptLoadingRef.current = false
			if (window.Paddle) {
				window.Paddle.Environment.set(paddleEnv)
				window.Paddle.Initialize({
					token: paddleToken,
					eventCallback: (data) => {
						if (data.name === 'checkout.completed') {
							window.location.href = '/'
						}
					},
				})
				setPaddleLoaded(true)
			}
		}
		script.onerror = () => {
			scriptLoadingRef.current = false
		}

		document.head.appendChild(script)
	}, [paddleLoaded])

	useEffect(() => {
		loadPaddleScript()
	}, [loadPaddleScript])

	const openPaddleCheckout = useCallback((userId: string, email?: string) => {
		if (!window.Paddle) return false

		const paddlePriceId = process.env.PADDLE_FAIRY_PRICE_ID
		if (!paddlePriceId) return false

		try {
			window.Paddle.Checkout.open({
				items: [{ priceId: paddlePriceId, quantity: 1 }],
				customData: { userId, email },
				customer: { email },
				settings: {
					allowDiscountRemoval: false,
					displayMode: 'overlay',
					showAddDiscounts: false,
				},
			})
			return true
		} catch {
			return false
		}
	}, [])

	return { paddleLoaded, openPaddleCheckout }
}
