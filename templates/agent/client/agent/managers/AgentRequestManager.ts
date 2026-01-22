import { atom, Atom } from 'tldraw'
import { AgentInput } from '../../../shared/types/AgentInput'
import { AgentRequest } from '../../../shared/types/AgentRequest'
import type { TldrawAgent } from '../TldrawAgent'
import { BaseAgentManager } from './BaseAgentManager'

/**
 * Manages request lifecycle for an agent.
 * Handles active requests, scheduled requests, and request state management.
 */
export class AgentRequestManager extends BaseAgentManager {
	/**
	 * An atom containing the currently active request.
	 * This is mainly used to render highlights and other UI elements.
	 */
	private $activeRequest: Atom<AgentRequest | null>

	/**
	 * An atom containing the next request that the agent has scheduled for itself.
	 * Null if there is no scheduled request.
	 */
	private $scheduledRequest: Atom<AgentRequest | null>

	/**
	 * Whether the agent is currently prompting (working on a request).
	 */
	private $isPrompting: Atom<boolean>

	/**
	 * A function that cancels the agent's current prompt, if one is active.
	 */
	private cancelFn: (() => void) | null = null

	/**
	 * Creates a new request manager for the given agent.
	 * Initializes all request-related atoms with default values.
	 */
	constructor(agent: TldrawAgent) {
		super(agent)
		this.$activeRequest = atom('activeRequest', null)
		this.$scheduledRequest = atom('scheduledRequest', null)
		this.$isPrompting = atom('isPrompting', false)
	}

	/**
	 * Reset the request manager to its initial state.
	 * Clears all active and scheduled requests.
	 */
	reset(): void {
		this.$activeRequest.set(null)
		this.$scheduledRequest.set(null)
		this.$isPrompting.set(false)
		this.cancelFn = null
	}

	/**
	 * Check if the agent is currently generating a response.
	 * @returns True if the agent is prompting, false otherwise.
	 */
	isGenerating() {
		return this.$isPrompting.get()
	}

	/**
	 * Set the prompting state.
	 * @param value - True if the agent is prompting, false otherwise.
	 */
	setIsPrompting(value: boolean) {
		this.$isPrompting.set(value)
	}

	/**
	 * Clear the scheduled request without affecting the active request.
	 */
	clearScheduledRequest() {
		this.$scheduledRequest.set(null)
	}

	/**
	 * Clear the active request without affecting the scheduled request.
	 */
	clearActiveRequest() {
		this.$activeRequest.set(null)
	}

	/**
	 * Get a full agent request from a user input by filling out any missing values with defaults.
	 * @param input - A partial agent request or a string message.
	 */
	getFullRequestFromInput(input: AgentInput): AgentRequest {
		const request = this.getPartialRequestFromInput(input)
		const activeRequest = this.getActiveRequest()

		return {
			source: request.source ?? 'user',
			agentMessages: request.agentMessages ?? [],
			userMessages: request.userMessages ?? [],
			data: request.data ?? [],
			bounds: request.bounds ?? activeRequest?.bounds ?? this.agent.editor.getViewportPageBounds(),
			contextItems: request.contextItems ?? [],
		}
	}

	/**
	 * Convert an input into a partial request.
	 * This involves handling the various ways that the input can be provided.
	 * @param input - The input to convert (string, array, or object).
	 * @returns A partial request object.
	 */
	getPartialRequestFromInput(input: AgentInput): Partial<AgentRequest> {
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
			const { message, ...rest } = input
			return { ...rest, agentMessages: [message], userMessages: [message] }
		}

		return input
	}

	/**
	 * Set the active request.
	 * @param request - The request to set as active, or null to clear.
	 */
	setActiveRequest(request: AgentRequest | null) {
		this.$activeRequest.set(request)
	}

	/**
	 * Get the active request.
	 * @returns The currently active request, or null if none.
	 */
	getActiveRequest() {
		return this.$activeRequest.get()
	}

	/**
	 * Set the scheduled request.
	 * @param request - The request to schedule, or null to clear.
	 */
	setScheduledRequest(request: AgentRequest | null) {
		this.$scheduledRequest.set(request)
	}

	/**
	 * Get the scheduled request.
	 * @returns The scheduled request, or null if none.
	 */
	getScheduledRequest() {
		return this.$scheduledRequest.get()
	}

	/**
	 * Set the cancel function for the current request.
	 * @param fn - A function that cancels the current request, or null to clear.
	 */
	setCancelFn(fn: (() => void) | null) {
		this.cancelFn = fn
	}

	/**
	 * Get the cancel function for the current request.
	 * @returns The cancel function, or null if none.
	 */
	getCancelFn() {
		return this.cancelFn
	}

	/**
	 * Cancel the current request if one is active.
	 * Clears both active and scheduled requests.
	 */
	cancel() {
		this.cancelFn?.()
		this.$activeRequest.set(null)
		this.$scheduledRequest.set(null)
		this.cancelFn = null
	}
}
