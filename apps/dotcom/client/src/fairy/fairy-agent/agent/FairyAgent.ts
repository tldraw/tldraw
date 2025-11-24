import {
	AgentAction,
	AgentActionInfo,
	AgentInput,
	AgentModelName,
	AgentPrompt,
	AgentRequest,
	BaseAgentPrompt,
	ChatHistoryItem,
	DEFAULT_MODEL_NAME,
	FAIRY_VISION_DIMENSIONS,
	FairyConfig,
	FairyEntity,
	FairyModeDefinition,
	FairyPose,
	FairyProject,
	FairyProjectRole,
	FairyTask,
	FairyTodoItem,
	FairyWaitCondition,
	FairyWaitEvent,
	FairyWork,
	getFairyModeDefinition,
	getModelPricingInfo,
	ModelNamePart,
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
	EditorAtom,
	fetch,
	react,
	RecordsDiff,
	reverseRecordsDiff,
	structuredClone,
	TLRecord,
	VecModel,
} from 'tldraw'
import { TldrawApp } from '../../../tla/app/TldrawApp'
import { FAIRY_WORKER } from '../../../utils/config'
import { AgentActionUtil } from '../../actions/AgentActionUtil'
import { $fairyIsApplyingAction } from '../../FairyIsApplyingAction'
import { getProjectByAgentId } from '../../FairyProjects'
import { $fairyTasks } from '../../FairyTaskList'
import { getAgentActionUtilsRecord, getPromptPartUtilsRecord } from '../../FairyUtils'
import { notifyAgentModeTransition } from '../../FairyWaitNotifications'
import { PromptPartUtil } from '../../parts/PromptPartUtil'
import { AgentHelpers } from './AgentHelpers'
import { FairyAgentOptions } from './FairyAgentOptions'
import { $fairyAgentsAtom, getFairyAgentById } from './fairyAgentsAtom'
import { FAIRY_MODE_CHART } from './FairyModeNode'

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
	$chatHistory = atom<ChatHistoryItem[]>('chatHistory', [])

	/**
	 * An atom containing the position on the page where the current chat
	 * started.
	 */
	$chatOrigin = atom<VecModel>('chatOrigin', { x: 0, y: 0 })

	/**
	 * An atom containing the agent's todo list.
	 */
	$personalTodoList = atom<FairyTodoItem[]>('personalTodoList', [])

	/**
	 * An atom that's used to store document changes made by the user since the
	 * previous request.
	 */
	$userActionHistory = atom<RecordsDiff<TLRecord>[]>('userActionHistory', [])

	/**
	 * An atom containing the current fairy mode.
	 */
	private $mode = atom<FairyModeDefinition['type']>('fairyMode', 'idling')

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
	 * An atom containing the conditions this agent is waiting for.
	 * When events matching these conditions occur, the agent will be notified.
	 */
	$waitingFor = atom<FairyWaitCondition<FairyWaitEvent>[]>('waitingFor', [])

	/**
	 * Change the mode of the agent.
	 * @param mode - The mode to set.
	 */
	setMode(mode: FairyModeDefinition['type']) {
		const fromMode = this.getMode()
		const fromModeNode = FAIRY_MODE_CHART[fromMode]
		const toModeNode = FAIRY_MODE_CHART[mode]

		// todo the order we call these vs notifyAgentModeTransition is probably important
		fromModeNode.onExit?.(this, mode)
		toModeNode.onEnter?.(this, fromMode)

		notifyAgentModeTransition(this.id, mode, this.editor)

		this.$mode.set(mode)
	}

	/**
	 * Get the current mode of the agent.
	 * @returns The mode.
	 */
	getMode(): FairyModeDefinition['type'] {
		return this.$mode.get()
	}

	/**
	 * Cumulative token usage tracking for this chat session.
	 * Tracked per model to handle different pricing models.
	 */
	cumulativeUsage: {
		// Usage per model, separated by tier for models with tiered pricing
		byModel: Record<
			AgentModelName,
			{
				// Tier 1: Prompts ≤ 200K tokens (for models with tiered pricing)
				tier1: {
					promptTokens: number // Total input tokens (cached + uncached)
					cachedInputTokens: number // Cached input tokens (cheaper pricing)
					completionTokens: number
				}
				// Tier 2: Prompts > 200K tokens (for models with tiered pricing)
				tier2: {
					promptTokens: number // Total input tokens (cached + uncached)
					cachedInputTokens: number // Cached input tokens (cheaper pricing)
					completionTokens: number
				}
			}
		>
		// Total across all models and tiers
		totalTokens: number
	} = {
		byModel: {} as Record<
			AgentModelName,
			{
				tier1: { promptTokens: number; cachedInputTokens: number; completionTokens: number }
				tier2: { promptTokens: number; cachedInputTokens: number; completionTokens: number }
			}
		>,
		totalTokens: 0,
	}

	/**
	 * Get the current project that the agent is working on.
	 */
	getProject(): FairyProject | null {
		return getProjectByAgentId(this.id) ?? null
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

	/**
	 * Create a new tldraw agent.
	 */
	constructor({ id, editor, app, onError, getToken }: FairyAgentOptions) {
		this.editor = editor
		this.app = app
		this.id = id
		this.getToken = getToken

		const center = editor.getViewportPageBounds().center
		const spawnPoint = findFairySpawnPoint(center, editor)

		this.$fairyEntity = atom<FairyEntity>(`fairy-${id}`, {
			position: AgentHelpers.RoundVec(spawnPoint),
			flipX: Math.random() < 0.5,
			isSelected: false,
			pose: 'idle',
			gesture: null,
			currentPageId: editor.getCurrentPageId(),
		})

		this.$fairyConfig = computed<FairyConfig>(
			`fairy-config-${id}`,
			() => JSON.parse(app.getUser().fairies || '{}')[id] as FairyConfig
		)

		this.onError = onError

		$fairyAgentsAtom.update(editor, (agents) => [...agents, this])

		// A fairy agent's action utils and prompt part utils are static. They don't change.
		this.agentActionUtils = getAgentActionUtilsRecord(this)
		this.promptPartUtils = getPromptPartUtilsRecord(this)
		this.unknownActionUtil = this.agentActionUtils.unknown

		this.stopRecordingFn = this.startRecordingUserActions()
	}

	/**
	 * Dispose of the agent by cancelling requests and stopping listeners.
	 */
	dispose() {
		this.cancel()
		this.stopRecordingUserActions()
		// Stop following this fairy if it's currently being followed
		if (getFollowingFairyId(this.editor) === this.id) {
			stopFollowingFairy(this.editor)
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
			chatHistory: this.$chatHistory.get(),
			chatOrigin: this.$chatOrigin.get(),
			personalTodoList: this.$personalTodoList.get(),
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
		}
		if (state.chatHistory) {
			this.$chatHistory.set(state.chatHistory)
		}
		if (state.chatOrigin) {
			this.$chatOrigin.set(state.chatOrigin)
		}
		if (state.personalTodoList) {
			this.$personalTodoList.set(state.personalTodoList)
		}
	}

	/**
	 * Reset the cumulative usage tracking for this fairy agent.
	 * Useful when starting a new chat session.
	 */
	resetCumulativeUsage() {
		this.cumulativeUsage = {
			byModel: {} as Record<
				AgentModelName,
				{
					tier1: { promptTokens: number; cachedInputTokens: number; completionTokens: number }
					tier2: { promptTokens: number; cachedInputTokens: number; completionTokens: number }
				}
			>,
			totalTokens: 0,
		}
	}

	/**
	 * Extract the model name from a prompt.
	 * @param prompt - The agent prompt
	 * @returns The model name, or DEFAULT_MODEL_NAME if not found
	 */
	getModelNameFromPrompt(prompt: AgentPrompt): AgentModelName {
		for (const part of Object.values(prompt)) {
			if (part.type === 'modelName') {
				return (part as ModelNamePart).name
			}
		}
		return DEFAULT_MODEL_NAME
	}

	/**
	 * Get the current cumulative cost for this fairy agent.
	 * Calculates costs based on model-specific pricing, accounting for cached input tokens.
	 * @returns An object with input cost, output cost, and total cost in USD.
	 */
	getCumulativeCost() {
		let totalInputCost = 0
		let totalOutputCost = 0

		// Iterate through all models and calculate costs
		for (const [modelName, usage] of Object.entries(this.cumulativeUsage.byModel)) {
			const typedModelName = modelName as AgentModelName

			// Calculate cost for tier 1 (≤ 200K tokens)
			const tier1Pricing = getModelPricingInfo(typedModelName, 200_000)
			const tier1UncachedInputTokens = usage.tier1.promptTokens - usage.tier1.cachedInputTokens
			const tier1UncachedInputCost =
				(tier1UncachedInputTokens / 1_000_000) * tier1Pricing.uncachedInputPrice
			const tier1CachedInputCost =
				tier1Pricing.cacheReadInputPrice !== null
					? (usage.tier1.cachedInputTokens / 1_000_000) * tier1Pricing.cacheReadInputPrice
					: 0
			const tier1InputCost = tier1UncachedInputCost + tier1CachedInputCost
			const tier1OutputCost = (usage.tier1.completionTokens / 1_000_000) * tier1Pricing.outputPrice

			// Calculate cost for tier 2 (> 200K tokens)
			const tier2Pricing = getModelPricingInfo(typedModelName, 200_001)
			const tier2UncachedInputTokens = usage.tier2.promptTokens - usage.tier2.cachedInputTokens
			const tier2UncachedInputCost =
				(tier2UncachedInputTokens / 1_000_000) * tier2Pricing.uncachedInputPrice
			const tier2CachedInputCost =
				tier2Pricing.cacheReadInputPrice !== null
					? (usage.tier2.cachedInputTokens / 1_000_000) * tier2Pricing.cacheReadInputPrice
					: 0
			const tier2InputCost = tier2UncachedInputCost + tier2CachedInputCost
			const tier2OutputCost = (usage.tier2.completionTokens / 1_000_000) * tier2Pricing.outputPrice

			totalInputCost += tier1InputCost + tier2InputCost
			totalOutputCost += tier1OutputCost + tier2OutputCost
		}

		const totalCost = totalInputCost + totalOutputCost

		return { inputCost: totalInputCost, outputCost: totalOutputCost, totalCost }
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
	 * Get a full agent request from a user input by filling out any missing
	 * values with defaults.
	 * @param input - A partial agent request or a string message.
	 */
	getFullRequestFromInput(input: AgentInput): AgentRequest {
		const request = this.getPartialRequestFromInput(input)

		const activeRequest = this.$activeRequest.get()

		return {
			messages: request.messages ?? [],
			source: request.source ?? 'user',
			data: request.data ?? [],
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
			return { messages: [input] }
		}

		// eg: agent.prompt(['Draw a cat', 'Draw a dog'])
		if (Array.isArray(input)) {
			return { messages: input }
		}

		// eg: agent.prompt({ messages: 'Draw a cat' })
		if (typeof input.messages === 'string') {
			return { ...input, messages: [input.messages] }
		}

		// eg: agent.prompt({ message: 'Draw a cat' })
		if (typeof input.message === 'string') {
			return { ...input, messages: [input.message, ...(input.messages ?? [])] }
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

		const mode = getFairyModeDefinition(this.getMode())
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

	private $isPrompting = atom<boolean>('isPrompting', false)

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
		if (this.$isPrompting.get() && !nested) {
			throw new Error('Agent is already prompting. Please wait for the current prompt to finish.')
		}

		this.$isPrompting.set(true)

		if (this.isActing) {
			throw new Error(
				"Agent is already acting. It's illegal to prompt an agent during an action. Please use schedule instead."
			)
		}

		const request = this.getFullRequestFromInput(input)
		const startingNode = FAIRY_MODE_CHART[this.getMode()]
		await startingNode.onPromptStart?.(this, request)

		const initialModeDefinition = getFairyModeDefinition(this.getMode())
		if (!initialModeDefinition.active) {
			throw new Error(
				`Fairy is not in an active mode so can't act right now. First change to an active mode. Current mode: ${this.getMode()}`
			)
		}

		const startingFairy = this.$fairyEntity.get()
		if (startingFairy.pose === 'idle') {
			this.$fairyEntity.update((fairy) => ({ ...fairy, pose: 'active' }))
		}

		// Submit the request to the agent.
		await this.request(request)

		// If there's no schedule request...
		// Trigger onPromptEnd callback(s)
		let modeChanged = true
		while (!this.$scheduledRequest.get() && modeChanged) {
			modeChanged = false
			this.$fairyEntity.update((fairy) => ({ ...fairy, pose: 'idle' }))
			const mode = this.getMode()
			const node = FAIRY_MODE_CHART[mode]
			node.onPromptEnd?.(this, request)
			const newMode = this.getMode()
			if (newMode !== mode) {
				modeChanged = true
			}
		}

		// If there's still no scheduled request, quit
		const scheduledRequest = this.$scheduledRequest.get()
		const eventualMode = this.getMode()
		const eventualModeDefinition = getFairyModeDefinition(eventualMode)
		if (!scheduledRequest) {
			if (eventualModeDefinition.active) {
				throw new Error(
					`Fairy is not allowed to become inactive during the active mode: ${eventualMode}`
				)
			}
			this.$isPrompting.set(false)
			this.cancelFn = null
			return
		}

		// If there *is* a scheduled request...
		// Add the scheduled request to chat history
		const resolvedData = await Promise.all(scheduledRequest.data)
		this.$chatHistory.update((prev) => [
			...prev,
			{
				type: 'continuation',
				data: resolvedData,
				memoryLevel: eventualModeDefinition.memoryLevel,
			},
		])

		// Handle the scheduled request and clear it
		this.$scheduledRequest.set(null)
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
		const request = this.getFullRequestFromInput(input)

		// Interrupt any currently active request
		if (this.$activeRequest.get() !== null) {
			this.cancel()
		}
		this.$activeRequest.set(request)

		// Call an external helper function to request the agent
		const { promise, cancel } = requestAgentActions({ agent: this, request })

		this.cancelFn = cancel
		// promise.finally(() => {
		// 	this.cancelFn = null
		// })

		const results = await promise
		this.$activeRequest.set(null)
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
		const scheduledRequest = this.$scheduledRequest.get()

		// If there's no request scheduled yet, schedule one
		if (!scheduledRequest) {
			this._schedule(input)
			return
		}

		// If there's already a scheduled request, append to it
		const request = this.getPartialRequestFromInput(input)
		this._schedule({
			// Append to properties where possible
			messages: [...scheduledRequest.messages, ...(request.messages ?? [])],
			data: [...scheduledRequest.data, ...(request.data ?? [])],

			// Override other properties
			bounds: request.bounds ?? scheduledRequest.bounds,
			source: request.source ?? scheduledRequest.source ?? 'self',
		})
	}

	/**
	 * Interrupt the agent and set their mode.
	 * Optionally, schedule a request.
	 */
	interrupt({ input, mode }: { input: AgentInput | null; mode?: FairyModeDefinition['type'] }) {
		this.cancelFn?.()
		this.$activeRequest.set(null)
		this.$scheduledRequest.set(null)
		this.cancelFn = null

		if (mode) {
			this.setMode(mode)
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
			this.$scheduledRequest.set(null)
			return
		}

		const activeRequest = this.$activeRequest.get()
		const partialRequest = this.getPartialRequestFromInput(input)
		const request: AgentRequest = {
			messages: partialRequest.messages ?? [],
			bounds:
				partialRequest.bounds ??
				activeRequest?.bounds ??
				Box.FromCenter(this.$fairyEntity.get().position, FAIRY_VISION_DIMENSIONS),
			data: partialRequest.data ?? [],
			source: partialRequest.source ?? 'self',
		}

		const isCurrentlyActive = this.isGenerating()

		if (isCurrentlyActive) {
			this.$scheduledRequest.set(request)
		} else {
			this.prompt(request)
		}
	}

	/**
	 * Add a todo item to the agent's todo list.
	 * @param id The id of the todo item.
	 * @param text The text of the todo item.
	 * @returns The id of the todo item.
	 */
	addPersonalTodo(id: string, text: string) {
		this.$personalTodoList.update((personalTodoItems) => {
			return [
				...personalTodoItems,
				{
					id,
					status: 'todo' as const,
					text,
				},
			]
		})
		return id
	}

	updateTodo({ id, text, status }: FairyTodoItem) {
		this.$personalTodoList.update((todoItems) => {
			const index = todoItems.findIndex((item) => item.id === id)
			if (index !== -1) {
				return [
					...todoItems.slice(0, index),
					{ ...todoItems[index], text, status },
					...todoItems.slice(index + 1),
				]
			}
			return todoItems
		})
	}

	/**
	 * Check if the agent is currently waiting for any events.
	 * @returns true if the agent has any wait conditions
	 */
	isWaiting() {
		return this.$waitingFor.get().length > 0
	}

	/**
	 * Add a wait condition to the agent.
	 * The agent will be notified when an event matching this condition occurs.
	 * @param condition - The wait condition to add
	 */
	waitFor(condition: FairyWaitCondition<FairyWaitEvent>) {
		this.$waitingFor.update((conditions) => [...conditions, condition])
	}

	/**
	 * Clear all wait conditions for this agent.
	 */
	stopWaiting() {
		this.$waitingFor.set([])
	}

	/**
	 * Wake up the agent from waiting with a notification message.
	 * Note: This does NOT remove wait conditions - the matched conditions should
	 * already be removed by the notification system before calling this method.
	 * @param message - The message to send to the agent when waking up
	 * @param _condition - The condition that was fulfilled
	 * @param _event - Optional event data that triggered the wake-up (currently unused)
	 */
	notifyWaitConditionFulfilled(
		message: string,
		_condition: FairyWaitCondition<FairyWaitEvent>,
		_event?: FairyWaitEvent
	) {
		if (this.$isPrompting.get()) {
			this.schedule({
				messages: [message],
				source: 'other-agent',
			})
		} else {
			this.prompt({
				messages: [message],
				source: 'other-agent',
			})
		}
	}

	/**
	 * Make the agent perform an action.
	 * @param action The action to make the agent do.
	 * @param helpers The helpers to use.
	 * @returns The diff of the action, a promise for when the action is finished
	 */
	act(
		action: Streaming<AgentAction>,
		helpers: AgentHelpers = new AgentHelpers(this)
	): {
		diff: RecordsDiff<TLRecord>
		promise: Promise<void> | null
	} {
		const { editor } = this
		const util = this.getAgentActionUtil(action._type)
		this.isActing = true

		const actionInfo = this.getActionInfo(action)
		this.$fairyEntity.update((fairy) => ({ ...fairy, pose: actionInfo.pose }))

		// Ensure the fairy is on the correct page before performing the action
		this.ensureFairyIsOnCorrectPage(action)

		const modeDefinition = getFairyModeDefinition(this.getMode())
		let promise: Promise<void> | null = null
		let diff: RecordsDiff<TLRecord>
		try {
			diff = editor.store.extractingChanges(() => {
				$fairyIsApplyingAction.set(true)
				promise = util.applyAction(structuredClone(action), helpers) ?? null
				$fairyIsApplyingAction.set(false)
			})
		} finally {
			this.isActing = false
		}

		// Add the action to chat history
		if (util.savesToHistory()) {
			const historyItem: ChatHistoryItem = {
				type: 'action',
				action,
				diff,
				acceptance: 'pending',
				memoryLevel: modeDefinition.memoryLevel,
			}

			this.$chatHistory.update((historyItems) => {
				// If there are no items, start off the chat history with the first item
				if (historyItems.length === 0) return [historyItem]

				// If the last item is still in progress, replace it with the new item
				const lastActionHistoryItemIndex = historyItems.findLastIndex(
					(item) => item.type === 'action'
				)
				const lastActionHistoryItem =
					lastActionHistoryItemIndex !== -1 ? historyItems[lastActionHistoryItemIndex] : null
				if (
					lastActionHistoryItem &&
					lastActionHistoryItem.type === 'action' &&
					!lastActionHistoryItem.action.complete
				) {
					const newHistoryItems = [...historyItems]
					newHistoryItems[lastActionHistoryItemIndex] = historyItem
					return newHistoryItems
				} else {
					// Otherwise, just add the new item to the end of the list
					return [...historyItems, historyItem]
				}
			})
		}

		return { diff, promise }
	}

	/**
	 * Remove all completed todo items from the todo list.
	 * Renumber the personal todo items to ensure the ids are sequential.
	 */
	flushTodoList() {
		this.$personalTodoList.update((personalTodoItems) => {
			return personalTodoItems.filter((item) => item.status !== 'done')
		})
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
		const request = this.$activeRequest.get()
		if (request) {
			const mode = this.getMode()
			const node = FAIRY_MODE_CHART[mode]
			node.onPromptCancel?.(this, request)

			const newMode = this.getMode()
			const newModeDefinition = getFairyModeDefinition(newMode)
			if (newModeDefinition.active) {
				throw new Error(
					`Fairy is not allowed to become inactive during the active mode: ${newMode}`
				)
			}
		}

		this.cancelFn?.()
		this.$activeRequest.set(null)
		this.$scheduledRequest.set(null)
		this.cancelFn = null
		this.$fairyEntity.update((fairy) => ({ ...fairy, pose: 'idle' }))
	}

	/**
	 * Reset the agent's chat and memory.
	 * Cancel the current request if there's one active.
	 */
	reset() {
		this.cancel()
		this.promptStartTime = null
		this.$personalTodoList.set([])
		this.$userActionHistory.set([])
		this.setMode('idling')

		this.$chatHistory.set([])
		this.$chatOrigin.set({ x: 0, y: 0 })

		// clear any waiting conditions
		this.stopWaiting()

		// Reset cumulative usage tracking when starting a new chat
		this.resetCumulativeUsage()
	}

	/**
	 * Check if the agent is currently working on a prompt or not.
	 */
	isGenerating() {
		return this.$isPrompting.get()
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

	/**
	 * Start recording user actions.
	 * @returns A cleanup function to stop recording user actions.
	 */
	private startRecordingUserActions() {
		const { editor } = this
		const cleanUpCreate = editor.sideEffects.registerAfterCreateHandler(
			'shape',
			(shape, source) => {
				if (source !== 'user') return
				if (this.isActing) return
				if ($fairyIsApplyingAction.get()) return
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
				if ($fairyIsApplyingAction.get()) return
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
				if ($fairyIsApplyingAction.get()) return
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
	private stopRecordingUserActions() {
		this.stopRecordingFn?.()
	}

	/**
	 * Get information about an agent action, mostly used to display actions within the chat history UI.
	 * @param action - The action to get information about.
	 * @returns The information about the action.
	 */
	getActionInfo(action: Streaming<AgentAction>): AgentActionInfo {
		const util = this.getAgentActionUtil(action._type)
		const info = util.getInfo(action) ?? {}
		const {
			icon = null,
			description = null,
			summary = null,
			canGroup = () => true,
			pose = 'active' as const,
		} = info

		return {
			icon,
			description,
			summary,
			canGroup,
			pose,
		}
	}

	/**
	 * Move the fairy to a position.
	 * @param position - The position to move the fairy to.
	 */
	moveToPosition(position: VecModel) {
		this.$fairyEntity.update((fairy) => {
			return {
				...fairy,
				position: AgentHelpers.RoundVec(position),
				flipX: false,
			}
		})
	}

	/**
	 * Ensures the fairy is on the correct page before performing an action.
	 * For actions that work with existing shapes, switches to the shape's page.
	 * For actions that create new content, ensures the fairy is on the current editor page.
	 */
	private ensureFairyIsOnCorrectPage(action: Streaming<AgentAction>) {
		const { editor } = this
		const fairyEntity = this.$fairyEntity.get()
		if (!fairyEntity) return

		// Extract shape IDs from the action based on action type
		let shapeIds: string[] = []

		// Actions with single shapeId
		if ('shapeId' in action && typeof action.shapeId === 'string') {
			shapeIds = [action.shapeId]
		}
		// Actions with shapeIds array
		else if ('shapeIds' in action && Array.isArray(action.shapeIds)) {
			shapeIds = action.shapeIds as string[]
		}
		// Update action has shape in 'update' property
		else if (
			action._type === 'update' &&
			'update' in action &&
			action.update &&
			typeof action.update === 'object' &&
			'shapeId' in action.update
		) {
			shapeIds = [action.update.shapeId as string]
		}

		// If we have shape IDs, ensure the fairy is on the same page as the first shape
		if (shapeIds.length > 0) {
			const firstShapeId = shapeIds[0].startsWith('shape:') ? shapeIds[0] : `shape:${shapeIds[0]}`
			const shape = editor.getShape(firstShapeId as any)

			if (shape) {
				const shapePageId = editor.getAncestorPageId(shape)
				if (shapePageId && fairyEntity.currentPageId !== shapePageId) {
					// Switch to the shape's page
					editor.setCurrentPage(shapePageId)
					this.$fairyEntity.update((f) => (f ? { ...f, currentPageId: shapePageId } : f))
				}
			}
		}
		// For create actions or actions without shape IDs, ensure fairy is on the current editor page
		else if (action._type === 'create' || action._type === 'pen') {
			const currentPageId = editor.getCurrentPageId()
			if (fairyEntity.currentPageId !== currentPageId) {
				this.$fairyEntity.update((f) => (f ? { ...f, currentPageId } : f))
			}
		}
	}

	/**
	 * Set the fairy's gesture.
	 * @param gesture - The gesture to set the fairy to.
	 */
	setGesture(gesture: FairyPose | null) {
		this.$fairyEntity.update((fairy) => ({ ...fairy, gesture }))
	}

	updateFairyConfig(partial: Partial<FairyConfig>) {
		this.app.z.mutate.user.updateFairyConfig({
			id: this.id,
			properties: partial,
		})
	}

	public deleteFairyConfig() {
		this.app.z.mutate.user.deleteFairyConfig({ id: this.id })
	}

	/**
	 * Set the fairy's personality.
	 * @param personality - A description of the fairy's personality.
	 */
	setFairyPersonality(personality: string) {
		this.updateFairyConfig({ personality })
	}

	/**
	 * Move the camera to the fairy's position.
	 * Also switches to the page where the fairy is located.
	 */
	zoomTo() {
		const entity = this.$fairyEntity.get()
		if (!entity) return

		// Switch to the fairy's page
		if (entity.currentPageId !== this.editor.getCurrentPageId()) {
			this.editor.setCurrentPage(entity.currentPageId)
		}

		// Zoom to the fairy's position
		this.editor.zoomToBounds(Box.FromCenter(entity.position, { x: 100, y: 100 }), {
			animation: { duration: 220 },
			targetZoom: 1,
		})
	}

	/**
	 * Instantly move the fairy to the center of the screen on the current page.
	 * Updates the fairy's currentPageId to match the current editor page.
	 * @param offset Optional offset from the center position
	 */
	summon(offset?: { x: number; y: number }) {
		const center = this.editor.getViewportPageBounds().center
		const position = offset ? { x: center.x + offset.x, y: center.y + offset.y } : center
		const currentPageId = this.editor.getCurrentPageId()
		this.$fairyEntity.update((f) => (f ? { ...f, position, gesture: 'poof', currentPageId } : f))
	}

	/**
	 * Start following this fairy with the camera.
	 */
	startFollowing() {
		startFollowingFairy(this.editor, this.id)
	}

	/**
	 * Stop following this fairy with the camera.
	 */
	stopFollowing() {
		stopFollowingFairy(this.editor)
	}

	/**
	 * Check if this fairy is currently being followed.
	 */
	isFollowing() {
		return getFollowingFairyId(this.editor) === this.id
	}
}

/**
 * Send a request to the agent and handle its response.
 *
 * This is a helper function that is used internally by the agent.
 */
function requestAgentActions({ agent, request }: { agent: FairyAgent; request: AgentRequest }) {
	const { editor } = agent

	// If the request is from the user, add it to chat history
	if (request.source === 'user') {
		const mode = getFairyModeDefinition(agent.getMode())
		const promptHistoryItem: ChatHistoryItem = {
			type: 'prompt',
			message: request.messages.join('\n'),
			memoryLevel: mode.memoryLevel,
		}
		agent.$chatHistory.update((prev) => [...prev, promptHistoryItem])
	}

	let cancelled = false
	const controller = new AbortController()
	const signal = controller.signal
	const helpers = new AgentHelpers(agent)
	const mode = getFairyModeDefinition(agent.getMode())
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

				// NOTE: usage tracking in the client is disabled for now because it's not working as expected. Refer to the worker console for costs and token per request.

				// Handle usage information
				// if ((action as any)._type === '__usage__') {
				// 	const usage = (action as any).usage
				// 	if (usage) {
				// 		// AI SDK returns: { inputTokens, outputTokens, totalTokens, cachedInputTokens }
				// 		// cachedInputTokens can be undefined, which means 0
				// 		const promptTokens = usage.inputTokens || 0
				// 		const completionTokens = usage.outputTokens || 0
				// 		const cachedInputTokens = usage.cachedInputTokens || 0

				// 		// Extract model name from prompt
				// 		const modelName = agent.getModelNameFromPrompt(prompt)

				// 		// Initialize model usage if it doesn't exist
				// 		if (!agent.cumulativeUsage.byModel[modelName]) {
				// 			agent.cumulativeUsage.byModel[modelName] = {
				// 				tier1: { promptTokens: 0, cachedInputTokens: 0, completionTokens: 0 },
				// 				tier2: { promptTokens: 0, cachedInputTokens: 0, completionTokens: 0 },
				// 			}
				// 		}

				// 		// Determine which tier this request falls into
				// 		// Tier 1: ≤ 200K tokens, Tier 2: > 200K tokens
				// 		if (promptTokens <= TIER_THRESHOLD) {
				// 			agent.cumulativeUsage.byModel[modelName].tier1.promptTokens += promptTokens
				// 			agent.cumulativeUsage.byModel[modelName].tier1.cachedInputTokens += cachedInputTokens
				// 			agent.cumulativeUsage.byModel[modelName].tier1.completionTokens += completionTokens
				// 		} else {
				// 			agent.cumulativeUsage.byModel[modelName].tier2.promptTokens += promptTokens
				// 			agent.cumulativeUsage.byModel[modelName].tier2.cachedInputTokens += cachedInputTokens
				// 			agent.cumulativeUsage.byModel[modelName].tier2.completionTokens += completionTokens
				// 		}

				// 		agent.cumulativeUsage.totalTokens += usage.totalTokens || 0

				// 		// Calculate cumulative costs
				// 		const { inputCost, outputCost, totalCost } = agent.getCumulativeCost()

				// 		// Calculate total prompt and completion tokens across all models and tiers
				// 		let totalPromptTokens = 0
				// 		let totalCompletionTokens = 0
				// 		let totalCachedInputTokens = 0
				// 		for (const modelUsage of Object.values(agent.cumulativeUsage.byModel)) {
				// 			totalPromptTokens += modelUsage.tier1.promptTokens + modelUsage.tier2.promptTokens
				// 			totalCompletionTokens +=
				// 				modelUsage.tier1.completionTokens + modelUsage.tier2.completionTokens
				// 			totalCachedInputTokens +=
				// 				modelUsage.tier1.cachedInputTokens + modelUsage.tier2.cachedInputTokens
				// 		}

				// 		// Calculate percentage of input tokens that were cached
				// 		const cachedPercentage =
				// 			totalPromptTokens > 0
				// 				? ((totalCachedInputTokens / totalPromptTokens) * 100).toFixed(1)
				// 				: '0.0'

				// 		// Build input cost string with cached breakdown if applicable
				// 		const inputCostStr =
				// 			totalCachedInputTokens > 0
				// 				? `Input: $${inputCost.toFixed(4)} (${cachedPercentage}% cached)`
				// 				: `Input: $${inputCost.toFixed(4)}`

				// 		// eslint-disable-next-line no-console
				// 		console.debug(
				// 			`🧚 Fairy "${agent.$fairyConfig.get().name}" Cumulative Usage:\n` +
				// 				`  Model: ${modelName}\n` +
				// 				`  Prompt tokens: ${totalPromptTokens.toLocaleString()}\n` +
				// 				`  Completion tokens: ${totalCompletionTokens.toLocaleString()}\n` +
				// 				`  Total tokens: ${agent.cumulativeUsage.totalTokens.toLocaleString()}\n` +
				// 				`  💰 Cumulative Cost: $${totalCost.toFixed(4)}\n` +
				// 				`     (${inputCostStr}, Output: $${outputCost.toFixed(4)})`
				// 		)
				// 	}
				// 	continue
				// }

				editor.run(
					() => {
						const actionUtilType = agent.getAgentActionUtilType(action._type)
						const actionUtil = agent.getAgentActionUtil(action._type)

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
						const { diff, promise } = agent.act(transformedAction, helpers)

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
 * Find a spawn point for the fairy that is at least 200px away from other fairies.
 * Note: If no space can be easily found, fairies may still overlap.
 */
function findFairySpawnPoint(initialPosition: VecModel, editor: Editor): VecModel {
	const existingAgents = $fairyAgentsAtom.get(editor)
	const MIN_DISTANCE = 200
	const INITIAL_BOX_SIZE = 200
	const BOX_EXPANSION = 100

	// Start with the provided initial position
	let candidate = { x: initialPosition.x, y: initialPosition.y }
	const viewportCenter = editor.getViewportPageBounds().center

	// If no other fairies exist, use the center
	if (existingAgents.length === 0) {
		return candidate
	}

	// Try to find a valid spawn point
	let boxSize = INITIAL_BOX_SIZE
	let attempts = 0
	const MAX_ATTEMPTS = 100

	while (attempts < MAX_ATTEMPTS) {
		// Check if the candidate is far enough from all existing fairies
		const tooClose = existingAgents.some((agent) => {
			const otherPosition = agent.$fairyEntity.get().position
			const distance = Math.sqrt(
				Math.pow(candidate.x - otherPosition.x, 2) + Math.pow(candidate.y - otherPosition.y, 2)
			)
			return distance < MIN_DISTANCE
		})

		if (!tooClose) {
			return candidate
		}

		// Generate a new random point in an expanding box around the viewport center
		candidate = {
			x: viewportCenter.x + (Math.random() - 0.5) * boxSize,
			y: viewportCenter.y + (Math.random() - 0.5) * boxSize,
		}

		// Expand the search area after every 10 attempts
		if (attempts % 10 === 9) {
			boxSize += BOX_EXPANSION
		}

		attempts++
	}

	// If we couldn't find a good spot, just return the candidate anyway
	return candidate
}

/**
 * Atom to track which fairy is currently being followed by the camera.
 * Maps from Editor instance to the fairy ID being followed, or null if not following any fairy.
 */
export const $followingFairyId = new EditorAtom<string | null>('followingFairyId', () => null)

/**
 * Store for the reactive dispose functions so we can properly clean them up.
 */
const followDisposeHandlers = new WeakMap<Editor, () => void>()

/**
 * Get the ID of the fairy currently being followed for a given editor.
 */
export function getFollowingFairyId(editor: Editor): string | null {
	return $followingFairyId.get(editor)
}

/**
 * Start following a fairy with the camera.
 * Similar to editor.startFollowingUser but for fairies.
 */
export function startFollowingFairy(editor: Editor, fairyId: string) {
	stopFollowingFairy(editor)

	const agent = getFairyAgentById(fairyId, editor)
	if (!agent) {
		console.warn('Could not find fairy agent with id:', fairyId)
		return
	}

	$followingFairyId.update(editor, () => fairyId)

	// Track last seen position/page to avoid redundant zooms and feedback loops
	let lastX: number | null = null
	let lastY: number | null = null
	let lastPageId: string | null = null

	const disposeFollow = react('follow fairy', () => {
		const currentFairyId = getFollowingFairyId(editor)
		if (currentFairyId !== fairyId) {
			// We're no longer following this fairy
			return
		}

		const currentAgent = getFairyAgentById(fairyId, editor)
		if (!currentAgent) {
			stopFollowingFairy(editor)
			return
		}

		const fairyEntity = currentAgent.$fairyEntity.get()
		if (!fairyEntity) {
			stopFollowingFairy(editor)
			return
		}

		// Only react when position or page actually changes
		const { x, y } = fairyEntity.position
		const pageId = fairyEntity.currentPageId
		const EPS = 0.5
		const samePage = lastPageId === pageId
		const sameX = lastX !== null && Math.abs(lastX - x) < EPS
		const sameY = lastY !== null && Math.abs(lastY - y) < EPS
		if (samePage && sameX && sameY) return

		lastX = x
		lastY = y
		lastPageId = pageId

		currentAgent.zoomTo()
	})

	// Listen for user input events that should stop following
	const onWheel = () => stopFollowingFairy(editor)
	document.addEventListener('wheel', onWheel, { passive: false, capture: true })

	// Also stop following when the user manually changes pages
	const disposePageChange = react('stop following on page change', () => {
		const currentPageId = editor.getCurrentPageId()

		// Skip initial page check
		if (!lastPageId) {
			return
		}

		// If user changed page manually (not from following), stop following
		const currentAgent = getFairyAgentById(fairyId, editor)
		if (currentAgent) {
			const fairyPageId = currentAgent.$fairyEntity.get()?.currentPageId
			if (currentPageId !== fairyPageId && currentPageId !== lastPageId) {
				stopFollowingFairy(editor)
			}
		}
	})

	// Store dispose functions so we can clean them up later
	const dispose = () => {
		disposeFollow()
		disposePageChange()
		document.removeEventListener('wheel', onWheel)
	}
	followDisposeHandlers.set(editor, dispose)
}

/**
 * Stop following any fairy with the camera.
 */
export function stopFollowingFairy(editor: Editor) {
	const dispose = followDisposeHandlers.get(editor)
	if (dispose) {
		dispose()
		followDisposeHandlers.delete(editor)
	}
	$followingFairyId.update(editor, () => null)
}
