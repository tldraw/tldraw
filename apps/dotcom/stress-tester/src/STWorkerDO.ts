import { Zero } from '@tldraw/dotcom-shared'
import { assertExists } from '@tldraw/utils'
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
		const polyfill = new Zero({
			getUri: async () => {
				const u = new URL(uri)
				u.searchParams.set('accessToken', `${this.env.TEST_AUTH_SECRET}:${await this.getId()}`)
				return u.toString()
			},
			onMutationRejected: () => console.log('Mutation rejected'),
			onClientTooOld: () => console.log('Client too old'),
		})

		const id = await this.getId()
		await polyfill.query.user.where('id', id).preload().complete
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
			polyfill.mutate.user.create(defaultUser)
		}
	}

	start(maxDelay: number, id: string, uri: string) {
		this.state.storage.put('id', id)
		const delay = Math.floor(Math.random() * maxDelay)
		setTimeout(() => this.startWorking(uri), delay)
	}

	async getId(): Promise<string> {
		return assertExists(await this.state.storage.get('id')) as string
	}
}
