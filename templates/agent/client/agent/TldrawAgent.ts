import { Editor, RecordsDiff, reverseRecordsDiff, structuredClone, TLRecord } from 'tldraw'
import { convertTldrawShapeToFocusedShape } from '../../shared/format/convertTldrawShapeToFocusedShape'
import { AgentModelName } from '../../shared/models'
import { AgentAction } from '../../shared/types/AgentAction'
import { AgentInput } from '../../shared/types/AgentInput'
import { AgentPrompt, BaseAgentPrompt } from '../../shared/types/AgentPrompt'
import { AgentRequest } from '../../shared/types/AgentRequest'
import { ChatHistoryItem, ChatHistoryPromptItem } from '../../shared/types/ChatHistoryItem'
import { ContextItem } from '../../shared/types/ContextItem'
import { PromptPart } from '../../shared/types/PromptPart'
import { Streaming } from '../../shared/types/Streaming'
import { TodoItem } from '../../shared/types/TodoItem'
import { AgentHelpers } from '../AgentHelpers'
import { getModeNode } from '../modes/AgentModeChart'
import { AgentModeType } from '../modes/AgentModeDefinitions'
import { getPromptPartUtilsRecord, PromptPartUtil } from '../parts/PromptPartUtil'
import { AgentActionManager } from './managers/AgentActionManager'
import { AgentChatManager } from './managers/AgentChatManager'
import { AgentChatOriginManager } from './managers/AgentChatOriginManager'
import { AgentContextManager } from './managers/AgentContextManager'
import { AgentDebugFlags, AgentDebugManager } from './managers/AgentDebugManager'
import { AgentLintManager } from './managers/AgentLintManager'
import { AgentModeManager } from './managers/AgentModeManager'
import { AgentModelNameManager } from './managers/AgentModelNameManager'
import { AgentRequestManager } from './managers/AgentRequestManager'
import { AgentTodoManager } from './managers/AgentTodoManager'
import { AgentUserActionTracker } from './managers/AgentUserActionTracker'

/**
 * The persisted state of an agent.
 * Used for saving and loading agent state.
 */
export interface PersistedAgentState {
	chatHistory?: ChatHistoryItem[]
	chatOrigin?: { x: number; y: number }
	todoList?: TodoItem[]
	contextItems?: ContextItem[]
	modelName?: AgentModelName
	debugFlags?: AgentDebugFlags
}

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
 * Access the agent via `useAgent()` hook from TldrawAgentAppProvider,
 * or via `AgentAppAgentsManager.getAgent(editor)`.
 *
 * @example
 * ```tsx
 * const agent = useAgent()
 * agent.prompt('Draw a snowman')
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

	/** The debug manager associated with this agent. */
	debug: AgentDebugManager

	/** The lint manager associated with this agent. */
	lints: AgentLintManager

	/** The mode manager associated with this agent. */
	mode: AgentModeManager

	/** The model name manager associated with this agent. */
	modelName: AgentModelNameManager

	/** The request manager associated with this agent. */
	requests: AgentRequestManager

	/** The todo manager associated with this agent. */
	todos: AgentTodoManager

	/** The user action tracker associated with this agent. */
	userAction: AgentUserActionTracker

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
		// Note: mode must be initialized before actions, since actions depends on mode
		this.mode = new AgentModeManager(this)
		this.actions = new AgentActionManager(this)
		this.chat = new AgentChatManager(this)
		this.chatOrigin = new AgentChatOriginManager(this)
		this.context = new AgentContextManager(this)
		this.debug = new AgentDebugManager(this)
		this.lints = new AgentLintManager(this)
		this.modelName = new AgentModelNameManager(this)
		this.requests = new AgentRequestManager(this)
		this.todos = new AgentTodoManager(this)
		this.userAction = new AgentUserActionTracker(this)

		// Note: Agent registration is handled by AgentAppAgentsManager.createAgent()

		// Initialize prompt part utils
		this.promptPartUtils = getPromptPartUtilsRecord(this)

		// Start recording user actions
		this.userAction.startRecording()
	}

	// ==================== State Persistence ====================

	/**
	 * Serialize the agent's state to a plain object for persistence.
	 * This is called by the app-level persistence manager to save agent state.
	 */
	serializeState(): PersistedAgentState {
		return {
			chatHistory: this.chat.getHistory(),
			chatOrigin: this.chatOrigin.getOrigin(),
			todoList: this.todos.getTodos(),
			contextItems: this.context.getItems(),
			modelName: this.modelName.getModelName(),
			debugFlags: this.debug.getDebugFlags(),
		}
	}

	/**
	 * Load previously persisted state into the agent.
	 * This is called by the app-level persistence manager to restore agent state.
	 *
	 * @param state - The persisted state to load.
	 */
	loadState(state: PersistedAgentState) {
		if (state.chatHistory) {
			this.chat.setHistory(state.chatHistory)
		}
		if (state.chatOrigin) {
			this.chatOrigin.setOrigin(state.chatOrigin)
		}
		if (state.todoList) {
			this.todos.setTodos(state.todoList)
		}
		if (state.contextItems) {
			this.context.setItems(state.contextItems)
		}
		if (state.modelName) {
			this.modelName.setModelName(state.modelName)
		}
		if (state.debugFlags) {
			this.debug.setDebugFlags(state.debugFlags)
		}
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
		this.debug.dispose()
		this.lints.dispose()
		this.mode.dispose()
		this.modelName.dispose()
		this.requests.dispose()
		this.todos.dispose()

		// Note: Agent removal from registry is handled by AgentAppAgentsManager.deleteAgent()
	}

	/**
	 * Whether the agent is currently acting on the editor or not.
	 * This flag is used to prevent agent actions from being recorded as user actions.
	 *
	 * Do not use this to check if the agent is currently working on a request. Use `isGenerating` instead.
	 */
	private isActingOnEditor = false

	/**
	 * Get whether the agent is currently acting on the editor.
	 * @returns true if the agent is currently acting, false otherwise.
	 */
	getIsActingOnEditor(): boolean {
		return this.isActingOnEditor
	}

	/**
	 * Set whether the agent is currently acting on the editor.
	 * @param value - true if the agent is acting, false otherwise.
	 */
	setIsActingOnEditor(value: boolean): void {
		this.isActingOnEditor = value
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
		const modeDefinition = this.mode.getCurrentModeDefinition()
		if (!modeDefinition.active) {
			throw new Error(
				`Fairy is not in an active mode so can't act right now. Current mode: ${modeDefinition.type}`
			)
		}

		const availablePromptPartTypes = modeDefinition.parts

		for (const promptPartType of availablePromptPartTypes) {
			const util = promptPartUtils[promptPartType]
			if (!util) throw new Error(`Prompt part util not found for part type: ${promptPartType}`)
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
	 * const agent = useAgent()
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
	async prompt(input: AgentInput, { nested = false }: { nested?: boolean } = {}) {
		if (this.requests.isGenerating() && !nested) {
			throw new Error('Agent is already prompting. Please wait for the current prompt to finish.')
		}

		if (this.isActingOnEditor) {
			throw new Error(
				"Agent is already acting. It's illegal to prompt an agent during an action. Please use schedule instead."
			)
		}

		this.requests.setIsPrompting(true)

		const request = this.requests.getFullRequestFromInput(input)
		const startingNode = this.mode.getCurrentModeNode()
		startingNode.onPromptStart?.(this, request)

		// Submit the request to the agent.
		try {
			await this.request(request)
		} catch (e) {
			console.error('Error data:', e)
			this.requests.setIsPrompting(false)
			this.requests.setCancelFn(null)
			return
		}

		let modeChanged = true
		while (!this.requests.getScheduledRequest() && modeChanged) {
			modeChanged = false
			const currentModeType = this.mode.getCurrentModeType()
			const currentModeNode = this.mode.getCurrentModeNode()
			currentModeNode.onPromptEnd?.(this, request) // in case onPromptEnd switches modes
			const newModeType = this.mode.getCurrentModeType()
			if (newModeType !== currentModeType) {
				modeChanged = true
			}
		}

		// If there's still no scheduled request, quit
		const scheduledRequest = this.requests.getScheduledRequest()
		const eventualModeType = this.mode.getCurrentModeType()
		const eventualModeDefinition = this.mode.getCurrentModeDefinition()
		if (!scheduledRequest) {
			if (eventualModeDefinition.active) {
				throw new Error(
					`Agent is not allowed to become inactive during the active mode: ${eventualModeType}`
				)
			}
			this.requests.setIsPrompting(false)
			this.requests.setCancelFn(null)
			return
		}

		// If there *is* a scheduled request...
		// Add the scheduled request to chat history
		const resolvedData = await Promise.all(scheduledRequest.data)
		this.chat.push({
			type: 'continuation',
			data: resolvedData,
		})

		// Handle the scheduled request and clear it
		this.requests.clearScheduledRequest()
		await this.prompt(scheduledRequest, { nested: true })
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

		// Call an external helper function to request the agent
		const { promise, cancel } = this.requestAgentActions(request)

		this.requests.setCancelFn(cancel)

		const results = await promise
		this.requests.clearActiveRequest()

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

		const newRequest = this.requests.getPartialRequestFromInput(input)

		this._schedule({
			// Append to properties where possible
			agentMessages: [...scheduledRequest.agentMessages, ...(newRequest.agentMessages ?? [])],
			userMessages: [...scheduledRequest.userMessages, ...(newRequest.userMessages ?? [])],
			data: [...scheduledRequest.data, ...(newRequest.data ?? [])],

			// Override specific properties
			bounds: newRequest.bounds ?? scheduledRequest.bounds,
			contextItems: [...scheduledRequest.contextItems, ...(newRequest.contextItems ?? [])],
			source: newRequest.source ?? scheduledRequest.source ?? 'self',
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

		const partialRequest = this.requests.getPartialRequestFromInput(input)
		partialRequest.source = partialRequest.source ?? 'self' // when scheduling, we want the default source to be 'self' if none is provided
		const request = this.requests.getFullRequestFromInput(partialRequest)

		const isCurrentlyActive = this.requests.isGenerating()

		if (isCurrentlyActive) {
			this.requests.setScheduledRequest(request)
		} else {
			this.prompt(request)
		}
	}

	/**
	 * Interrupt the agent and set their mode.
	 * Optionally, schedule a request.
	 */
	interrupt({ input, mode }: { input: AgentInput | null; mode?: AgentModeType }) {
		this.requests.cancel()
		if (mode) {
			this.mode.setMode(mode)
		}
		if (input !== null) {
			this.schedule(input)
		}
	}

	// ==================== Cancel & Reset ====================

	/**
	 * Cancel the agent's current prompt, if one is active.
	 */
	cancel() {
		const activeRequest = this.requests.getActiveRequest()

		if (activeRequest) {
			const modeType = this.mode.getCurrentModeType()
			const modeNode = getModeNode(modeType)
			modeNode.onPromptCancel?.(this, activeRequest)

			const newModeDefinition = this.mode.getCurrentModeDefinition()
			if (newModeDefinition.active) {
				throw new Error(
					`Agent is not allowed to become inactive during the active mode: ${this.mode.getCurrentModeType()}`
				)
			}
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
		this.lints.reset()
		this.mode.reset()
		this.requests.reset()
		this.todos.reset()
		this.userAction.reset()
	}

	// ==================== Request Helpers ====================

	/**
	 * Send a request to the agent and handle its response.
	 *
	 * This is a helper function that is used internally by the agent.
	 */
	private requestAgentActions(request: AgentRequest) {
		const { editor } = this

		// Add user prompt to chat history
		const promptHistoryItem: ChatHistoryPromptItem = {
			type: 'prompt',
			promptSource: request.source,
			agentFacingMessage: request.agentMessages.join('\n'),
			userFacingMessage: request.userMessages.length > 0 ? request.userMessages.join('\n') : null,
			contextItems: structuredClone(request.contextItems),
			selectedShapes: this.editor
				.getSelectedShapes()
				.map((shape) => convertTldrawShapeToFocusedShape(this.editor, structuredClone(shape))),
		}
		this.chat.push(promptHistoryItem)

		let cancelled = false
		const controller = new AbortController()
		const signal = controller.signal
		const helpers = new AgentHelpers(this)

		const modeDefinition = this.mode.getCurrentModeDefinition()
		if (!modeDefinition.active) {
			this.cancel()
			throw new Error(
				`Agent is not in an active mode so cannot take actions. Current mode: ${modeDefinition.type}`
			)
		}

		const availableActions = modeDefinition.actions

		const requestPromise = (async () => {
			const prompt = await this.preparePrompt(request, helpers)
			let incompleteDiff: RecordsDiff<TLRecord> | null = null
			const actionPromises: Promise<void>[] = []
			try {
				for await (const action of this.streamAgentActions({ prompt, signal })) {
					if (cancelled) break

					// Set acting flag BEFORE editor.run so user action tracker ignores all changes
					// including diff reverts that happen before act() is called
					this.setIsActingOnEditor(true)
					try {
						editor.run(
							() => {
								const actionUtilType = this.actions.getAgentActionUtilType(action._type)
								const actionUtil = this.actions.getAgentActionUtil(action._type)

								// If the action is not in the mode's available actions, skip it
								if (!availableActions.includes(actionUtilType)) {
									return
								}

								// If there was a diff from an incomplete action, revert it so that we can reapply the action
								// This must happen BEFORE sanitize so we're working with clean state
								if (incompleteDiff) {
									const inversePrevDiff = reverseRecordsDiff(incompleteDiff)
									editor.store.applyDiff(inversePrevDiff)
									// Track the inverse diff to update created shapes tracking
									this.lints.trackShapesFromDiff(inversePrevDiff)
									incompleteDiff = null
								}

								// Sanitize the agent's action
								const transformedAction = actionUtil.sanitizeAction(action, helpers)
								if (!transformedAction) {
									return
								}

								// Apply the action to the app and editor
								const { diff, promise } = this.actions.act(transformedAction, helpers)

								if (promise) {
									actionPromises.push(promise)
								}

								// Track shapes from diff for both complete and incomplete actions
								this.lints.trackShapesFromDiff(diff)

								// If the action is incomplete, save the diff so that we can revert it in the future
								if (transformedAction.complete) {
									// Log completed action if debug logging is enabled
									this.debug.logCompletedAction(transformedAction)
								} else {
									incompleteDiff = diff
								}
							},
							{
								ignoreShapeLock: true,
								history: 'ignore',
							}
						)
					} finally {
						this.setIsActingOnEditor(false)
					}
				}
				await Promise.all(actionPromises)
			} catch (e) {
				if (e === 'Cancelled by user' || (e instanceof Error && e.name === 'AbortError')) {
					return
				}
				this.onError(e)
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
	private async *streamAgentActions({
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
}
