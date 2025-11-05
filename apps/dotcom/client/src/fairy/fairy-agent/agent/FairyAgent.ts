import {
	AgentAction,
	AgentActionInfo,
	AgentInput,
	AgentPrompt,
	AgentRequest,
	AreaContextItem,
	BaseAgentPrompt,
	ChatHistoryItem,
	ContextItem,
	FAIRY_VISION_DIMENSIONS,
	FairyConfig,
	FairyEntity,
	FairyMode,
	FairyPose,
	FairyProject,
	FocusedShape,
	getFairyMode,
	getWand,
	PointContextItem,
	PromptPart,
	ShapeContextItem,
	ShapesContextItem,
	SharedTodoItem,
	Streaming,
	TodoItem,
	Wand,
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
	Vec,
	VecModel,
} from 'tldraw'
import { TldrawApp } from '../../../tla/app/TldrawApp'
import { FAIRY_WORKER } from '../../../utils/config'
import { AgentActionUtil } from '../../actions/AgentActionUtil'
import { $fairyIsApplyingAction } from '../../FairyIsApplyingAction'
import { getAgentActionUtilsRecord, getPromptPartUtilsRecord } from '../../FairyUtils'
import { PromptPartUtil } from '../../parts/PromptPartUtil'
import { $projects, deleteProject } from '../../Projects'
import { $sharedTodoList } from '../../SharedTodoList'
import { AgentHelpers } from './AgentHelpers'
import { FairyAgentOptions } from './FairyAgentOptions'
import { $fairyAgentsAtom, getFairyAgentById } from './fairyAgentsAtom'

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
	$todoList = atom<TodoItem[]>('todoList', [])

	/**
	 * An atom that's used to store document changes made by the user since the
	 * previous request.
	 */
	$userActionHistory = atom<RecordsDiff<TLRecord>[]>('userActionHistory', [])

	/**
	 * An atom containing currently selected context items.
	 *
	 * To send context items to the model, include them in the `contextItems`
	 * field of a request.
	 */
	$contextItems = atom<ContextItem[]>('contextItems', [])

	/**
	 * Get the current project that the agent is working on.
	 */
	getCurrentProject(): FairyProject | null {
		const projects = $projects.get()
		const fairyProjects = projects.filter((project) => project.memberIds.includes(this.id))
		if (fairyProjects.length === 0) return null
		if (fairyProjects.length === 1) return fairyProjects[0]

		// If the fairy is in multiple projects, return the first one, and delete all the other invalid ones
		const validProject = fairyProjects[0]
		const invalidProjects = fairyProjects.slice(1)
		invalidProjects.forEach((project) => {
			deleteProject(project.id)
		})
		return validProject
	}

	/**
	 * Cumulative token usage tracking for this chat session.
	 * Separated by tier to handle Claude 4.5 Sonnet's tiered pricing.
	 */
	cumulativeUsage = {
		// Tier 1: Prompts ≤ 200K tokens
		tier1: {
			promptTokens: 0,
			completionTokens: 0,
		},
		// Tier 2: Prompts > 200K tokens
		tier2: {
			promptTokens: 0,
			completionTokens: 0,
		},
		// Total across all tiers
		totalTokens: 0,
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
			position: spawnPoint,
			flipX: false,
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
			todoList: this.$todoList.get(),
			contextItems: this.$contextItems.get(),
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
		todoList?: TodoItem[]
		contextItems?: ContextItem[]
	}) {
		if (state.fairyEntity) {
			this.$fairyEntity.update((entity) => {
				return {
					...entity,
					position: state.fairyEntity?.position ?? entity.position,
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
		if (state.todoList) {
			this.$todoList.set(state.todoList)
		}
		if (state.contextItems) {
			this.$contextItems.set(state.contextItems)
		}
	}

	/**
	 * Reset the cumulative usage tracking for this fairy agent.
	 * Useful when starting a new chat session.
	 */
	resetCumulativeUsage() {
		this.cumulativeUsage = {
			tier1: {
				promptTokens: 0,
				completionTokens: 0,
			},
			tier2: {
				promptTokens: 0,
				completionTokens: 0,
			},
			totalTokens: 0,
		}
	}

	/**
	 * Get the current cumulative cost for this fairy agent.
	 * Based on Claude 4.5 Sonnet tiered pricing:
	 * - Tier 1 (≤ 200K tokens): $3 input / $15 output per million tokens
	 * - Tier 2 (> 200K tokens): $6 input / $22.50 output per million tokens
	 * @returns An object with input cost, output cost, and total cost in USD.
	 */
	getCumulativeCost() {
		// Claude 4.5 Sonnet pricing per million tokens
		// Tier 1: Prompts ≤ 200K tokens
		const tier1InputPrice = 3 // $3 per million input tokens
		const tier1OutputPrice = 15 // $15 per million output tokens

		// Tier 2: Prompts > 200K tokens
		const tier2InputPrice = 6 // $6 per million input tokens
		const tier2OutputPrice = 22.5 // $22.50 per million output tokens

		// Calculate costs for each tier
		const tier1InputCost = (this.cumulativeUsage.tier1.promptTokens / 1_000_000) * tier1InputPrice
		const tier1OutputCost =
			(this.cumulativeUsage.tier1.completionTokens / 1_000_000) * tier1OutputPrice

		const tier2InputCost = (this.cumulativeUsage.tier2.promptTokens / 1_000_000) * tier2InputPrice
		const tier2OutputCost =
			(this.cumulativeUsage.tier2.completionTokens / 1_000_000) * tier2OutputPrice

		const inputCost = tier1InputCost + tier2InputCost
		const outputCost = tier1OutputCost + tier2OutputCost
		const totalCost = inputCost + outputCost

		return { inputCost, outputCost, totalCost }
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
	 * Validate and normalize wand, ensuring it is available for the given mode.
	 * @param candidateWand - The wand to validate
	 * @param mode - The mode to validate against
	 * @returns The validated wand
	 */
	private validateWandForMode<ModeId extends FairyMode['id']>(
		candidateWand: Wand['type'],
		mode: ModeId
	): Wand['type'] {
		const modeInfo = getFairyMode(mode)
		const wand = (modeInfo.availableWands as readonly Wand['type'][]).includes(candidateWand)
			? candidateWand
			: modeInfo.defaultWand

		return wand
	}

	/**
	 * Get the mode of the fairy agent, which is determined by their current project.
	 * @returns The mode of the fairy agent, which is either 'orchestrator', 'drone', or 'default'.
	 */
	getMode() {
		const project = this.getCurrentProject()
		if (!project) return 'default'
		if (project.orchestratorId === this.id) return 'orchestrator'
		return 'drone'
	}

	/**
	 * Get a full agent request from a user input by filling out any missing
	 * values with defaults.
	 * @param input - A partial agent request or a string message.
	 */
	getFullRequestFromInput(input: AgentInput): AgentRequest {
		const request = this.getPartialRequestFromInput(input)

		const activeRequest = this.$activeRequest.get()

		const mode = request.mode ?? this.getMode()
		const candidateWand = request.wand ?? this.$fairyConfig.get().wand
		const validatedWand = this.validateWandForMode(candidateWand, mode)

		return {
			type: request.type ?? 'user',
			wand: validatedWand,
			mode,
			messages: request.messages ?? [],
			data: request.data ?? [],
			selectedShapes: request.selectedShapes ?? [],
			contextItems: request.contextItems ?? [],
			bounds:
				request.bounds ??
				activeRequest?.bounds ??
				Box.FromCenter(this.$fairyEntity.get().position, FAIRY_VISION_DIMENSIONS),
		} as AgentRequest
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
		const transformedParts: PromptPart[] = []

		const wand = getWand(request.wand)
		const availablePromptPartUtils = []
		for (const part of wand.parts) {
			const util = promptPartUtils[part]
			if (util) availablePromptPartUtils.push(util)
		}

		for (const util of availablePromptPartUtils) {
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
		if (this.isActing) {
			throw new Error(
				"Agent is already acting. It's illegal to prompt an agent during an action. Please use schedule instead."
			)
		}

		const startingFairy = this.$fairyEntity.get()
		if (startingFairy.pose === 'idle') {
			this.$fairyEntity.update((fairy) => ({ ...fairy, pose: 'active' }))
		}

		const request = this.getFullRequestFromInput(input)

		// Submit the request to the agent.
		await this.request(request)

		// After the request is handled, check if there are any outstanding todo items or requests
		let scheduledRequest = this.$scheduledRequest.get()
		if (!scheduledRequest) {
			if (!this.cancelFn) {
				this.$fairyEntity.update((fairy) => ({ ...fairy, pose: 'idle' }))
				return
			}

			const isOrchestrator = this.getMode() === 'orchestrator'
			const project = this.getCurrentProject()
			const validatedWand = this.validateWandForMode(request.wand, request.mode)

			if (isOrchestrator) {
				// if the fairy is an orchestrator with an active project, prompt it to keep going

				const message = `You are the orchestrator of your current project. Please continue the project or end it.`
				request.messages.push(message)

				scheduledRequest = {
					messages: request.messages,
					contextItems: request.contextItems,
					bounds: request.bounds,
					selectedShapes: request.selectedShapes,
					data: request.data,
					type: 'schedule',
					wand: validatedWand,
					mode: request.mode,
				} as AgentRequest
			} else {
				// if the fairy is not an orchestrator or does not have an active project, check if there are todos it can do
				const sharedTodoItemsRemaining = $sharedTodoList.get().filter((item) => {
					if (item.status === 'done') return false
					if (item.assignedById && item.assignedById !== this.id) return false

					// If the fairy is in a project, only count todos that are part of that project
					if (project && !item.projectId) return false
					if (project && item.projectId && item.projectId !== project.id) return false

					// If the fairy is not in a project, only count todos that are not part of a project
					if (!project && item.projectId) return false

					return true
				})
				if (sharedTodoItemsRemaining.length > 0) {
					scheduledRequest = {
						messages: request.messages,
						contextItems: request.contextItems,
						bounds: request.bounds,
						selectedShapes: request.selectedShapes,
						data: request.data,
						type: 'todo',
						wand: validatedWand,
						mode: request.mode,
					} as AgentRequest
				}
			}
		}

		// if scheduled request didn't get defined in the above block OR if the user has cancelled the request, return and go idle
		if (!scheduledRequest) {
			this.$fairyEntity.update((fairy) => ({ ...fairy, pose: 'idle' }))
			return
		}

		// Add the scheduled request to chat history
		const resolvedData = await Promise.all(scheduledRequest.data)
		this.$chatHistory.update((prev) => [
			...prev,
			{
				type: 'continuation',
				data: resolvedData,
			},
		])

		// Handle the scheduled request
		this.$scheduledRequest.set(null)
		await this.prompt(scheduledRequest)
		this.cancelFn = null
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
			this.setScheduledRequest(input)
			return
		}

		const request = this.getPartialRequestFromInput(input)

		this.setScheduledRequest({
			type: 'schedule',

			// Append to properties where possible
			messages: [...scheduledRequest.messages, ...(request.messages ?? [])],
			contextItems: [...scheduledRequest.contextItems, ...(request.contextItems ?? [])],
			selectedShapes: [...scheduledRequest.selectedShapes, ...(request.selectedShapes ?? [])],
			data: [...scheduledRequest.data, ...(request.data ?? [])],

			// Override specific properties
			bounds: request.bounds ?? scheduledRequest.bounds,
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
	setScheduledRequest(input: AgentInput | null) {
		if (input === null) {
			this.$scheduledRequest.set(null)
			return
		}

		const request = this.getFullRequestFromInput(input)
		request.type = 'schedule'
		this.$scheduledRequest.set(request)
	}

	/**
	 * Add a todo item to the agent's todo list.
	 * @param text The text of the todo item.
	 * @returns The id of the todo item.
	 */
	addTodo(text: string) {
		const id = this.$todoList.get().length
		this.$todoList.update((todoItems) => {
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

	helpOut(todoItems?: SharedTodoItem[], sourceFairyId?: string) {
		const helpOutMessages: string[] = []

		if (todoItems && todoItems.length > 0) {
			helpOutMessages.push(`You've been asked to help out with the following todo ${todoItems.length > 1 ? 'items' : 'item'}. Make sure to always set the todo you're currently working on as "in-progress" when you start working on it.
Todo ${todoItems.length > 1 ? 'items' : 'item'}: 
${JSON.stringify(todoItems)}`)
		} else {
			helpOutMessages.push(`Please carry out any incomplete tasks that are assigned to you.`)
		}

		if (sourceFairyId) {
			const sourceFairy = getFairyAgentById(sourceFairyId, this.editor)
			if (sourceFairy) {
				helpOutMessages.push(
					`This ask for assistance was made by fairy ${sourceFairy.$fairyConfig.get().name}.`
				)
			} else {
				helpOutMessages.push(
					`This ask for assistance was made by a fairy with id ${sourceFairyId}.`
				)
			}
		}

		if (this.isGenerating()) {
			this.schedule({
				messages: helpOutMessages,
			})
		} else {
			this.prompt({
				type: 'schedule',
				messages: helpOutMessages,
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

		return { diff, promise }
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
	 * Request a text response from the model.
	 * @param input - The input to form the request from.
	 * @returns The text response from the model.
	 */
	async requestText(input: AgentInput) {
		const request = this.getFullRequestFromInput(input)
		const { fulltextPromise, cancel: _cancel } = requestAgentText({ agent: this, request })
		return await fulltextPromise
	}

	/**
	 * Stream a text response from the model.
	 * Not to be called directly. Use `requestText` instead.
	 * This is a helper function that is used internally by the agent.
	 */
	async *_streamText({
		prompt,
		signal,
	}: {
		prompt: BaseAgentPrompt
		signal: AbortSignal
	}): AsyncGenerator<string> {
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

		const res = await fetch(`${FAIRY_WORKER}/stream-text`, {
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
				const chunks = buffer.split('\n\n')
				buffer = chunks.pop() || ''

				for (const chunk of chunks) {
					const match = chunk.match(/^data: (.+)$/m)
					if (match) {
						try {
							yield match[1]
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

		this.$chatHistory.set([])
		// TODO: Move this onto the fairies' shared data
		this.$chatOrigin.set({ x: 0, y: 0 })

		// Reset cumulative usage tracking when starting a new chat
		this.resetCumulativeUsage()
	}

	/**
	 * Check if the agent is currently working on a request or not.
	 */
	isGenerating() {
		return this.$activeRequest.get() !== null
	}

	/**
	 * Whether the agent is currently acting on the editor or not.
	 * This flag is used to prevent agent actions from being recorded as user actions.
	 *
	 * Do not use this to check if the agent is currently working on a request. Use `isGenerating` instead.
	 */
	private isActing = false

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
	 * Add a context item to the agent's context, ensuring that duplicates are
	 * not included.
	 *
	 * @param item The context item to add.
	 */
	addToContext(item: ContextItem) {
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
	removeFromContext(item: ContextItem) {
		this.$contextItems.update((items) => items.filter((v) => item !== v))
	}

	/**
	 * Check if the agent's context contains a specific context item. This could
	 * mean as an individual item, or as part of a group of items.
	 *
	 * @param item The context item to check for.
	 * @returns True if the agent's context contains the item, false otherwise.
	 */
	hasContextItem(item: ContextItem) {
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
				position,
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

	// setWand(wand: Wand['type']) {
	// 	this.$fairyConfig.update((fairy): FairyConfig => ({ ...fairy, wand }))
	// }

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
	 */
	summon() {
		const position = this.editor.getViewportPageBounds().center
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
 * Send a request for a text response from the model and return its response.
 * Note: You probably want to setup a custom system prompt to get any use out of this.
 *
 * @returns A promise for the text response from the model and a function to cancel the request.
 */
function requestAgentText({ agent, request }: { agent: FairyAgent; request: AgentRequest }) {
	let cancelled = false
	const controller = new AbortController()
	const signal = controller.signal
	const helpers = new AgentHelpers(agent)

	const fulltextPromise = (async () => {
		const prompt = await agent.preparePrompt(request, helpers)
		let text = ''
		try {
			for await (const v of agent._streamText({ prompt, signal })) {
				if (cancelled) break
				text += v
			}
			return text
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

	return { fulltextPromise, cancel }
}

/**
 * Send a request to the agent and handle its response.
 *
 * This is a helper function that is used internally by the agent.
 */
function requestAgentActions({ agent, request }: { agent: FairyAgent; request: AgentRequest }) {
	const { editor } = agent

	// If the request is from the user, add it to chat history
	if (request.type === 'user') {
		const promptHistoryItem: ChatHistoryItem = {
			type: 'prompt',
			message: request.messages.join('\n'),
			contextItems: request.contextItems,
			selectedShapes: request.selectedShapes,
		}
		agent.$chatHistory.update((prev) => [...prev, promptHistoryItem])
	}

	let cancelled = false
	const controller = new AbortController()
	const signal = controller.signal
	const helpers = new AgentHelpers(agent)
	const wand = getWand(request.wand)

	const requestPromise = (async () => {
		const prompt = await agent.preparePrompt(request, helpers)
		let incompleteDiff: RecordsDiff<TLRecord> | null = null
		const actionPromises: Promise<void>[] = []
		try {
			for await (const action of agent._streamActions({ prompt, signal })) {
				if (cancelled) break

				// Handle usage information
				if ((action as any)._type === '__usage__') {
					const usage = (action as any).usage
					if (usage) {
						// AI SDK returns: { inputTokens, outputTokens, totalTokens, cachedInputTokens }
						const promptTokens = usage.inputTokens || 0
						const completionTokens = usage.outputTokens || 0

						// Determine which tier this request falls into
						// Tier 1: ≤ 200K tokens, Tier 2: > 200K tokens
						const TIER_THRESHOLD = 200_000
						if (promptTokens <= TIER_THRESHOLD) {
							agent.cumulativeUsage.tier1.promptTokens += promptTokens
							agent.cumulativeUsage.tier1.completionTokens += completionTokens
						} else {
							agent.cumulativeUsage.tier2.promptTokens += promptTokens
							agent.cumulativeUsage.tier2.completionTokens += completionTokens
						}

						agent.cumulativeUsage.totalTokens += usage.totalTokens || 0

						// Calculate cumulative costs
						const { inputCost, outputCost, totalCost } = agent.getCumulativeCost()

						// Calculate total prompt and completion tokens across both tiers
						const totalPromptTokens =
							agent.cumulativeUsage.tier1.promptTokens + agent.cumulativeUsage.tier2.promptTokens
						const totalCompletionTokens =
							agent.cumulativeUsage.tier1.completionTokens +
							agent.cumulativeUsage.tier2.completionTokens

						// eslint-disable-next-line no-console
						console.debug(
							`🧚 Fairy "${agent.$fairyConfig.get().name}" Cumulative Usage:\n` +
								`  Prompt tokens: ${totalPromptTokens.toLocaleString()}\n` +
								`  Completion tokens: ${totalCompletionTokens.toLocaleString()}\n` +
								`  Total tokens: ${agent.cumulativeUsage.totalTokens.toLocaleString()}\n` +
								`  💰 Cumulative Cost: $${totalCost.toFixed(4)}\n` +
								`     (Input: $${inputCost.toFixed(4)}, Output: $${outputCost.toFixed(4)})`
						)
					}
					continue
				}

				editor.run(
					() => {
						const actionUtilType = agent.getAgentActionUtilType(action._type)
						const actionUtil = agent.getAgentActionUtil(action._type)

						// If the action is not in the wand's available actions, skip it
						if (!(wand.actions as string[]).includes(actionUtilType)) {
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
 * Check if two context items are equal.
 *
 * This is a helper function that is used internally by the agent.
 */
function areContextItemsEqual(a: ContextItem, b: ContextItem): boolean {
	if (a.type !== b.type) return false

	switch (a.type) {
		case 'shape': {
			const _b = b as ShapeContextItem
			return a.shape.shapeId === _b.shape.shapeId
		}
		case 'shapes': {
			const _b = b as ShapesContextItem
			if (a.shapes.length !== _b.shapes.length) return false
			return a.shapes.every((shape) => _b.shapes.find((s) => s.shapeId === shape.shapeId))
		}
		case 'area': {
			const _b = b as AreaContextItem
			return Box.Equals(a.bounds, _b.bounds)
		}
		case 'point': {
			const _b = b as PointContextItem
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
	item: ShapesContextItem,
	existingItems: ContextItem[]
): ContextItem[] {
	// Get all shape IDs that are already in the context
	const existingShapeIds = new Set<string>()

	// Check individual shapes
	existingItems.forEach((contextItem) => {
		if (contextItem.type === 'shape') {
			existingShapeIds.add(contextItem.shape.shapeId)
		} else if (contextItem.type === 'shapes') {
			contextItem.shapes.forEach((shape: FocusedShape) => {
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
			const newItem: ContextItem = {
				type: 'shape',
				shape: newShapes[0],
				source: item.source,
			}
			return [structuredClone(newItem)]
		}

		// Otherwise add as a shapes group
		const newItem: ContextItem = {
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
// function persistAtomInLocalStorage<T>(atom: Atom<T>, key: string) {
// 	try {
// 		const stored = getFromLocalStorage(key)
// 		if (stored) {
// 			const value = JSON.parse(stored) as T
// 			atom.set(value)
// 		}
// 	} catch {
// 		console.warn(`Couldn't load ${key} from localStorage`)
// 	}

// 	react(`save ${key} to localStorage`, () => {
// 		setInLocalStorage(key, JSON.stringify(atom.get()))
// 	})
// }

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
 * Throw an error if a switch case is not exhaustive.
 *
 * This is a helper function that is used internally by the agent.
 */
function exhaustiveSwitchError(value: never, property?: string): never {
	const debugValue =
		property && value && typeof value === 'object' && property in value ? value[property] : value
	throw new Error(`Unknown switch case ${debugValue}`)
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
