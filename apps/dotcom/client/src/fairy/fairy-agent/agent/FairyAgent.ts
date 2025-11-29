import {
	AgentAction,
	AgentInput,
	AgentPrompt,
	AgentRequest,
	BaseAgentPrompt,
	ChatHistoryItem,
	ChatHistoryPromptItem,
	FAIRY_VISION_DIMENSIONS,
	FairyConfig,
	FairyEntity,
	FairyModeDefinition,
	FairyProject,
	FairyProjectRole,
	FairyTask,
	FairyTodoItem,
	FairyWork,
	getFairyModeDefinition,
	PromptPart,
	Streaming,
} from '@tldraw/fairy-shared'
import {
	Atom,
	atom,
	Box,
	computed,
	Computed,
	Editor,
	fetch,
	react,
	RecordsDiff,
	reverseRecordsDiff,
	structuredClone,
	TLRecord,
	uniqueId,
	VecModel,
} from 'tldraw'
import { TldrawApp } from '../../../tla/app/TldrawApp'
import { FAIRY_WORKER } from '../../../utils/config'
import { $fairyAgentsAtom, $fairyTasks } from '../../fairy-globals'
import { getPromptPartUtilsRecord } from '../../fairy-part-utils/fairy-part-utils'
import { PromptPartUtil } from '../../fairy-part-utils/PromptPartUtil'
import { getProjectByAgentId } from '../../fairy-projects'
import { AgentHelpers } from './AgentHelpers'
import { FairyAgentOptions } from './FairyAgentOptions'
import { FAIRY_MODE_CHART } from './FairyModeNode'
import { FairyAgentActionManager } from './managers/FairyAgentActionManager'
import { FairyAgentChatManager } from './managers/FairyAgentChatManager'
import { FairyAgentChatOriginManager } from './managers/FairyAgentChatOriginManager'
import { FairyAgentGestureManager } from './managers/FairyAgentGestureManager'
import { FairyAgentModeManager } from './managers/FairyAgentModeManager'
import { FairyAgentPositionManager } from './managers/FairyAgentPositionManager'
import { FairyAgentRequestManager } from './managers/FairyAgentRequestManager'
import { FairyAgentTodoManager } from './managers/FairyAgentTodoManager'
import { FairyAgentUsageTracker } from './managers/FairyAgentUsageTracker'
import { FairyAgentUserActionTracker } from './managers/FairyAgentUserActionTracker'
import { FairyAgentWaitManager } from './managers/FairyAgentWaitManager'

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
export class FairyAgent {
	/** The editor associated with this agent. */
	editor: Editor
	app: TldrawApp

	/** An id to differentiate the agent from other agents. */
	id: string

	/** The fairy entity associated with this agent. */
	$fairyEntity: Atom<FairyEntity>

	/** The fairy configuration associated with this agent. */
	$fairyConfig: Computed<FairyConfig>

	/** A callback for when an error occurs. */
	onError: (e: any) => void

	/** A function to get the authentication token. */
	getToken?: () => Promise<string | undefined>

	/**
	 * Debug flags for controlling logging behavior in the worker.
	 */
	$debugFlags = atom<{ logSystemPrompt: boolean; logMessages: boolean; logResponseTime: boolean }>(
		'debugFlags',
		{
			logSystemPrompt: false,
			logMessages: false,
			logResponseTime: false,
		}
	)

	/**
	 * Whether the agent should use one-shotting mode or soloing mode when prompted solo.
	 */
	$useOneShottingMode = atom<boolean>('oneShotMode', true)

	/**
	 * A function that stops the wake-on-select reaction.
	 */
	private wakeOnSelectReaction: () => void

	/**
	 * Handler for the max-shapes event to cancel fairy when limit is reached.
	 */
	private handleMaxShapes: () => void

	/**
	 * Get the current project that the agent is working on.
	 */
	getProject(): FairyProject | null {
		return getProjectByAgentId(this.id) ?? null
	}

	getEntity(): FairyEntity {
		return this.$fairyEntity.get()
	}

	/**
	 * Get the tasks that the agent is working on.
	 */
	getTasks(): FairyTask[] {
		return $fairyTasks.get().filter((task) => task.assignedTo === this.id)
	}

	/**
	 * Get the role of the agent within its current project.
	 */
	getRole(): FairyProjectRole | null {
		const project = this.getProject()
		if (!project) return null
		return project.members.find((member) => member.id === this.id)?.role ?? null
	}

	/**
	 * Get the work that the agent is currently working on.
	 * @returns The work.
	 */
	getWork(): FairyWork {
		return {
			project: this.getProject(),
			tasks: this.getTasks(),
		}
	}

	actionManager = new FairyAgentActionManager(this)
	chatManager = new FairyAgentChatManager(this)
	chatOriginManager = new FairyAgentChatOriginManager(this)
	gestureManager = new FairyAgentGestureManager(this)
	modeManager = new FairyAgentModeManager(this)
	positionManager = new FairyAgentPositionManager(this)
	requestManager = new FairyAgentRequestManager(this)
	todoManager = new FairyAgentTodoManager(this)
	usageTracker = new FairyAgentUsageTracker(this)
	userActionTracker = new FairyAgentUserActionTracker(this)
	waitManager = new FairyAgentWaitManager(this)

	/**
	 * Create a new tldraw agent.
	 */
	constructor({ id, editor, app, onError, getToken }: FairyAgentOptions) {
		this.editor = editor
		this.app = app
		this.id = id
		this.getToken = getToken

		const spawnPoint = this.positionManager.findFairySpawnPoint()

		this.$fairyEntity = atom<FairyEntity>(`fairy-${id}`, {
			position: AgentHelpers.RoundVec(spawnPoint),
			flipX: Math.random() < 0.5,
			isSelected: false,
			pose: 'sleeping',
			gesture: null,
			currentPageId: editor.getCurrentPageId(),
		})

		this.$fairyConfig = computed<FairyConfig>(
			`fairy-config-${id}`,
			() => JSON.parse(app.getUser().fairies || '{}')[id] as FairyConfig
		)

		this.onError = onError

		$fairyAgentsAtom.update(editor, (agents) => [...agents, this])

		// Wake up sleeping fairies when they become selected
		this.wakeOnSelectReaction = react(`fairy-${id}-wake-on-select`, () => {
			const entity = this.$fairyEntity.get()
			if (entity?.isSelected && this.modeManager.getMode() === 'sleeping') {
				this.modeManager.setMode('idling')
			}
		})

		// A fairy agent's prompt part utils are static. They don't change.
		this.promptPartUtils = getPromptPartUtilsRecord(this)

		this.userActionTracker.startRecording()

		// Cancel fairy when max shapes limit is reached
		this.handleMaxShapes = () => {
			if (this.requestManager.isGenerating()) {
				this.interrupt({
					input: {
						agentMessages: [
							'Maximum shapes reached. Stop all your work and return to your home in the forest.',
						],
					},
				})
			}
		}
		editor.addListener('max-shapes', this.handleMaxShapes)

		// Poof on spawn
		this.gestureManager.push('poof', 400)
	}

	/**
	 * Dispose of the agent by cancelling requests and stopping listeners.
	 */
	dispose() {
		this.cancel()
		this.userActionTracker.dispose()
		this.wakeOnSelectReaction?.()
		this.editor.removeListener('max-shapes', this.handleMaxShapes)
		// Stop following this fairy if it's currently being followed
		if (this.positionManager.getFollowingFairyId() === this.id) {
			this.positionManager.stopFollowing()
		}
		$fairyAgentsAtom.update(this.editor, (agents) => agents.filter((agent) => agent.id !== this.id))
	}

	/**
	 * Serialize the fairy agent's state to a plain object for persistence.
	 * This is stored in the database as JSON.
	 */
	serializeState() {
		return {
			fairyEntity: this.$fairyEntity.get(),
			chatHistory: this.chatManager.serializeState(),
			chatOrigin: this.chatOriginManager.serializeState(),
			personalTodoList: this.todoManager.serializeState(),
			waitingFor: this.waitManager.serializeState(),
		}
	}

	/**
	 * Load previously persisted state into the fairy agent.
	 * This is called when opening a file to restore the fairy's state.
	 */
	loadState(state: {
		fairyEntity?: FairyEntity
		chatHistory?: ChatHistoryItem[]
		chatOrigin?: VecModel
		personalTodoList?: FairyTodoItem[]
		waitingFor?: { eventType: string; id: string; metadata?: Record<string, any> }[]
	}) {
		if (state.fairyEntity) {
			this.$fairyEntity.update((entity) => {
				return {
					...entity,
					position: AgentHelpers.RoundVec(state.fairyEntity?.position ?? entity.position),
					flipX: state.fairyEntity?.flipX ?? entity.flipX,
					currentPageId: state.fairyEntity?.currentPageId ?? entity.currentPageId,
					isSelected: state.fairyEntity?.isSelected ?? entity.isSelected,
					pose: state.fairyEntity?.pose ?? entity.pose,
					gesture: state.fairyEntity?.gesture ?? entity.gesture,
				}
			})
			if (this.$fairyEntity.get().pose !== 'sleeping') {
				this.modeManager.setMode('idling')
			}
		}
		if (state.chatHistory) {
			this.chatManager.loadState(state.chatHistory)
		}
		if (state.chatOrigin) {
			this.chatOriginManager.loadState(state.chatOrigin)
		}
		if (state.personalTodoList) {
			this.todoManager.loadState(state.personalTodoList)
		}
		if (state.waitingFor) {
			this.waitManager.loadState(state.waitingFor)
		}
	}

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
	 * Get a full agent request from a user input by filling out any missing
	 * values with defaults.
	 * @param input - A partial agent request or a string message.
	 */
	getFullRequestFromInput(input: AgentInput): AgentRequest {
		const request = this.getPartialRequestFromInput(input)

		const activeRequest = this.requestManager.getActiveRequest()

		return {
			agentMessages: request.agentMessages ?? [],
			source: request.source ?? 'user',
			data: request.data ?? [],
			userMessages: request.userMessages ?? [],
			bounds:
				request.bounds ??
				activeRequest?.bounds ??
				Box.FromCenter(this.$fairyEntity.get().position, FAIRY_VISION_DIMENSIONS),
		} satisfies AgentRequest
	}

	/**
	 * Convert an input into a partial request.
	 * This involves handling the various ways that the input can be provided.
	 *
	 * @example
	 * ```tsx
	 * agent.prompt('Draw a cat')
	 * agent.prompt(['Draw a cat', 'Draw a dog'])
	 * agent.prompt({ messages: 'Draw a cat' })
	 * agent.prompt({ message: 'Draw a cat' })
	 * ```
	 *
	 * @param input - The input to get the request partial from.
	 * @returns The request partial.
	 */
	private getPartialRequestFromInput(input: AgentInput): Partial<AgentRequest> {
		// eg: agent.prompt('Draw a cat')
		if (typeof input === 'string') {
			return { agentMessages: [input] }
		}

		// eg: agent.prompt(['Draw a cat', 'Draw a dog'])
		if (Array.isArray(input)) {
			return { agentMessages: input }
		}

		// eg: agent.prompt({ message: 'Draw a cat' })
		if ('message' in input && typeof input.message === 'string') {
			return {
				...input,
				agentMessages: [input.message],
				userMessages: [input.message],
			}
		}

		return input
	}

	/**
	 * Get a full prompt based on a request.
	 *
	 * @param request - The request to use for the prompt.
	 * @param helpers - The helpers to use.
	 * @returns The fully assembled prompt.
	 */
	async preparePrompt(request: AgentRequest, helpers: AgentHelpers): Promise<AgentPrompt> {
		const { promptPartUtils } = this
		const parts: PromptPart[] = []

		const mode = getFairyModeDefinition(this.modeManager.getMode())
		if (!mode.active) {
			throw new Error(`Fairy is not in an active mode so can't act right now`)
		}
		const availablePromptPartTypes = mode.parts(this.getWork())
		for (const partType of availablePromptPartTypes) {
			const util = promptPartUtils[partType]
			if (!util) throw new Error(`Prompt part util not found for part type: ${partType}`)
			const part = await util.getPart(structuredClone(request), helpers)
			if (!part) continue
			parts.push(part)
		}

		return Object.fromEntries(parts.map((part) => [part.type, part])) as AgentPrompt
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
	async prompt(input: AgentInput, { nested = false }: { nested?: boolean } = {}) {
		if (this.requestManager.isGenerating() && !nested) {
			throw new Error('Agent is already prompting. Please wait for the current prompt to finish.')
		}

		this.requestManager.setIsPrompting(true)

		if (this.isActing) {
			throw new Error(
				"Agent is already acting. It's illegal to prompt an agent during an action. Please use schedule instead."
			)
		}

		const request = this.getFullRequestFromInput(input)
		const startingNode = FAIRY_MODE_CHART[this.modeManager.getMode()]
		startingNode.onPromptStart?.(this, request)

		const initialModeDefinition = getFairyModeDefinition(this.modeManager.getMode())
		if (!initialModeDefinition.active) {
			throw new Error(
				`Fairy is not in an active mode so can't act right now. First change to an active mode. Current mode: ${this.modeManager.getMode()}`
			)
		}

		// Submit the request to the agent.
		await this.request(request)

		// If there's no schedule request...
		// Trigger onPromptEnd callback(s)
		let modeChanged = true
		while (!this.requestManager.getScheduledRequest() && modeChanged) {
			modeChanged = false
			const mode = this.modeManager.getMode()
			const node = FAIRY_MODE_CHART[mode]
			node.onPromptEnd?.(this, request)
			const newMode = this.modeManager.getMode()
			if (newMode !== mode) {
				modeChanged = true
			}
		}

		// If there's still no scheduled request, quit
		const scheduledRequest = this.requestManager.getScheduledRequest()
		const eventualMode = this.modeManager.getMode()
		const eventualModeDefinition = getFairyModeDefinition(eventualMode)
		if (!scheduledRequest) {
			if (eventualModeDefinition.active) {
				throw new Error(
					`Fairy is not allowed to become inactive during the active mode: ${eventualMode}`
				)
			}
			this.requestManager.setIsPrompting(false)
			this.requestManager.setCancelFn(null)
			return
		}

		// If there *is* a scheduled request...
		// Add the scheduled request to chat history
		const resolvedData = await Promise.all(scheduledRequest.data)
		this.chatManager.push({
			id: uniqueId(),
			type: 'continuation',
			data: resolvedData,
			memoryLevel: eventualModeDefinition.memoryLevel,
		})

		// Handle the scheduled request and clear it
		this.requestManager.setScheduledRequest(null)
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
		const request = this.requestManager.getFullRequestFromInput(input)

		// Interrupt any currently active request
		if (this.requestManager.getActiveRequest() !== null) {
			this.cancel()
		}
		this.requestManager.setActiveRequest(request)

		// Call an external helper function to request the agent
		const { promise, cancel } = this.requestAgentActions({ agent: this, request })

		this.requestManager.setCancelFn(cancel)
		// promise.finally(() => {
		// 	this.requestManager.setCancelFn(null)
		// })

		const results = await promise
		this.requestManager.setActiveRequest(null)
		return results
	}

	/**
	 * Schedule further work for the agent to do after this request has finished.
	 * If there's no active request, then do the scheduled request immediately.
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
		const scheduledRequest = this.requestManager.getScheduledRequest()

		// If there's no request scheduled yet, schedule one
		if (!scheduledRequest) {
			this._schedule(input)
			return
		}

		// If there's already a scheduled request, append to it
		const newRequest = this.getPartialRequestFromInput(input)
		this._schedule({
			// Append to properties where possible
			agentMessages: [...scheduledRequest.agentMessages, ...(newRequest.agentMessages ?? [])],
			userMessages: [...scheduledRequest.userMessages, ...(newRequest.userMessages ?? [])],
			data: [...scheduledRequest.data, ...(newRequest.data ?? [])],

			// Override other properties
			bounds: newRequest.bounds ?? scheduledRequest.bounds,
			source: newRequest.source ?? scheduledRequest.source ?? 'self',
		})
	}

	/**
	 * Interrupt the agent and set their mode.
	 * Optionally, schedule a request.
	 */
	interrupt({ input, mode }: { input: AgentInput | null; mode?: FairyModeDefinition['type'] }) {
		this._cancel()

		if (mode) {
			this.modeManager.setMode(mode)
		}
		if (input !== null) {
			this.schedule(input)
		}
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
			this.requestManager.clearScheduledRequest()
			return
		}

		const activeRequest = this.requestManager.getActiveRequest()
		const partialRequest = this.getPartialRequestFromInput(input)
		const request: AgentRequest = {
			agentMessages: partialRequest.agentMessages ?? [],
			bounds:
				partialRequest.bounds ??
				activeRequest?.bounds ??
				Box.FromCenter(this.$fairyEntity.get().position, FAIRY_VISION_DIMENSIONS),
			data: partialRequest.data ?? [],
			source: partialRequest.source ?? 'self',
			userMessages: partialRequest.userMessages ?? [],
		}

		const isCurrentlyActive = this.requestManager.isGenerating()

		if (isCurrentlyActive) {
			this.requestManager.setScheduledRequest(request)
		} else {
			this.prompt(request)
		}
	}

	/**
	 * Stream a response from the model.
	 * Act on the model's events as they come in.
	 *
	 * Not to be called directly. Use `prompt` instead.
	 * This is a helper function that is used internally by the agent.
	 */
	async *_streamActions({
		prompt,
		signal,
	}: {
		prompt: BaseAgentPrompt
		signal: AbortSignal
	}): AsyncGenerator<Streaming<AgentAction>> {
		const headers: HeadersInit = {
			'Content-Type': 'application/json',
		}

		// Add authentication token if available
		if (this.getToken) {
			const token = await this.getToken()
			if (token) {
				headers['Authorization'] = `Bearer ${token}`
			}
		}

		const res = await fetch(`${FAIRY_WORKER}/stream-actions`, {
			method: 'POST',
			body: JSON.stringify(prompt),
			headers,
			signal,
		})

		if (!res.ok) {
			const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
			throw new Error(errorData.error || 'Request failed')
		}

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
	 * A function that cancels the agent's current prompt, if one is active.
	 */
	private cancelFn: (() => void) | null = null

	/**
	 * Cancel the agent's current prompt, if one is active.
	 */
	cancel() {
		const request = this.requestManager.getActiveRequest()
		if (request) {
			const mode = this.modeManager.getMode()
			const node = FAIRY_MODE_CHART[mode]
			node.onPromptCancel?.(this, request)

			const newMode = this.modeManager.getMode()
			const newModeDefinition = getFairyModeDefinition(newMode)
			if (newModeDefinition.active) {
				throw new Error(
					`Fairy is not allowed to become inactive during the active mode: ${newMode}`
				)
			}
		}

		this._cancel()
	}

	private _cancel() {
		this.cancelFn?.()
		this.requestManager.clearActiveRequest()
		this.requestManager.clearScheduledRequest()
		this.cancelFn = null
	}

	/**
	 * Reset the agent's chat and memory.
	 * Cancel the current request if there's one active.
	 */
	reset() {
		this.cancel()
		this.promptStartTime = null
		this.todoManager.deleteAll()
		this.userActionTracker.clearHistory()

		// Remove solo tasks
		$fairyTasks.update((tasks) =>
			tasks.filter((task) => task.assignedTo !== this.id && task.projectId === null)
		)

		this.modeManager.setMode('idling')

		this.chatManager.clear()
		this.chatOriginManager.reset()

		// clear any waiting conditions
		this.waitManager.clear()

		// Reset cumulative usage tracking when starting a new chat
		this.usageTracker.resetCumulativeUsage()
	}

	/**
	 * Whether the agent is currently acting on the editor or not.
	 * This flag is used to prevent agent actions from being recorded as user actions.
	 *
	 * Do not use this to check if the agent is currently working on a request. Use `isGenerating` instead.
	 */
	private isActing = false

	/**
	 * Tracks the start time of the current prompt being timed.
	 * Set when timing starts, cleared when timing stops.
	 */
	promptStartTime: number | null = null

	updateFairyConfig(partial: Partial<FairyConfig>) {
		this.app.z.mutate.user.updateFairyConfig({
			id: this.id,
			properties: partial,
		})
	}

	public deleteFairyConfig() {
		this.app.z.mutate.user.deleteFairyConfig({ id: this.id })
	}

	private requestAgentActions({ agent, request }: { agent: FairyAgent; request: AgentRequest }) {
		const { editor } = agent

		const mode = getFairyModeDefinition(agent.modeManager.getMode())

		// Convert arrays to strings for ChatHistoryPromptItem
		const agentFacingMessage = request.agentMessages.join('\n')
		const userFacingMessage = request.userMessages.join('\n')

		const promptHistoryItem: ChatHistoryPromptItem = {
			id: uniqueId(),
			type: 'prompt',
			promptSource: request.source,
			agentFacingMessage,
			userFacingMessage,
			memoryLevel: mode.memoryLevel,
		}
		agent.chatManager.push(promptHistoryItem)

		let cancelled = false
		const controller = new AbortController()
		const signal = controller.signal
		const helpers = new AgentHelpers(agent)

		if (!mode.active) {
			agent.cancel()
			throw new Error(`Fairy is not in an active mode so can't act right now`)
		}
		const availableActions = mode.actions(agent.getWork())

		const requestPromise = (async () => {
			const prompt = await agent.preparePrompt(request, helpers)
			let incompleteDiff: RecordsDiff<TLRecord> | null = null
			const actionPromises: Promise<void>[] = []
			try {
				for await (const action of agent._streamActions({ prompt, signal })) {
					if (cancelled) break

					editor.run(
						() => {
							const actionUtilType = agent.actionManager.getAgentActionUtilType(action._type)
							const actionUtil = agent.actionManager.getAgentActionUtil(action._type)

							// If the action is not in the wand's available actions, skip it
							if (!(availableActions as string[]).includes(actionUtilType)) {
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
							const { diff, promise } = agent.actionManager.act(transformedAction, helpers)

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
}
