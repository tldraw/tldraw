import { atom, Editor, RecordsDiff, structuredClone, TLRecord } from 'tldraw'
import { AgentActionUtil } from '../../shared/actions/AgentActionUtil'
import { getAgentActionUtilsRecord, getPromptPartUtilsRecord } from '../../shared/AgentUtils'
import { PromptPartUtil } from '../../shared/parts/PromptPartUtil'
import { AgentAction } from '../../shared/types/AgentAction'
import { AgentInput } from '../../shared/types/AgentInput'
import { AgentRequest } from '../../shared/types/AgentRequest'
import { IChatHistoryItem } from '../../shared/types/ChatHistoryItem'
import { IContextItem } from '../../shared/types/ContextItem'
import { PromptPart } from '../../shared/types/PromptPart'
import { TodoItem } from '../../shared/types/TodoItem'
import { AgentModelName, DEFAULT_MODEL_NAME } from '../../worker/models'
import { $agentsAtom } from './agentsAtom'
import { areContextItemsEqual } from './areContextItemsEqual'
import { dedupeShapesContextItem } from './dedupeShapesContextItem'
import { persistAtomInLocalStorage } from './persistAtomInLocalStorage'
import { requestAgent } from './requestAgent'

export interface TldrawAgentOptions {
	/** The editor to associate the agent with. */
	editor: Editor
	/** A key used to differentiate the agent from other agents. */
	key: string
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
	public editor: Editor

	/** A callback for when an error occurs. */
	public onError: (e: any) => void

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
	constructor({ editor, key, onError }: TldrawAgentOptions) {
		this.editor = editor
		this.onError = onError

		$agentsAtom.update(editor, (agents) => [...agents, this])

		this.agentActionUtilsRecord = getAgentActionUtilsRecord()
		this.promptPartUtilsRecord = getPromptPartUtilsRecord()
		this.unknownActionUtil = this.agentActionUtilsRecord.unknown

		persistAtomInLocalStorage(this.$chatHistory, `${key}:chat-history-items`)
		persistAtomInLocalStorage(this.$todoList, `${key}:todo-items`)
		persistAtomInLocalStorage(this.$contextItems, `${key}:context-items`)
		persistAtomInLocalStorage(this.$modelName, `${key}:model-name`)

		this.stopRecordingFn = this.startRecordingDocumentChanges()
	}

	/**
	 * Dispose of the agent by removing its association with its editor.
	 */
	dispose() {
		this.cancel()
		$agentsAtom.update(this.editor, (agents) => agents.filter((agent) => agent !== this))
		this.stopRecordingDocumentChanges()
	}

	/**
	 * Get an agent action util for a specific action type.
	 *
	 * @param type - The type of action to get the util for.
	 * @returns The action util.
	 */
	getAgentActionUtil(type?: string) {
		if (!type) return this.unknownActionUtil
		const util = this.agentActionUtilsRecord[type as AgentAction['_type']]
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
		return this.promptPartUtilsRecord[type]
	}

	/**
	 * A record of the agent's action util instances.
	 * Used by the `getAgentActionUtil` method.
	 */
	private agentActionUtilsRecord: Record<AgentAction['_type'], AgentActionUtil<AgentAction>>

	/**
	 * The agent action util instance for the "unknown" action type.
	 * Returned by the `getAgentActionUtil` method when the action type isn't properly specified.
	 * This can happen if the model isn't finished streaming yet or makes a mistake.
	 */
	private unknownActionUtil: AgentActionUtil<AgentAction>

	/**
	 * A record of the agent's prompt part util instances.
	 * Used by the `getPromptPartUtil` method.
	 */
	private promptPartUtilsRecord: Record<PromptPart['type'], PromptPartUtil<PromptPart>>

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

		// Call a larger external helper function to prompt the agent
		const { promise, cancel } = requestAgent({
			agent: this,
			agentActionsUtils: this.agentActionUtilsRecord,
			promptPartUtils: this.promptPartUtilsRecord,
			onError: this.onError,
			request,
		})

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
	 * A function that cancels the agent's current prompt, if one is active.
	 */
	private cancelFn: (() => void) | null = null

	/**
	 * A function that stops recording document changes.
	 */
	private stopRecordingFn: () => void

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
	 * Reset the agent's chat.
	 * Cancel the current request if there's one active.
	 */
	reset() {
		this.cancel()
		this.$contextItems.set([])
		this.$chatHistory.set([])
		this.$todoList.set([])
	}

	/**
	 * Check if the agent is currently working on a request or not.
	 */
	isGenerating() {
		return this.$activeRequest.get() !== null
	}

	/**
	 * Start recording document changes.
	 * @returns A cleanup function to stop recording changes.
	 */
	startRecordingDocumentChanges() {
		const cleanUp = this.editor.store.listen(
			(entry) => {
				console.log('ENTRY: ', entry)
				this.$userActionHistory.update((prev) => [...prev, entry.changes])
			},
			{ scope: 'document', source: 'user' }
		)

		return cleanUp
	}

	/**
	 * Stop recording document changes.
	 */
	stopRecordingDocumentChanges() {
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
