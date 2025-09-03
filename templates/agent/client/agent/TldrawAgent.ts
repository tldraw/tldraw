import { atom, Editor, RecordsDiff, structuredClone, TLRecord } from 'tldraw'
import { AgentActionUtil } from '../../shared/actions/AgentActionUtil'
import { AgentTransform } from '../../shared/AgentTransform'
import { getAgentActionUtilsRecord, getPromptPartUtilsRecord } from '../../shared/AgentUtils'
import { PromptPartUtil } from '../../shared/parts/PromptPartUtil'
import { AgentAction } from '../../shared/types/AgentAction'
import { AgentInput } from '../../shared/types/AgentInput'
import { AgentPrompt } from '../../shared/types/AgentPrompt'
import { AgentRequest } from '../../shared/types/AgentRequest'
import { IChatHistoryItem } from '../../shared/types/ChatHistoryItem'
import { IContextItem } from '../../shared/types/ContextItem'
import { PromptPart } from '../../shared/types/PromptPart'
import { Streaming } from '../../shared/types/Streaming'
import { TodoItem } from '../../shared/types/TodoItem'
import { AgentModelName, DEFAULT_MODEL_NAME } from '../../worker/models'
import { areContextItemsEqual } from './areContextItemsEqual'
import { dedupeShapesContextItem } from './dedupeShapesContextItem'
import { persistAtomInLocalStorage } from './persistAtomInLocalStorage'
import { requestAgent } from './requestAgent'

export interface TldrawAgentOptions {
	/** The editor to associate the agent with. */
	editor: Editor
	/** A key used to differentiate the agent from other agents. */
	id: string
	/** A callback for when an error occurs. */
	onError: (e: any) => void
}

/**
 * An agent that can be prompted to edit the canvas.
 * Returned by the `useTldrawAgent` hook.
 *
 * @example
 * ```tsx
 * const agent = useTldrawAgent(editor)
 * agent.prompt({ message: 'Draw a snowman' })
 * ```
 */
export class TldrawAgent {
	/** The editor associated with this agent. */
	editor: Editor

	/** An id to differentiate the agent from other agents. */
	id: string

	/** A callback for when an error occurs. */
	onError: (e: any) => void

	/** Whether the agent has been disposed or not. */
	disposed = false

	/**
	 * An atom containing the currently active request.
	 * This is mainly used to render highlights and other UI elements.
	 */
	$activeRequest = atom<AgentRequest | null>('activeRequest', null)

	/**
	 * An atom containing the next request that the agent has scheduled for itself.
	 * Null if there is no scheduled request.
	 */
	$scheduledRequest = atom<AgentRequest | null>('scheduledRequest', null)

	/**
	 * An atom containing the todo list that the agent may write for itself.
	 */
	$todoList = atom<TodoItem[]>('todoList', [])

	/**
	 * An atom containing the chat history.
	 */
	$chatHistory = atom<IChatHistoryItem[]>('chatHistory', [])

	/**
	 * An atom that's used to store document changes made by the user since the previous request.
	 */
	$userActionHistory = atom<RecordsDiff<TLRecord>[]>('userActionHistory', [])

	/**
	 * An atom containing currently selected context items.
	 * By default, selected context items will be included in the agent's next request.
	 */
	$contextItems = atom<IContextItem[]>('contextItems', [])

	/**
	 * An atom containing the model name that the user has selected.
	 * This model name will be passed through to prompts unless manually overridden.
	 * Note: Prompt part utils may ignore or override this value. See the ModelNamePartUtil for an example.
	 */
	$modelName = atom<AgentModelName>('modelName', DEFAULT_MODEL_NAME)

	/**
	 * Create a new tldraw agent.
	 */
	constructor({ editor, id, onError }: TldrawAgentOptions) {
		this.editor = editor
		this.id = id
		this.onError = onError

		this.agentActionUtils = getAgentActionUtilsRecord()
		this.promptPartUtils = getPromptPartUtilsRecord()
		this.unknownActionUtil = this.agentActionUtils.unknown

		persistAtomInLocalStorage(this.$chatHistory, `${id}:chat-history-items`)
		persistAtomInLocalStorage(this.$todoList, `${id}:todo-items`)
		persistAtomInLocalStorage(this.$contextItems, `${id}:context-items`)
		persistAtomInLocalStorage(this.$modelName, `${id}:model-name`)

		this.stopRecordingFn = this.startRecordingUserActions()
	}

	/**
	 * Dispose of the agent by cancelling requests and stopping listeners.
	 */
	dispose() {
		this.disposed = true
		this.cancel()
		this.stopRecordingUserActions()
	}

	/**
	 * Get an agent action util for a specific action type.
	 *
	 * @param type - The type of action to get the util for.
	 * @returns The action util.
	 */
	getAgentActionUtil(type?: string) {
		if (!type) return this.unknownActionUtil
		const util = this.agentActionUtils[type as AgentAction['_type']]
		if (!util) return this.unknownActionUtil
		return util
	}

	/**
	 * Get a prompt part util for a specific part type.
	 *
	 * @param type - The type of part to get the util for.
	 * @returns The part util.
	 */
	getPromptPartUtil(type: PromptPart['type']) {
		return this.promptPartUtils[type]
	}

	/**
	 * A record of the agent's action util instances.
	 * Used by the `getAgentActionUtil` method.
	 */
	agentActionUtils: Record<AgentAction['_type'], AgentActionUtil<AgentAction>>

	/**
	 * The agent action util instance for the "unknown" action type.
	 * Returned by the `getAgentActionUtil` method when the action type isn't properly specified.
	 * This can happen if the model isn't finished streaming yet or makes a mistake.
	 */
	unknownActionUtil: AgentActionUtil<AgentAction>

	/**
	 * A record of the agent's prompt part util instances.
	 * Used by the `getPromptPartUtil` method.
	 */
	promptPartUtils: Record<PromptPart['type'], PromptPartUtil<PromptPart>>

	/**
	 * Get a full agent request from a user input.
	 * @param input - A partial agent request or a string message.
	 */
	getRequestFromInput(input: AgentInput): AgentRequest {
		if (typeof input === 'string') {
			input = { message: input }
		}

		const request: AgentRequest = {
			message: input.message ?? '',
			bounds: input.bounds ?? this.editor.getViewportPageBounds(),
			contextItems: input.contextItems ?? this.$contextItems.get(),
			selectedShapes: input.selectedShapes ?? [],
			modelName: input.modelName ?? this.$modelName.get(),
			type: input.type ?? 'user',
		}

		return request
	}

	/**
	 * Get a full prompt based on a request.
	 *
	 * @param request - The request to use for the prompt.
	 * @param transform - The transform to use.
	 * @returns The fully assembled prompt.
	 */
	async preparePrompt(request: AgentRequest, transform: AgentTransform): Promise<AgentPrompt> {
		const { promptPartUtils } = this
		const transformedParts: PromptPart[] = []

		for (const util of Object.values(promptPartUtils)) {
			const untransformedPart = await util.getPart(request, this)
			const transformedPart = util.transformPart(untransformedPart, transform)
			if (!transformedPart) continue
			transformedParts.push(transformedPart)
		}

		const agentPrompt = Object.fromEntries(transformedParts.map((part) => [part.type, part]))

		console.log('PROMPT', agentPrompt)
		return agentPrompt as AgentPrompt
	}

	/**
	 * Prompt the agent to edit the canvas.
	 *
	 * @example
	 * ```tsx
	 * const agent = useTldrawAgent({ editor })
	 * agent.prompt({ message: 'Draw a snowman' })
	 * ```
	 *
	 * @returns A promise that resolves when the agent has finished its work.
	 */
	async prompt(input: AgentInput) {
		const request = this.getRequestFromInput(input)

		// Submit the request to the agent.
		await this.request(request)

		// After the request is handled, check if there are any outstanding todo items or requests
		let scheduledRequest = this.$scheduledRequest.get()
		const todoItemsRemaining = this.$todoList.get().filter((item) => item.status !== 'done')

		if (!scheduledRequest) {
			// If there no outstanding todo items or requests, finish
			if (todoItemsRemaining.length === 0) {
				return
			}

			// If there are outstanding todo items, schedule a continue request
			scheduledRequest = {
				message: request.message,
				contextItems: request.contextItems,
				bounds: request.bounds,
				modelName: request.modelName,
				selectedShapes: request.selectedShapes,
				type: 'todo',
			}
		}

		// Handle the scheduled request
		this.$scheduledRequest.set(null)
		await this.prompt(scheduledRequest)
	}

	/**
	 * Send a single request to the agent and handle its response.
	 *
	 * Note: This method does not chain multiple requests together. For a full
	 * agentic system, use the `prompt` method.
	 *
	 * Most developers will not want to use this method directly. It's mostly
	 * used internally by the `prompt` method, but can also be useful for
	 * carrying out evals.
	 *
	 * @param input - The input to form the request from.
	 * @returns A promise that resolves when the request is complete and a cancel function to abort the request.
	 */
	async request(input: AgentInput) {
		const request = this.getRequestFromInput(input)

		// Interrupt any currently active request
		if (this.$activeRequest.get() !== null) {
			this.cancel()
		}
		this.$activeRequest.set(request)

		// Call an external helper function to request the agent
		const { promise, cancel } = requestAgent({ agent: this, onError: this.onError, request })

		this.cancelFn = cancel
		promise.finally(() => {
			this.cancelFn = null
		})

		await promise
		this.$activeRequest.set(null)
	}

	/**
	 * Schedule a request for the agent to handle after this one.
	 *
	 * This function takes a callback as an argument. The callback receives the
	 * currently scheduled request (or the default request if there is none) and
	 * should return the desired request.
	 *
	 * @example
	 * ```tsx
	 * agent.schedule(() => 'Add extra detail')
	 * ```
	 *
	 * @example
	 * ```tsx
	 * // Move the viewport 200 pixels to the right
	 * agent.schedule((prev) => ({
	 * 	bounds: {
	 * 		x: prev.bounds.x + 200
	 * 		y: prev.bounds.y,
	 * 		w: prev.bounds.w,
	 * 		h: prev.bounds.h,
	 * 	},
	 * }))
	 * ```
	 *
	 * @param callback
	 */
	schedule(callback: (prev: AgentRequest) => AgentInput) {
		this.$scheduledRequest.update((prev) => {
			const activeRequest = this.$activeRequest.get()
			const currentScheduledRequest = prev ?? {
				message: '',
				contextItems: [],
				modelName: activeRequest?.modelName ?? DEFAULT_MODEL_NAME,
				type: 'schedule',
				bounds: activeRequest?.bounds ?? this.editor.getViewportPageBounds(),
				selectedShapes: activeRequest?.selectedShapes ?? [],
			}

			const partialRequest = callback(currentScheduledRequest)
			return this.getRequestFromInput(partialRequest)
		})
	}

	/**
	 * Make the agent perform an action.
	 * @param action The action to make the agent do.
	 * @returns The diff of the action.
	 */
	act(action: Streaming<AgentAction>) {
		const { editor } = this
		const util = this.getAgentActionUtil(action._type)
		this.isActing = true
		const diff = editor.store.extractingChanges(() => {
			util.applyAction(structuredClone(action), this)
		})
		this.isActing = false

		// Add the action to chat history
		if (util.savesToHistory()) {
			const historyItem: IChatHistoryItem = {
				type: 'action',
				action,
				diff,
				acceptance: 'pending',
			}

			this.$chatHistory.update((items) => {
				// If there are no items, start off the chat history with the first item
				if (items.length === 0) return [historyItem]

				// If the last item is still in progress, replace it with the new item
				const lastItem = items.at(-1)
				if (lastItem && lastItem.type === 'action' && !lastItem.action.complete) {
					return [...items.slice(0, -1), historyItem]
				}

				// Otherwise, just add the new item to the end of the list
				return [...items, historyItem]
			})
		}
		return diff
	}

	/**
	 * A function that cancels the agent's current prompt, if one is active.
	 */
	private cancelFn: (() => void) | null = null

	/**
	 * Cancel the agent's current prompt, if one is active.
	 */
	cancel() {
		this.cancelFn?.()
		this.$activeRequest.set(null)
		this.$scheduledRequest.set(null)
		this.cancelFn = null
	}

	/**
	 * Reset the agent's chat and memory.
	 * Cancel the current request if there's one active.
	 */
	reset() {
		this.cancel()
		this.$contextItems.set([])
		this.$todoList.set([])
		this.$chatHistory.set([])
		this.$userActionHistory.set([])
	}

	/**
	 * Check if the agent is currently working on a request or not.
	 */
	isGenerating() {
		return this.$activeRequest.get() !== null
	}

	/** Whether the agent is currently acting on the editor or not. */
	isActing = false

	/**
	 * Start recording user actions.
	 * @returns A cleanup function to stop recording user actions.
	 */
	startRecordingUserActions() {
		const { editor } = this
		const cleanUpCreate = editor.sideEffects.registerAfterCreateHandler(
			'shape',
			(shape, source) => {
				if (source !== 'user') return
				if (this.isActing) return
				const change = {
					added: { [shape.id]: shape },
					updated: {},
					removed: {},
				}
				this.$userActionHistory.update((prev) => [...prev, change])
				return
			}
		)

		const cleanUpDelete = editor.sideEffects.registerAfterDeleteHandler(
			'shape',
			(shape, source) => {
				if (source !== 'user') return
				if (this.isActing) return
				const change = {
					added: {},
					updated: {},
					removed: { [shape.id]: shape },
				}
				this.$userActionHistory.update((prev) => [...prev, change])
				return
			}
		)

		const cleanUpChange = editor.sideEffects.registerAfterChangeHandler(
			'shape',
			(prev, next, source) => {
				if (source !== 'user') return
				if (this.isActing) return
				const change: RecordsDiff<TLRecord> = {
					added: {},
					updated: { [prev.id]: [prev, next] },
					removed: {},
				}
				this.$userActionHistory.update((prev) => [...prev, change])
				return
			}
		)

		function cleanUp() {
			cleanUpCreate()
			cleanUpDelete()
			cleanUpChange()
		}

		return cleanUp
	}

	/**
	 * A function that stops recording user actions.
	 */
	private stopRecordingFn: () => void

	/**
	 * Stop recording user actions.
	 */
	stopRecordingUserActions() {
		this.stopRecordingFn?.()
	}

	/**
	 * Add a context item to the agent's context, ensuring that duplicates are not included.
	 * @param item The context item to add.
	 */
	addToContext(item: IContextItem) {
		this.$contextItems.update((items) => {
			// Don't add shapes that are already within context
			if (item.type === 'shapes') {
				const newItems = dedupeShapesContextItem(item, items)
				return [...items, ...newItems]
			}

			// Don't add items that are already in context
			if (this.hasContextItem(item)) {
				return items
			}

			return [...items, structuredClone(item)]
		})
	}

	/**
	 * Remove a context item from the agent's context.
	 * @param item The context item to remove.
	 */
	removeFromContext(item: IContextItem) {
		this.$contextItems.update((items) => items.filter((v) => item !== v))
	}

	/**
	 * Check if the agent's context contains a specific context item.
	 * This could mean as an individual item, or as part of a group of items.
	 * @param item The context item to check for.
	 * @returns True if the agent's context contains the item, false otherwise.
	 */
	hasContextItem(item: IContextItem) {
		const items = this.$contextItems.get()
		if (items.some((v) => areContextItemsEqual(v, item))) {
			return true
		}

		if (item.type === 'shape') {
			for (const existingItem of items) {
				if (existingItem.type === 'shapes') {
					if (existingItem.shapes.some((shape) => shape.shapeId === item.shape.shapeId)) {
						return true
					}
				}
			}
		}

		return false
	}
}
