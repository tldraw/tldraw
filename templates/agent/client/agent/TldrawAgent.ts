import {
	Atom,
	atom,
	Box,
	Editor,
	exhaustiveSwitchError,
	react,
	RecordsDiff,
	reverseRecordsDiff,
	structuredClone,
	TLRecord,
	Vec,
	VecModel,
} from 'tldraw'
import { AgentActionUtil } from '../../shared/actions/AgentActionUtil'
import { AgentHelpers } from '../../shared/AgentHelpers'
import { getAgentActionUtilsRecord, getPromptPartUtilsRecord } from '../../shared/AgentUtils'
import { ISimpleShape } from '../../shared/format/SimpleShape'
import { PromptPartUtil } from '../../shared/parts/PromptPartUtil'
import { AgentAction } from '../../shared/types/AgentAction'
import { AgentActionResult } from '../../shared/types/AgentActionResult'
import { AgentInput } from '../../shared/types/AgentInput'
import { AgentPrompt, BaseAgentPrompt } from '../../shared/types/AgentPrompt'
import { AgentRequest } from '../../shared/types/AgentRequest'
import { IChatHistoryItem } from '../../shared/types/ChatHistoryItem'
import {
	IAreaContextItem,
	IContextItem,
	IPointContextItem,
	IShapeContextItem,
	IShapesContextItem,
} from '../../shared/types/ContextItem'
import { PromptPart } from '../../shared/types/PromptPart'
import { Streaming } from '../../shared/types/Streaming'
import { TodoItem } from '../../shared/types/TodoItem'
import { AgentModelName, DEFAULT_MODEL_NAME } from '../../worker/models'
import { $agentsAtom } from './agentsAtom'

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
	 * An atom containing the next request that the agent has scheduled for
	 * itself. Null if there is no scheduled request.
	 */
	$scheduledRequest = atom<AgentRequest | null>('scheduledRequest', null)

	/**
	 * An atom containing the agent's chat history.
	 */
	$chatHistory = atom<IChatHistoryItem[]>('chatHistory', [])

	/**
	 * An atom containing the position on the page where the current chat
	 * started.
	 */
	$chatOrigin = atom<VecModel>('chatOrigin', { x: 0, y: 0 })

	/**
	 * An atom containing the agent's todo list.
	 */
	$todoList = atom<TodoItem[]>('todoList', [])

	/**
	 * An atom that's used to store document changes made by the user since the
	 * previous request.
	 */
	$userActionHistory = atom<RecordsDiff<TLRecord>[]>('userActionHistory', [])

	/**
	 * An atom containing currently selected context items. By default, selected
	 * context items will be included in the agent's next request.
	 */
	$contextItems = atom<IContextItem[]>('contextItems', [])

	/**
	 * An atom containing the model name that the user has selected. This gets
	 * passed through to prompts unless manually overridden.
	 *
	 * Note: Prompt part utils may ignore or override this value. See the
	 * ModelNamePartUtil for an example.
	 */
	$modelName = atom<AgentModelName>('modelName', DEFAULT_MODEL_NAME)

	/**
	 * Create a new tldraw agent.
	 */
	constructor({ editor, id, onError }: TldrawAgentOptions) {
		this.editor = editor
		this.id = id
		this.onError = onError

		$agentsAtom.update(editor, (agents) => [...agents, this])

		this.agentActionUtils = getAgentActionUtilsRecord()
		this.promptPartUtils = getPromptPartUtilsRecord()
		this.unknownActionUtil = this.agentActionUtils.unknown

		persistAtomInLocalStorage(this.$chatHistory, `${id}:chat-history`)
		persistAtomInLocalStorage(this.$chatOrigin, `${id}:chat-origin`)
		persistAtomInLocalStorage(this.$modelName, `${id}:model-name`)
		persistAtomInLocalStorage(this.$todoList, `${id}:todo-items`)
		persistAtomInLocalStorage(this.$contextItems, `${id}:context-items`)

		this.stopRecordingFn = this.startRecordingUserActions()
	}

	/**
	 * Dispose of the agent by cancelling requests and stopping listeners.
	 */
	dispose() {
		this.disposed = true
		this.cancel()
		this.stopRecordingUserActions()
		$agentsAtom.update(this.editor, (agents) => agents.filter((agent) => agent.id !== this.id))
	}

	/**
	 * Get an agent action util for a specific action type.
	 *
	 * @param type - The type of action to get the util for.
	 * @returns The action util.
	 */
	getAgentActionUtil(type?: string) {
		const utilType = this.getAgentActionUtilType(type)
		return this.agentActionUtils[utilType]
	}

	/**
	 * Get the util type for a provided action type.
	 * If no util type is found, returns 'unknown'.
	 */
	getAgentActionUtilType(type?: string) {
		if (!type) return 'unknown'
		const util = this.agentActionUtils[type as AgentAction['_type']]
		if (!util) return 'unknown'
		return type as AgentAction['_type']
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
	 *
	 * This is returned by the `getAgentActionUtil` method when the action type
	 * isn't properly specified. This can happen if the model isn't finished
	 * streaming yet or makes a mistake.
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
			actionResults: input.actionResults ?? [],
		}

		return request
	}

	/**
	 * Get a full prompt based on a request.
	 *
	 * @param request - The request to use for the prompt.
	 * @param agentHelpers - The agentHelpers to use.
	 * @returns The fully assembled prompt.
	 */
	async preparePrompt(request: AgentRequest, agentHelpers: AgentHelpers): Promise<AgentPrompt> {
		const { promptPartUtils } = this
		const transformedParts: PromptPart[] = []

		for (const util of Object.values(promptPartUtils)) {
			const part = await util.getPart(request, agentHelpers)
			if (!part) continue
			transformedParts.push(part)
		}

		const agentPrompt = Object.fromEntries(transformedParts.map((part) => [part.type, part]))

		return agentPrompt as AgentPrompt
	}

	/**
	 * Prompt the agent to edit the canvas.
	 *
	 * @example
	 * ```tsx
	 * const agent = useTldrawAgent(editor)
	 * agent.prompt('Draw a cat')
	 *
	 * agent.prompt({
	 *   message: 'Draw a cat in this area',
	 *   bounds: {
	 *     x: 0,
	 *     y: 0,
	 *     w: 300,
	 *     h: 400,
	 *   },
	 * })
	 * ```
	 *
	 * @returns A promise for when the agent has finished its work.
	 */
	async prompt(input: AgentInput) {
		const request = this.getRequestFromInput(input)

		// Submit the request to the agent.
		const actionResults = await this.request(request)

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
				actionResults: actionResults,
			}
		}

		// Handle the scheduled request
		this.$scheduledRequest.set(null)
		await this.prompt({
			...scheduledRequest,
			actionResults: [...scheduledRequest.actionResults, ...actionResults],
		})
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
	 * @returns A promise for when the request is complete and a cancel function
	 * to abort the request.
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

		const results = await promise
		this.$activeRequest.set(null)
		return results
	}

	/**
	 * Schedule a request for the agent to handle after this one.
	 *
	 * @example
	 * ```tsx
	 * agent.schedule('Add extra detail')
	 * ```
	 *
	 * This function optionally takes a callback as an argument. You can use it
	 * to create a request based on the currently scheduled request (or the
	 * default request if there is none) and should return the desired request.
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
	 * @param input - An agent input to schedule or a callback that returns an agent input.
	 */
	schedule(input: AgentInput | ((request: AgentRequest) => AgentInput) = '') {
		if (typeof input === 'string') {
			input = { message: input }
		}

		// By default, merge the provided input with the currently scheduled request
		// If a callback is provided, use the callback to handle the merge instead
		const callback =
			typeof input === 'function'
				? input
				: (current: AgentRequest) => {
						return {
							// Append properties where possible
							message: [current.message, input.message].filter(Boolean).join('\n\n'),
							contextItems: [...current.contextItems, ...(input.contextItems ?? [])],
							selectedShapes: [...current.selectedShapes, ...(input.selectedShapes ?? [])],
							actionResults: [...current.actionResults, ...(input.actionResults ?? [])],

							// Override specific properties
							bounds: input.bounds ?? current.bounds,
							modelName: input.modelName ?? current.modelName,
							type: input.type ?? current.type,
						}
					}

		this.$scheduledRequest.update((prev) => {
			// If there's no scheduled request, start with this as default
			const activeRequest = this.$activeRequest.get()
			const current = prev ?? {
				message: '',
				type: 'schedule',
				modelName: activeRequest?.modelName ?? this.$modelName.get(),
				bounds: activeRequest?.bounds ?? this.editor.getViewportPageBounds(),
				selectedShapes: activeRequest?.selectedShapes ?? [],
				contextItems: [],
				actionResults: [],
			}

			// Merge the input with the current scheduled request
			const next = callback(current)
			return this.getRequestFromInput(next)
		})
	}

	/**
	 * Add a todo item to the agent's todo list.
	 * @param text The text of the todo item.
	 * @returns The id of the todo item.
	 */
	addTodo(text: string) {
		let id = -1
		this.$todoList.update((todoItems) => {
			id = todoItems.length
			return [
				...todoItems,
				{
					id,
					status: 'todo' as const,
					text,
				},
			]
		})
		return id
	}

	/**
	 * Make the agent perform an action.
	 * @param action The action to make the agent do.
	 * @param agentHelpers The agentHelpers to use.
	 * @returns The diff of the action, and
	 */
	act(action: Streaming<AgentAction>, agentHelpers = new AgentHelpers(this)): AgentActionResult {
		const { editor } = this
		const util = this.getAgentActionUtil(action._type)
		this.isActing = true
		let value: AgentActionResult['value']

		let diff: RecordsDiff<TLRecord> | null = null
		try {
			diff = editor.store.extractingChanges(() => {
				value = util.applyAction(structuredClone(action), agentHelpers) ?? undefined
			})
		} finally {
			this.isActing = false
		}

		const utilType = this.getAgentActionUtilType(action._type)
		const result: AgentActionResult = {
			type: utilType,
			diff,
			value,
		}

		// Add the action to chat history
		if (util.savesToHistory()) {
			const historyItem: IChatHistoryItem = {
				type: 'action',
				action,
				result,
				acceptance: 'pending',
			}

			this.$chatHistory.update((historyItems) => {
				// If there are no items, start off the chat history with the first item
				if (historyItems.length === 0) return [historyItem]

				// If the last item is still in progress, replace it with the new item
				const lastHistoryItem = historyItems.at(-1)
				if (
					lastHistoryItem &&
					lastHistoryItem.type === 'action' &&
					!lastHistoryItem.action.complete
				) {
					return [...historyItems.slice(0, -1), historyItem]
				}

				// Otherwise, just add the new item to the end of the list
				return [...historyItems, historyItem]
			})
		}

		return result
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
		this.$userActionHistory.set([])

		const viewport = this.editor.getViewportPageBounds()
		this.$chatHistory.set([])
		this.$chatOrigin.set({ x: viewport.x, y: viewport.y })
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
	 * Add a context item to the agent's context, ensuring that duplicates are
	 * not included.
	 *
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
	 * Check if the agent's context contains a specific context item. This could
	 * mean as an individual item, or as part of a group of items.
	 *
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

/**
 * Send a request to the agent and handle its response.
 *
 * This is a helper function that is used internally by the agent.
 */
function requestAgent({
	agent,
	request,
	onError,
}: {
	agent: TldrawAgent
	request: AgentRequest
	onError: (e: any) => void
}) {
	const { editor } = agent

	// If the request is from the user, add it to chat history
	if (request.type === 'user') {
		const promptHistoryItem: IChatHistoryItem = {
			type: 'prompt',
			message: request.message,
			contextItems: request.contextItems,
			selectedShapes: request.selectedShapes,
		}
		agent.$chatHistory.update((prev) => [...prev, promptHistoryItem])
	}

	let cancelled = false
	const controller = new AbortController()
	const signal = controller.signal
	const agentHelpers = new AgentHelpers(agent)

	const promise = new Promise<AgentActionResult[]>((resolve) => {
		agent.preparePrompt(request, agentHelpers).then(async (prompt) => {
			let incompleteDiff: RecordsDiff<TLRecord> | null = null
			const results: AgentActionResult[] = []
			try {
				for await (const action of streamAgent({ prompt, signal })) {
					if (cancelled) break
					editor.run(
						() => {
							const actionUtil = agent.getAgentActionUtil(action._type)

							// agentHelpers the agent's action
							const transformedAction = actionUtil.sanitizeAction(action, agentHelpers)
							if (!transformedAction) {
								incompleteDiff = null
								return
							}

							// If there was a diff from an incomplete action, revert it so that we can reapply the action
							if (incompleteDiff) {
								const inversePrevDiff = reverseRecordsDiff(incompleteDiff)
								editor.store.applyDiff(inversePrevDiff)
							}

							// Apply the action to the app and editor
							const result = agent.act(transformedAction, agentHelpers)

							// The the action is incomplete, save the diff so that we can revert it in the future
							if (transformedAction.complete) {
								results.push(result)
								incompleteDiff = null
							} else {
								incompleteDiff = result.diff
							}
						},
						{
							ignoreShapeLock: false,
							history: 'ignore',
						}
					)
				}
				resolve(results)
			} catch (e) {
				if (e === 'Cancelled by user' || (e instanceof Error && e.name === 'AbortError')) {
					return
				}
				onError(e)
				resolve(results)
			}
		})
	})

	const cancel = () => {
		cancelled = true
		controller.abort('Cancelled by user')
	}

	return { promise, cancel }
}

/**
 * Stream a response from the model.
 * Act on the model's events as they come in.
 *
 * This is a helper function that is used internally by the agent.
 */
async function* streamAgent({
	prompt,
	signal,
}: {
	prompt: BaseAgentPrompt
	signal: AbortSignal
}): AsyncGenerator<Streaming<AgentAction>> {
	const res = await fetch('/stream', {
		method: 'POST',
		body: JSON.stringify(prompt),
		headers: {
			'Content-Type': 'application/json',
		},
		signal,
	})

	if (!res.body) {
		throw Error('No body in response')
	}

	const reader = res.body.getReader()
	const decoder = new TextDecoder()
	let buffer = ''

	try {
		while (true) {
			const { value, done } = await reader.read()
			if (done) break

			buffer += decoder.decode(value, { stream: true })
			const actions = buffer.split('\n\n')
			buffer = actions.pop() || ''

			for (const action of actions) {
				const match = action.match(/^data: (.+)$/m)
				if (match) {
					try {
						const data = JSON.parse(match[1])

						// If the response contains an error, throw it
						if ('error' in data) {
							throw new Error(data.error)
						}

						const agentAction: Streaming<AgentAction> = data
						yield agentAction
					} catch (err: any) {
						throw new Error(err.message)
					}
				}
			}
		}
	} finally {
		reader.releaseLock()
	}
}

/**
 * Check if two context items are equal.
 *
 * This is a helper function that is used internally by the agent.
 */
function areContextItemsEqual(a: IContextItem, b: IContextItem): boolean {
	if (a.type !== b.type) return false

	switch (a.type) {
		case 'shape': {
			const _b = b as IShapeContextItem
			return a.shape.shapeId === _b.shape.shapeId
		}
		case 'shapes': {
			const _b = b as IShapesContextItem
			if (a.shapes.length !== _b.shapes.length) return false
			return a.shapes.every((shape) => _b.shapes.find((s) => s.shapeId === shape.shapeId))
		}
		case 'area': {
			const _b = b as IAreaContextItem
			return Box.Equals(a.bounds, _b.bounds)
		}
		case 'point': {
			const _b = b as IPointContextItem
			return Vec.Equals(a.point, _b.point)
		}
		default: {
			exhaustiveSwitchError(a)
		}
	}
}

/**
 * Remove duplicate shapes from a shapes context item.
 * If there's only one shape left, return it as a shape item instead.
 *
 * This is a helper function that is used internally by the agent.
 */
function dedupeShapesContextItem(
	item: IShapesContextItem,
	existingItems: IContextItem[]
): IContextItem[] {
	// Get all shape IDs that are already in the context
	const existingShapeIds = new Set<string>()

	// Check individual shapes
	existingItems.forEach((contextItem) => {
		if (contextItem.type === 'shape') {
			existingShapeIds.add(contextItem.shape.shapeId)
		} else if (contextItem.type === 'shapes') {
			contextItem.shapes.forEach((shape: ISimpleShape) => {
				existingShapeIds.add(shape.shapeId)
			})
		}
	})

	// Filter out shapes that are already in the context
	const newShapes = item.shapes.filter((shape) => !existingShapeIds.has(shape.shapeId))

	// Only add if there are remaining shapes
	if (newShapes.length > 0) {
		// If only one shape remains, add it as a single shape item
		if (newShapes.length === 1) {
			const newItem: IContextItem = {
				type: 'shape',
				shape: newShapes[0],
				source: item.source,
			}
			return [structuredClone(newItem)]
		}

		// Otherwise add as a shapes group
		const newItem: IContextItem = {
			type: 'shapes',
			shapes: newShapes,
			source: item.source,
		}
		return [structuredClone(newItem)]
	}

	// No new shapes to add
	return []
}

/**
 * Load an atom's value from local storage and persist it to local storage whenever it changes.
 *
 * This is a helper function that is used internally by the agent.
 */
function persistAtomInLocalStorage<T>(atom: Atom<T>, key: string) {
	const localStorage = globalThis.localStorage
	if (!localStorage) return

	try {
		const stored = localStorage.getItem(key)
		if (stored) {
			const value = JSON.parse(stored) as T
			atom.set(value)
		}
	} catch {
		console.warn(`Couldn't load ${key} from localStorage`)
	}

	react(`save ${key} to localStorage`, () => {
		localStorage.setItem(key, JSON.stringify(atom.get()))
	})
}
