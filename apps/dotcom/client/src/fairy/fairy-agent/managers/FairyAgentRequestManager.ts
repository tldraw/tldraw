import { AgentInput, AgentRequest, FAIRY_VISION_DIMENSIONS } from '@tldraw/fairy-shared'
import { atom, Atom, Box } from 'tldraw'
import { FairyAgent } from '../FairyAgent'
import { BaseFairyAgentManager } from './BaseFairyAgentManager'

/**
 * Manages request lifecycle for a fairy agent.
 * Handles active requests, scheduled requests, and request state management.
 */
export class FairyAgentRequestManager extends BaseFairyAgentManager {
	/**
	 * An atom containing the currently active request.
	 * This is mainly used to render highlights and other UI elements.
	 * @private
	 */
	private $activeRequest: Atom<AgentRequest | null>

	/**
	 * An atom containing the next request that the agent has scheduled for itself.
	 * Null if there is no scheduled request.
	 * @private
	 */
	private $scheduledRequest: Atom<AgentRequest | null>

	/**
	 * Whether the agent is currently prompting (working on a request).
	 * @private
	 */
	private $isPrompting: Atom<boolean>

	/**
	 * A function that cancels the agent's current prompt, if one is active.
	 * @private
	 */
	private cancelFn: (() => void) | null = null

	/**
	 * Creates a new request manager for the given fairy agent.
	 * Initializes all request-related atoms with default values.
	 */
	constructor(public agent: FairyAgent) {
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
		const activeRequest = this.$activeRequest.get()

		return {
			agentMessages: request.agentMessages ?? [],
			source: request.source ?? 'user',
			data: request.data ?? [],
			userMessages: request.userMessages ?? [],
			bounds:
				request.bounds ??
				activeRequest?.bounds ??
				Box.FromCenter(this.agent.getEntity().position, FAIRY_VISION_DIMENSIONS),
		} satisfies AgentRequest
	}

	/**
	 * Convert an input into a partial request.
	 * This involves handling the various ways that the input can be provided.
	 * @param input - The input to convert (string, array, or object).
	 * @returns A partial request object.
	 * @private
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
	 * Set the prompting state.
	 * @param value - True if the agent is prompting, false otherwise.
	 */
	setIsPrompting(value: boolean) {
		this.$isPrompting.set(value)
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
