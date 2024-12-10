import { Z_PROTOCOL_VERSION, Zero } from '@tldraw/dotcom-shared'
import { assertExists, time } from '@tldraw/utils'
import { DurableObject } from 'cloudflare:workers'
import { Environment } from './types'

export class STWorkerDO extends DurableObject<Environment> {
	constructor(
		private state: DurableObjectState,
		env: Environment
	) {
		super(state, env)
	}
	override async fetch(request: Request) {
		return new Response('Hello, world!', { status: 200 })
	}

	private async startWorking(uri: string) {
		try {
			const id = await this.getId()
			const polyfill = new Zero({
				getUri: async () => {
					const u = new URL(uri)
					u.pathname = `/app/${id}/connect`
					u.searchParams.set('accessToken', `${this.env.TEST_AUTH_SECRET}:${id}`)
					u.searchParams.set('sessionId', id)
					u.searchParams.set('protocolVersion', String(Z_PROTOCOL_VERSION))
					return u.toString()
				},
				onMutationRejected: () => console.log('Mutation rejected'),
				onClientTooOld: () => console.log('Client too old'),
			})

			console.log('got polyfill')

			await polyfill.query.user.where('id', id).preload().complete
			console.log('preloaded')
			const user = polyfill.store.getFullData()?.user

			if (!user) {
				const defaultUser = {
					id,
					name: 'Test User',
					email: `${id}@example.com`,
					color: 'salmon',
					avatar: '',
					exportFormat: 'png',
					exportTheme: 'light',
					exportBackground: false,
					exportPadding: false,
					createdAt: 1731610733963,
					updatedAt: 1731610733963,
					flags: '',
					locale: null,
					animationSpeed: null,
					edgeScrollSpeed: null,
					colorScheme: null,
					isSnapMode: null,
					isWrapMode: null,
					isDynamicSizeMode: null,
					isPasteAtCursorMode: null,
				}
				const start = Date.now()
				const res = await time(() => {
					return polyfill.sneakyTransaction(() => {
						polyfill.mutate.user.create(defaultUser)
					})
				})
				if (res.ok) {
					console.log('created user in', res.value[0], 'ms')
				} else {
					// handle failure
					console.log('created user in', Date.now() - start)
				}
			}
		} catch (e) {
			console.error(e)
		}
	}

	async start(maxDelay: number, id: string, uri: string) {
		console.log('starting worker', id, maxDelay)
		this.state.storage.put('id', id)
		const delay = Math.floor(Math.random() * maxDelay)
		setTimeout(() => this.startWorking(uri), delay)
	}

	async getId(): Promise<string> {
		return assertExists(await this.state.storage.get('id')) as string
	}
}
