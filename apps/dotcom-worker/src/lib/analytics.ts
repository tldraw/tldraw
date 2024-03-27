import { TLAnalyticsPoint } from '@tldraw/tlsync'
import { exhaustiveSwitchError } from '@tldraw/utils'
import { Client as PgClient } from 'pg'

const SAMPLE_RATE = 0.05

export function report(client: PgClient, tldraw_env: string, point: TLAnalyticsPoint) {
	try {
		if (shouldSample()) {
			let promise = null

			switch (point.type) {
				case 'outstanding_data_messages': {
					promise = client.query(
						'INSERT INTO outstanding_data_messages (tldraw_env, length, num_clients) VALUES ($1, $2, $3)',
						[tldraw_env, point.length, point.num_clients] as any[]
					)
					break
				}
				default:
					exhaustiveSwitchError(point.type)
			}

			promise!.catch((e) => {
				console.error('Error reporting an analytic point of type', point.type, e)
			})
		}
	} catch (e) {
		console.error('Error reporting an analytic point of type', point.type, e)
	}
}

function shouldSample() {
	return Math.random() < SAMPLE_RATE
}
