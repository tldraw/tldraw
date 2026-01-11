import {
	Atom,
	atom,
	Editor,
	react,
	RecordsDiff,
	reverseRecordsDiff,
	structuredClone,
	TLRecord,
} from 'tldraw'
import { AgentModelName, DEFAULT_MODEL_NAME } from '../../shared/models'
import { AgentAction } from '../../shared/types/AgentAction'
import { AgentInput } from '../../shared/types/AgentInput'
import { AgentPrompt, BaseAgentPrompt } from '../../shared/types/AgentPrompt'
import { AgentRequest } from '../../shared/types/AgentRequest'
import { ChatHistoryItem } from '../../shared/types/ChatHistoryItem'
import { PromptPart } from '../../shared/types/PromptPart'
import { Streaming } from '../../shared/types/Streaming'
import { AgentHelpers } from '../AgentHelpers'
import { getPromptPartUtilsRecord, PromptPartUtil } from '../parts/PromptPartUtil'
import { $agentsAtom } from './agentsAtom'
import { AgentActionManager } from './managers/AgentActionManager'
import { AgentChatManager } from './managers/AgentChatManager'
import { AgentChatOriginManager } from './managers/AgentChatOriginManager'
import { AgentContextManager } from './managers/AgentContextManager'
import { AgentModeManager } from './managers/AgentModeManager'
import { AgentRequestManager } from './managers/AgentRequestManager'
import { AgentTodoManager } from './managers/AgentTodoManager'
import { AgentUserActionTracker } from './managers/AgentUserActionTracker'

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

	// ==================== Managers ====================

	/** The action manager associated with this agent. */
	actions: AgentActionManager

	/** The chat manager associated with this agent. */
	chat: AgentChatManager

	/** The chat origin manager associated with this agent. */
	chatOrigin: AgentChatOriginManager

	/** The context manager associated with this agent. */
	context: AgentContextManager

	/** The mode manager associated with this agent. */
	mode: AgentModeManager

	/** The request manager associated with this agent. */
	requests: AgentRequestManager

	/** The todo manager associated with this agent. */
	todos: AgentTodoManager

	/** The user action tracker associated with this agent. */
	userAction: AgentUserActionTracker

	// ==================== Remaining Atoms ====================

	/**
	 * An atom containing the model name that the user has selected. This gets
	 * passed through to prompts unless manually overridden.
	 *
	 * Note: Prompt part utils may ignore or override this value. See the
	 * ModelNamePartUtil for an example.
	 */
	$modelName: Atom<AgentModelName>

	// ==================== Prompt Part Utils ====================

	/**
	 * A record of the agent's prompt part util instances.
	 * Used by the `getPromptPartUtil` method.
	 */
	promptPartUtils: Record<PromptPart['type'], PromptPartUtil<PromptPart>>

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
	 * Create a new tldraw agent.
	 */
	constructor({ editor, id, onError }: TldrawAgentOptions) {
		this.editor = editor
		this.id = id
		this.onError = onError

		// Initialize managers
		this.actions = new AgentActionManager(this)
		this.chat = new AgentChatManager(this)
		this.chatOrigin = new AgentChatOriginManager(this)
		this.context = new AgentContextManager(this)
		this.mode = new AgentModeManager(this)
		this.requests = new AgentRequestManager(this)
		this.todos = new AgentTodoManager(this)
		this.userAction = new AgentUserActionTracker(this)

		// Initialize remaining atoms
		this.$modelName = atom<AgentModelName>('modelName', DEFAULT_MODEL_NAME)

		// Register this agent in the global agents atom
		$agentsAtom.update(editor, (agents) => [...agents, this])

		// Initialize prompt part utils
		this.promptPartUtils = getPromptPartUtilsRecord(this)

		// Initialize persistence for managers and atoms
		this.chat.initPersistence()
		this.chatOrigin.initPersistence()
		this.todos.initPersistence()
		this.context.initPersistence()
		this.persistValue('model-name', this.$modelName)

		// Start recording user actions
		this.userAction.startRecording()
	}

	/**
	 * Persist an atom's value to localStorage.
	 * Loads the initial value from localStorage and sets up a reaction to save changes.
	 *
	 * @param key - The key to use for localStorage (will be prefixed with agent id).
	 * @param $atom - The atom to persist.
	 * @returns A dispose function to stop persistence.
	 */
	persistValue<T>(key: string, $atom: Atom<T>): () => void {
		const localStorage = globalThis.localStorage
		if (!localStorage) return () => {}

		const fullKey = `${this.id}:${key}`

		try {
			const stored = localStorage.getItem(fullKey)
			if (stored) {
				const value = JSON.parse(stored) as T
				$atom.set(value)
			}
		} catch {
			console.warn(`Couldn't load ${fullKey} from localStorage`)
		}

		return react(`save ${fullKey} to localStorage`, () => {
			localStorage.setItem(fullKey, JSON.stringify($atom.get()))
		})
	}

	/**
	 * Dispose of the agent by cancelling requests and stopping listeners.
	 */
	dispose() {
		this.cancel()
		this.userAction.dispose()

		// Dispose all managers
		this.actions.dispose()
		this.chat.dispose()
		this.chatOrigin.dispose()
		this.context.dispose()
		this.mode.dispose()
		this.requests.dispose()
		this.todos.dispose()

		$agentsAtom.update(this.editor, (agents) => agents.filter((agent) => agent.id !== this.id))
	}

	// ==================== Request Handling ====================

	/**
	 * Get a full prompt based on a request.
	 *
	 * @param request - The request to use for the prompt.
	 * @param helpers - The helpers to use.
	 * @returns The fully assembled prompt.
	 */
	async preparePrompt(request: AgentRequest, helpers: AgentHelpers): Promise<AgentPrompt> {
		const { promptPartUtils } = this
		const transformedParts: PromptPart[] = []

		// Get available prompt part types from the current mode
		const modeDefinition = this.mode.getModeDefinition()

		// Safeguard: cannot prepare prompts in inactive modes
		if (!modeDefinition.active) {
			throw new Error(
				`Agent is not in an active mode so cannot prepare prompts. Current mode: ${modeDefinition.type}`
			)
		}

		const availablePartTypes = modeDefinition.parts

		for (const partType of availablePartTypes) {
			const util = promptPartUtils[partType]
			if (!util) continue
			const part = await util.getPart(structuredClone(request), helpers)
			if (!part) continue
			transformedParts.push(part)
		}

		return Object.fromEntries(transformedParts.map((part) => [part.type, part])) as AgentPrompt
	}

	/**
	 * Prompt the agent to edit the canvas.
	 *
	 * @example
	 * ```tsx
	 * const agent = useTldrawAgent(editor)
	 * agent.prompt('Draw a cat')
	 * ```
	 *
	 * ```tsx
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
		const request = this.requests.getFullRequestFromInput(input)

		// Submit the request to the agent.
		await this.request(request)

		// After the request is handled, check if there are any outstanding todo items or requests
		let scheduledRequest = this.requests.getScheduledRequest()
		const todoItemsRemaining = this.todos.getTodos().filter((item) => item.status !== 'done')

		if (!scheduledRequest) {
			// If there no outstanding todo items or requests, finish
			if (todoItemsRemaining.length === 0 || !this.requests.getCancelFn()) {
				return
			}

			// If there are outstanding todo items, schedule a request
			scheduledRequest = {
				messages: request.messages,
				contextItems: request.contextItems,
				bounds: request.bounds,
				modelName: request.modelName,
				selectedShapes: request.selectedShapes,
				data: request.data,
				type: 'todo',
			}
		}

		// Add the scheduled request to chat history
		const resolvedData = await Promise.all(scheduledRequest.data)
		this.chat.push({
			type: 'continuation',
			data: resolvedData,
		})

		// Handle the scheduled request
		this.requests.clearScheduledRequest()
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
	 * @returns A promise for when the request is complete and a cancel function
	 * to abort the request.
	 */
	async request(input: AgentInput) {
		const request = this.requests.getFullRequestFromInput(input)

		// Interrupt any currently active request
		if (this.requests.getActiveRequest() !== null) {
			this.cancel()
		}
		this.requests.setActiveRequest(request)

		// Notify the mode that a prompt is starting
		this.mode.onPromptStart(request)

		// Call an external helper function to request the agent
		const { promise, cancel } = requestAgent({ agent: this, request })

		this.requests.setCancelFn(cancel)
		promise.finally(() => {
			this.requests.setCancelFn(null)
		})

		const results = await promise
		this.requests.clearActiveRequest()

		// Notify the mode that the prompt has ended
		this.mode.onPromptEnd(request)

		return results
	}

	/**
	 * Schedule further work for the agent to do after this request has finished.
	 * What you schedule will get merged with the currently scheduled request, if there is one.
	 *
	 * @example
	 * ```tsx
	 * // Add an instruction
	 * agent.schedule('Add more detail.')
	 * ```
	 *
	 * @example
	 * ```tsx
	 * // Move the viewport
	 * agent.schedule({
	 *  bounds: { x: 0, y: 0, w: 100, h: 100 },
	 * })
	 * ```
	 *
	 * @example
	 * ```tsx
	 * // Add data to the request
	 * agent.schedule({ data: [value] })
	 * ```
	 */
	schedule(input: AgentInput) {
		const scheduledRequest = this.requests.getScheduledRequest()

		// If there's no request scheduled yet, schedule one
		if (!scheduledRequest) {
			this._schedule(input)
			return
		}

		const request = this.requests.getPartialRequestFromInput(input)

		this._schedule({
			type: 'schedule',

			// Append to properties where possible
			messages: [...scheduledRequest.messages, ...(request.messages ?? [])],
			contextItems: [...scheduledRequest.contextItems, ...(request.contextItems ?? [])],
			selectedShapes: [...scheduledRequest.selectedShapes, ...(request.selectedShapes ?? [])],
			data: [...scheduledRequest.data, ...(request.data ?? [])],

			// Override specific properties
			bounds: request.bounds ?? scheduledRequest.bounds,
			modelName: request.modelName ?? scheduledRequest.modelName,
		})
	}

	/**
	 * Manually override what the agent should do next.
	 *
	 * @example
	 * ```tsx
	 * agent.setScheduledRequest('Add more detail.')
	 * ```
	 *
	 * @example
	 * ```tsx
	 * agent.setScheduledRequest({
	 *  message: 'Add more detail to this area.',
	 *  bounds: { x: 0, y: 0, w: 100, h: 100 },
	 * })
	 * ```
	 *
	 * @example
	 * ```tsx
	 * // Cancel the scheduled request
	 * agent.setScheduledRequest(null)
	 * ```
	 *
	 * @param input - What to set the scheduled request to, or null to cancel
	 * the scheduled request.
	 */
	private _schedule(input: AgentInput | null) {
		if (input === null) {
			this.requests.clearScheduledRequest()
			return
		}

		const request = this.requests.getFullRequestFromInput(input)
		request.type = 'schedule'
		this.requests.setScheduledRequest(request)
	}

	// ==================== Cancel & Reset ====================

	/**
	 * Cancel the agent's current prompt, if one is active.
	 */
	cancel() {
		const activeRequest = this.requests.getActiveRequest()

		// Notify the mode before cancelling (so it can access current state)
		if (activeRequest) {
			this.mode.onPromptCancel(activeRequest)
		}

		this.requests.cancel()
	}

	/**
	 * Reset the agent's chat and memory.
	 * Cancel the current request if there's one active.
	 */
	reset() {
		this.cancel()

		// Reset all managers
		this.actions.reset()
		this.chat.reset()
		this.chatOrigin.reset()
		this.context.reset()
		this.mode.reset()
		this.requests.reset()
		this.todos.reset()
		this.userAction.reset()
	}
}

/**
 * Send a request to the agent and handle its response.
 *
 * This is a helper function that is used internally by the agent.
 */
function requestAgent({ agent, request }: { agent: TldrawAgent; request: AgentRequest }) {
	const { editor } = agent

	// If the request is from the user, add it to chat history
	if (request.type === 'user') {
		const promptHistoryItem: ChatHistoryItem = {
			type: 'prompt',
			message: request.messages.join('\n'),
			contextItems: request.contextItems,
			selectedShapes: request.selectedShapes,
		}
		agent.chat.push(promptHistoryItem)
	}

	let cancelled = false
	const controller = new AbortController()
	const signal = controller.signal
	const helpers = new AgentHelpers(agent)

	// Get available actions from the current mode
	const modeDefinition = agent.mode.getModeDefinition()

	// Safeguard: cannot request actions in inactive modes
	if (!modeDefinition.active) {
		agent.cancel()
		throw new Error(
			`Agent is not in an active mode so cannot take actions. Current mode: ${modeDefinition.type}`
		)
	}

	const availableActions = modeDefinition.actions

	const requestPromise = (async () => {
		const prompt = await agent.preparePrompt(request, helpers)
		let incompleteDiff: RecordsDiff<TLRecord> | null = null
		const actionPromises: Promise<void>[] = []
		try {
			for await (const action of streamAgent({ prompt, signal })) {
				if (cancelled) break
				editor.run(
					() => {
						const actionUtilType = agent.actions.getAgentActionUtilType(action._type)
						const actionUtil = agent.actions.getAgentActionUtil(action._type)

						// If the action is not in the mode's available actions, skip it
						if (!availableActions.includes(actionUtilType)) {
							return
						}

						// helpers the agent's action
						const transformedAction = actionUtil.sanitizeAction(action, helpers)
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
						const { diff, promise } = agent.actions.act(transformedAction, helpers)

						if (promise) {
							actionPromises.push(promise)
						}

						// The the action is incomplete, save the diff so that we can revert it in the future
						if (transformedAction.complete) {
							incompleteDiff = null
						} else {
							incompleteDiff = diff
						}
					},
					{
						ignoreShapeLock: false,
						history: 'ignore',
					}
				)
			}
			await Promise.all(actionPromises)
		} catch (e) {
			if (e === 'Cancelled by user' || (e instanceof Error && e.name === 'AbortError')) {
				return
			}
			agent.onError(e)
		}
	})()

	const cancel = () => {
		cancelled = true
		controller.abort('Cancelled by user')
	}

	return { promise: requestPromise, cancel }
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
