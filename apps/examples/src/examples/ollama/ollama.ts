import ollama, { Message } from 'ollama/browser'
import { atom, computed, react, structuredClone, transact, uniqueId } from 'tldraw'
import { systemPrompt } from './system-prompt-2'

export type LMMessage = {
	from: 'user' | 'assistant' | 'system'
	time: number
	content: string
}

export type LMThread = {
	id: string
	state: 'idle' | 'waiting'
	content: Message[]
}

export type LMSerialized = {
	currentThreadId: string
	threads: Record<string, LMThread>
}

class ModelManager {
	constructor() {
		this.load()

		react('persist on change', () => {
			this.persist()
		})
	}

	@computed getState() {
		return this.getThread().state
	}

	_threads = atom<Record<string, LMThread>>('threads', {})

	_currentThreadId = atom<string>('currentThreadId', 'a0')

	@computed getCurrentThreadId() {
		return this._currentThreadId.get()
	}

	@computed getThreads(): Record<string, LMThread> {
		return this._threads.get()
	}

	@computed getThread(): LMThread {
		return this.getThreads()[this.getCurrentThreadId()]
	}

	private addQueryToThread(message: Message) {
		this._threads.update((threads) => {
			const thread = this.getThread()
			if (!thread) throw Error('No thread found')
			const next = structuredClone(thread)
			next.content.push(message)
			next.state = 'waiting'
			return { ...threads, [next.id]: next }
		})
	}

	private addResponseToThread(message: Message) {
		this._threads.update((threads) => {
			const thread = this.getThread()
			if (!thread) throw Error('No thread found')
			const next = structuredClone(thread)
			next.state === 'idle'
			next.content.push(message)
			return { ...threads, [next.id]: next }
		})
	}

	private addChunkToThread(chunk: string) {
		this._threads.update((threads) => {
			const currentThreadId = this.getCurrentThreadId()
			const thread = this.getThreads()[currentThreadId]
			if (!thread) throw Error('No thread found')

			const next = structuredClone(thread)
			const message = next.content.pop()

			if (!message || message.role !== 'user') {
				next.content.push({
					role: 'user',
					content: chunk,
					images: [],
				})
				return { ...threads, [currentThreadId]: next }
			}

			message.content += chunk
			next.content.push(message)
			return { ...threads, [currentThreadId]: next }
		})
	}

	/**
	 * Serialize the model.
	 */
	private serialize() {
		return {
			currentThreadId: this.getCurrentThreadId(),
			threads: this.getThreads(),
		}
	}

	/**
	 * Deserialize the model.
	 */
	private deserialize() {
		let result: LMSerialized = {
			currentThreadId: 'a0',
			threads: {
				a0: {
					id: 'a0',
					state: 'idle',
					content: [],
				},
			},
		}

		try {
			const stringified = localStorage.getItem('threads_1')
			if (stringified) {
				const json = JSON.parse(stringified)
				result = json
			}
		} catch (e) {
			// noop
		}

		return result
	}

	private persist() {
		localStorage.setItem('threads_1', JSON.stringify(this.serialize()))
	}

	private load() {
		const serialized = this.deserialize()
		transact(() => {
			this._currentThreadId.set(serialized.currentThreadId)
			this._threads.set(serialized.threads)
		})
	}

	private getMessagesFromThread(thread: LMThread) {
		return thread.content
	}

	/* --------------------- Public --------------------- */

	/**
	 * Start a new thread.
	 */
	startNewThread() {
		this._threads.update((threads) => {
			const id = uniqueId()
			return {
				...threads,
				[id]: {
					id,
					state: 'idle',
					content: [],
				},
			}
		})
	}

	/**
	 * Cancel the current query.
	 */
	cancel() {
		this._threads.update((threads) => {
			const thread = this.getThread()
			if (!thread) throw Error('No thread found')
			const next = structuredClone(thread)
			if (next.content.length > 0) {
				if (next.content[next.content.length - 1].role === 'assistant') {
					next.content.pop()
				}
				if (next.content[next.content.length - 1].role === 'user') {
					next.content.pop()
				}
			}
			next.state = 'idle'
			return { ...threads, [next.id]: next }
		})
	}

	/**
	 * Query the model.
	 */
	query(query: string, image?: string) {
		this.addQueryToThread({ role: 'user', content: query, images: image ? [image] : [] })
		const currentThreadId = this.getCurrentThreadId()
		let cancelled = false
		const messages = this.getMessagesFromThread(this.getThread())
		return {
			response: ollama
				.generate({
					model: 'llava',
					system: messages[0].content,
					prompt: messages[messages.length - 1].content,
					images: messages[messages.length - 1].images,
					keep_alive: 1000,
					stream: false,
					format: 'json',
					options: {},
				})
				.then((r) => {
					if (cancelled) return
					if (this.getCurrentThreadId() !== currentThreadId) return
					// this.addResponseToThread(r.response)
					const message = {
						role: 'user',
						content: r.response,
						images: [],
					}
					this.addResponseToThread(message)
					return message
				}),
			cancel: () => {
				cancelled = true
				this.cancel()
			},
		}
	}

	/**
	 * Query the model and stream the response.
	 */
	stream(query: string, image?: string) {
		const currentThreadId = this.getCurrentThreadId()
		this.addQueryToThread({
			role: 'user',
			content: query,
			images: image ? [image] : [],
		})
		const messages = [...this.getMessagesFromThread(this.getThread())]
		this.addResponseToThread({
			role: 'assistant',
			content: '',
			images: [],
		}) // Add an empty response to start the thread
		let cancelled = false
		return {
			response: ollama
				.chat({
					model: 'llava',
					messages: messages,
					keep_alive: 1000,
					stream: true,
					options: {},
				})
				.then(async (response) => {
					for await (const part of response) {
						if (cancelled) return
						if (this.getCurrentThreadId() !== currentThreadId) return
						const next = structuredClone(this.getThread())
						const message = next.content[next.content.length - 1]
						message.content += part.message.content
						this._threads.update((threads) => ({
							...threads,
							[next.id]: next,
						}))
					}

					if (cancelled) return
					if (this.getCurrentThreadId() !== currentThreadId) return

					this._threads.update((threads) => {
						const thread = this.getThread()
						if (!thread) throw Error('No thread found')
						const next = structuredClone(thread)
						next.state = 'idle'
						return { ...threads, [next.id]: next }
					})

					const thread = this.getThread()
					return thread.content[thread.content.length - 1]
				}),
			cancel: () => {
				cancelled = true
				this.cancel()
			},
		}
	}

	// getWithImage(query: string, image?: string) {
	// 	const currentThreadId = this.getCurrentThreadId()
	// 	this.addQueryToThread({ role: "user", content: query, images: image ? [image] : [])
	// 	let cancelled = false

	// 	return {
	// 		response: ollama
	// 			.generate({
	// 				model: 'llava',
	// 				prompt: query,
	// 				images: [image],
	// 			})
	// 			.then((d: any) => {
	// 				if (cancelled) return
	// 				if (this.getCurrentThreadId() !== currentThreadId) return
	// 				this.addResponseToThread(d.response)
	// 				this._threads.update((threads) => {
	// 					const thread = this.getThread()
	// 					if (!thread) throw Error('No thread found')
	// 					const next = structuredClone(thread)

	// 					next.state = 'idle'
	// 					return { ...threads, [next.id]: next }
	// 				})

	// 				const thread = this.getThread()
	// 				return thread.content[thread.content.length - 1]
	// 			}),
	// 		cancel: () => {
	// 			cancelled = true
	// 			this.cancel()
	// 		},
	// 	}
	// }

	/**
	 * Clear all threads.
	 */
	clear() {
		transact(() => {
			this._currentThreadId.set('a0')
			this._threads.set({
				a0: {
					id: 'a0',
					state: 'idle',
					content: [
						{
							role: 'system',
							content: systemPrompt,
							images: [],
						},
					],
				},
			})
		})
	}
}

export const modelManager = new ModelManager()
