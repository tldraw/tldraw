import { createRouter } from '@tldraw/worker-shared'
import { StatusError, json } from 'itty-router'
import { type Environment } from './types'

interface PaddlePrice {
	id: string
	product_id: string
	description: string
	unit_price: {
		amount: string
		currency_code: string
	}
	custom_data?: {
		fairyLimit?: string
	}
}

interface PaddleListPricesResponse {
	data: PaddlePrice[]
}

export interface FairyPriceOption {
	priceId: string
	fairyLimit: number
	amount: string
	currency: string
}

async function fetchPaddlePrices(env: Environment): Promise<FairyPriceOption[]> {
	const apiKey = env.PADDLE_API_KEY
	const productId = env.PADDLE_PRODUCT_ID
	const paddleEnv = env.PADDLE_ENVIRONMENT ?? 'sandbox'

	if (!apiKey) {
		throw new StatusError(500, 'PADDLE_API_KEY not configured')
	}

	if (!productId) {
		throw new StatusError(500, 'PADDLE_PRODUCT_ID not configured')
	}

	// Determine API base URL based on environment
	const baseUrl =
		paddleEnv === 'production' ? 'https://api.paddle.com' : 'https://sandbox-api.paddle.com'

	// Fetch prices from Paddle API
	const url = `${baseUrl}/prices?product_id=${productId}&status=active`

	const response = await fetch(url, {
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
		},
	})

	if (!response.ok) {
		throw new StatusError(response.status, `Paddle API error: ${response.statusText}`)
	}

	const data = (await response.json()) as PaddleListPricesResponse

	// Filter and transform prices that have fairyLimit in custom_data
	const fairyPrices: FairyPriceOption[] = []

	for (const price of data.data) {
		// Only include prices with fairyLimit in custom_data
		if (price.custom_data?.fairyLimit) {
			const fairyLimit = parseInt(price.custom_data.fairyLimit, 10)
			if (!isNaN(fairyLimit) && fairyLimit > 0) {
				// Convert amount from cents to dollars
				const amountInDollars = (parseInt(price.unit_price.amount, 10) / 100).toFixed(2)

				fairyPrices.push({
					priceId: price.id,
					fairyLimit,
					amount: amountInDollars,
					currency: price.unit_price.currency_code,
				})
			}
		}
	}

	// Sort by fairyLimit ascending
	fairyPrices.sort((a, b) => a.fairyLimit - b.fairyLimit)

	return fairyPrices
}

export const fairyPricingRoutes = createRouter<Environment>().get(
	'/app/fairy/prices',
	async (_req, env) => {
		try {
			const prices = await fetchPaddlePrices(env)
			return json({ prices })
		} catch (error) {
			console.error('[Fairy Pricing] Error fetching prices:', error)
			if (error instanceof StatusError) {
				return json({ error: error.message }, { status: error.status })
			}
			return json({ error: 'Internal server error' }, { status: 500 })
		}
	}
)
