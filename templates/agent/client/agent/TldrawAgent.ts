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
import { AgentModeType } from '../modes/AgentModeDefinitions'
import { getPromptPartUtilsRecord, PromptPartUtil } from '../parts/PromptPartUtil'
import { AgentActionManager } from './managers/AgentActionManager'
import { AgentChatManager } from './managers/AgentChatManager'
import { AgentChatOriginManager } from './managers/AgentChatOriginManager'
import { AgentContextManager } from './managers/AgentContextManager'
import { AgentDebugFlags, AgentDebugManager } from './managers/AgentDebugManager'
import { AgentLintManager } from './managers/AgentLintManager'
import { AgentModelNameManager } from './managers/AgentModelNameManager'
import { AgentModeManager } from './managers/AgentModeManager'
import { AgentRequestManager } from './managers/AgentRequestManager'
import { AgentTodoManager } from './managers/AgentTodoManager'
import { AgentUserActionTracker } from './managers/AgentUserActionTracker'

export interface PersistedAgentState {
	chatHistory?: ChatHistoryItem[]
	chatOrigin?: { x: number; y: number }
	todoList?: TodoItem[]
	contextItems?: ContextItem[]
	modelName?: AgentModelName
	debugFlags?: AgentDebugFlags
}

export interface TldrawAgentOptions {
	editor: Editor
	/** A key used to differentiate the agent from other agents. */
	id: string
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
	editor: Editor
	id: string
	onError: (e: any) => void

	actions: AgentActionManager
	chat: AgentChatManager
	chatOrigin: AgentChatOriginManager
	context: AgentContextManager
	debug: AgentDebugManager
	lints: AgentLintManager
	mode: AgentModeManager
	modelName: AgentModelNameManager
	requests: AgentRequestManager
	todos: AgentTodoManager
	userAction: AgentUserActionTracker

	promptPartUtils: Record<PromptPart['type'], PromptPartUtil<PromptPart>>

	constructor({ editor, id, onError }: TldrawAgentOptions) {
		this.editor = editor
		this.id = id
		this.onError = onError

		// mode must be initialized before actions, since actions depends on mode
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

		this.promptPartUtils = getPromptPartUtilsRecord(this)
		this.userAction.startRecording()
	}

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

	loadState(state: PersistedAgentState) {
		if (state.chatHistory) this.chat.setHistory(state.chatHistory)
		if (state.chatOrigin) this.chatOrigin.setOrigin(state.chatOrigin)
		if (state.todoList) this.todos.setTodos(state.todoList)
		if (state.contextItems) this.context.setItems(state.contextItems)
		if (state.modelName) this.modelName.setModelName(state.modelName)
		if (state.debugFlags) this.debug.setDebugFlags(state.debugFlags)
	}

	dispose() {
		this.cancel()
		this.userAction.dispose()
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
	}

	/**
	 * Whether the agent is currently acting on the editor. Used so the user
	 * action tracker ignores the agent's own changes. This is not the same as
	 * working on a request; use `requests.isGenerating()` for that.
	 */
	private isActingOnEditor = false

	getIsActingOnEditor(): boolean {
		return this.isActingOnEditor
	}

	setIsActingOnEditor(value: boolean): void {
		this.isActingOnEditor = value
	}

	/**
	 * Get a full prompt based on a request.
	 */
	async preparePrompt(request: AgentRequest, helpers: AgentHelpers): Promise<AgentPrompt> {
		const modeDefinition = this.mode.getCurrentModeDefinition()
		if (!modeDefinition.active) {
			throw new Error(
				`Fairy is not in an active mode so can't act right now. Current mode: ${modeDefinition.type}`
			)
		}

		const transformedParts: PromptPart[] = []
		for (const promptPartType of modeDefinition.parts) {
			const util = this.promptPartUtils[promptPartType]
			if (!util) throw new Error(`Prompt part util not found for part type: ${promptPartType}`)
			const part = await util.getPart(structuredClone(request), helpers)
			if (part) transformedParts.push(part)
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
		this.mode.getCurrentModeNode().onPromptStart?.(this, request)

		try {
			await this.request(request)
		} catch (e) {
			console.error('Error data:', e)
			this.requests.setIsPrompting(false)
			this.requests.setCancelFn(null)
			return
		}

		// onPromptEnd may switch modes, so keep firing it until the mode settles
		let modeChanged = true
		while (!this.requests.getScheduledRequest() && modeChanged) {
			const currentModeType = this.mode.getCurrentModeType()
			this.mode.getCurrentModeNode().onPromptEnd?.(this, request)
			modeChanged = this.mode.getCurrentModeType() !== currentModeType
		}

		const scheduledRequest = this.requests.getScheduledRequest()
		if (!scheduledRequest) {
			const eventualModeDefinition = this.mode.getCurrentModeDefinition()
			if (eventualModeDefinition.active) {
				throw new Error(
					`Agent is not allowed to become inactive during the active mode: ${eventualModeDefinition.type}`
				)
			}
			this.requests.setIsPrompting(false)
			this.requests.setCancelFn(null)
			return
		}

		this.chat.push({ type: 'continuation', data: await Promise.all(scheduledRequest.data) })
		this.requests.clearScheduledRequest()
		await this.prompt(scheduledRequest, { nested: true })
	}

	/**
	 * Send a single request to the agent and handle its response.
	 *
	 * This does not chain requests together. For the full agentic loop, use
	 * `prompt`. Calling this directly is mostly useful for evals.
	 */
	async request(input: AgentInput) {
		const request = this.requests.getFullRequestFromInput(input)

		if (this.requests.getActiveRequest() !== null) {
			this.cancel()
		}
		this.requests.setActiveRequest(request)

		const { promise, cancel } = this.requestAgentActions(request)
		this.requests.setCancelFn(cancel)

		await promise
		this.requests.clearActiveRequest()
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
		if (!scheduledRequest) {
			this._schedule(input)
			return
		}

		const newRequest = this.requests.getPartialRequestFromInput(input)
		this._schedule({
			agentMessages: [...scheduledRequest.agentMessages, ...(newRequest.agentMessages ?? [])],
			userMessages: [...scheduledRequest.userMessages, ...(newRequest.userMessages ?? [])],
			data: [...scheduledRequest.data, ...(newRequest.data ?? [])],
			contextItems: [...scheduledRequest.contextItems, ...(newRequest.contextItems ?? [])],
			bounds: newRequest.bounds ?? scheduledRequest.bounds,
			source: newRequest.source ?? scheduledRequest.source ?? 'self',
		})
	}

	private _schedule(input: AgentInput) {
		const partialRequest = this.requests.getPartialRequestFromInput(input)
		// scheduled requests come from the agent itself unless told otherwise
		partialRequest.source ??= 'self'
		const request = this.requests.getFullRequestFromInput(partialRequest)

		if (this.requests.isGenerating()) {
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

	/**
	 * Cancel the agent's current prompt, if one is active.
	 */
	cancel() {
		const activeRequest = this.requests.getActiveRequest()
		if (activeRequest) {
			this.mode.getCurrentModeNode().onPromptCancel?.(this, activeRequest)

			const newModeDefinition = this.mode.getCurrentModeDefinition()
			if (newModeDefinition.active) {
				throw new Error(
					`Agent is not allowed to become inactive during the active mode: ${newModeDefinition.type}`
				)
			}
		}

		this.requests.cancel()
	}

	/**
	 * Reset the agent's chat and memory, cancelling any active request.
	 */
	reset() {
		this.cancel()
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

	private requestAgentActions(request: AgentRequest) {
		const { editor } = this

		const promptHistoryItem: ChatHistoryPromptItem = {
			type: 'prompt',
			promptSource: request.source,
			agentFacingMessage: request.agentMessages.join('\n'),
			userFacingMessage: request.userMessages.length > 0 ? request.userMessages.join('\n') : null,
			contextItems: structuredClone(request.contextItems),
			selectedShapes: editor
				.getSelectedShapes()
				.map((shape) => convertTldrawShapeToFocusedShape(editor, structuredClone(shape))),
		}
		this.chat.push(promptHistoryItem)

		let cancelled = false
		const controller = new AbortController()
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
				for await (const action of this.streamAgentActions({ prompt, signal: controller.signal })) {
					if (cancelled) break

					// Set the acting flag before editor.run so the user action tracker also
					// ignores the incomplete-diff revert below, not just act() itself
					this.setIsActingOnEditor(true)
					try {
						editor.run(
							() => {
								const actionUtilType = this.actions.getAgentActionUtilType(action._type)
								if (!availableActions.includes(actionUtilType)) return

								// Revert the previous partial application of this action before
								// sanitizing, so sanitize sees clean state
								if (incompleteDiff) {
									const inversePrevDiff = reverseRecordsDiff(incompleteDiff)
									editor.store.applyDiff(inversePrevDiff)
									this.lints.trackShapesFromDiff(inversePrevDiff)
									incompleteDiff = null
								}

								const actionUtil = this.actions.getAgentActionUtil(action._type)
								const transformedAction = actionUtil.sanitizeAction(action, helpers)
								if (!transformedAction) return

								const { diff, promise } = this.actions.act(transformedAction, helpers)
								if (promise) actionPromises.push(promise)
								this.lints.trackShapesFromDiff(diff)

								if (transformedAction.complete) {
									this.debug.logCompletedAction(transformedAction)
								} else {
									incompleteDiff = diff
								}
							},
							{ ignoreShapeLock: true, history: 'ignore' }
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
	 * Stream actions from the model as server-sent events.
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
			headers: { 'Content-Type': 'application/json' },
			signal,
		})

		if (!res.body) throw Error('No body in response')

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
					if (!match) continue
					const data = JSON.parse(match[1])
					if ('error' in data) throw new Error(data.error)
					yield data as Streaming<AgentAction>
				}
			}
		} finally {
			reader.releaseLock()
		}
	}
}
