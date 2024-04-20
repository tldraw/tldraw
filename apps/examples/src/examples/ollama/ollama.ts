import { ChatOllama } from '@langchain/community/chat_models/ollama'
import { AIMessage, HumanMessage } from '@langchain/core/messages'
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts'
import { ConversationChain } from 'langchain/chains'
import { BufferMemory, ChatMessageHistory } from 'langchain/memory'
import { atom, computed, react, structuredClone, transact, uniqueId } from 'tldraw'
import { systemPrompt } from './system-prompt'

type Message = {
	from: 'user' | 'model'
	time: number
	content: string
}

type Thread = {
	id: string
	state: 'idle' | 'waiting'
	content: Message[]
}

type Serialized = {
	currentThreadId: string
	threads: Record<string, Thread>
}

class ModelManager {
	model: ChatOllama
	prompt: ChatPromptTemplate
	memory: BufferMemory
	chain: ConversationChain

	constructor() {
		this.load()

		this.model = new ChatOllama({
			baseUrl: 'http://localhost:11434', // Default value
			model: 'llama3:latest',
		})

		this.prompt = ChatPromptTemplate.fromMessages([
			[
				'system',
				// "You are a kind and helpful chatbot. You always provide short, efficient answers to the user's questions.",
				systemPrompt,
			],
			new MessagesPlaceholder('history'),
			['human', '{input}'],
		])

		this.memory = new BufferMemory({
			memoryKey: 'history',
			returnMessages: true,
			chatHistory: new ChatMessageHistory(this.getMessagesFromThread(this.getThread())),
		})

		this.chain = new ConversationChain({
			llm: this.model,
			prompt: this.prompt,
			memory: this.memory,
		})

		react('persist on change', () => {
			this.persist()
		})
	}

	@computed getState() {
		return this.getThread().state
	}

	_threads = atom<Record<string, Thread>>('threads', {})

	_currentThreadId = atom<string>('currentThreadId', 'a0')

	@computed getCurrentThreadId() {
		return this._currentThreadId.get()
	}

	@computed getThreads(): Record<string, Thread> {
		return this._threads.get()
	}

	@computed getThread(): Thread {
		return this.getThreads()[this.getCurrentThreadId()]
	}

	private addQueryToThread(query: string) {
		this._threads.update((threads) => {
			const thread = this.getThread()
			if (!thread) throw Error('No thread found')
			const next = structuredClone(thread)
			next.content.push({
				from: 'user',
				time: Date.now(),
				content: query,
			})
			next.state = 'waiting'
			return { ...threads, [next.id]: next }
		})
	}

	private addResponseToThread(response: string) {
		this._threads.update((threads) => {
			const thread = this.getThread()
			if (!thread) throw Error('No thread found')
			const next = structuredClone(thread)
			next.state === 'idle'
			next.content.push({
				from: 'model',
				time: Date.now(),
				content: response,
			})
			return { ...threads, [next.id]: next }
		})
	}

	private addChunkToThread(chunk: string) {
		this._threads.update((threads) => {
			const currentThreadId = this.getCurrentThreadId()
			const thread = this.getThreads()[currentThreadId]
			if (!thread) throw Error('No thread found')

			const next = structuredClone(thread)
			const message = next.content[next.content.length - 1]

			if (!message || message.from === 'user') {
				next.content = [
					...next.content,
					{
						from: 'model',
						time: Date.now(),
						content: chunk,
					},
				]
				return { ...threads, [currentThreadId]: next }
			}

			message.content += chunk
			message.time = Date.now()
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
		let result: Serialized = {
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

	private getMessagesFromThread(thread: Thread) {
		return thread.content.map((m) => {
			if (m.from === 'user') {
				return new HumanMessage(m.content)
			}
			return new AIMessage(m.content)
		})
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
				if (next.content[next.content.length - 1].from === 'model') {
					next.content.pop()
				}
				if (next.content[next.content.length - 1].from === 'user') {
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
	async query(query: string) {
		this.addQueryToThread(query)
		const currentThreadId = this.getCurrentThreadId()
		let cancelled = false
		return {
			response: await this.chain.invoke({ input: query }).then((r) => {
				if (cancelled) return
				if (this.getCurrentThreadId() !== currentThreadId) return
				if ('response' in r) {
					this.addResponseToThread(r.response)
				}
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
	async stream(query: string) {
		transact(() => {
			const currentThreadId = this.getCurrentThreadId()
			this.addQueryToThread(query)
			this.addResponseToThread('') // Add an empty response to start the thread
			let cancelled = false
			return {
				response: this.chain
					.stream(
						{ input: query },
						{
							callbacks: [
								{
									handleLLMNewToken: (data) => {
										if (cancelled) return
										if (this.getCurrentThreadId() !== currentThreadId) return
										this.addChunkToThread(data)
									},
								},
							],
						}
					)
					.then(() => {
						if (cancelled) return
						if (this.getCurrentThreadId() !== currentThreadId) return
						this._threads.update((threads) => {
							const thread = this.getThread()
							if (!thread) throw Error('No thread found')
							const next = structuredClone(thread)
							next.state = 'idle'
							return { ...threads, [next.id]: next }
						})
					}),
				cancel: () => {
					cancelled = true
					this.cancel()
				},
			}
		})
	}

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
					content: [],
				},
			})
			this.memory.clear()
		})
	}
}

export const modelManager = new ModelManager()
