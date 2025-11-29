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

	constructor(public agent: FairyAgent) {
		super(agent)
		this.$activeRequest = atom('activeRequest', null)
		this.$scheduledRequest = atom('scheduledRequest', null)
		this.$isPrompting = atom('isPrompting', false)
	}

	reset(): void {
		this.$activeRequest.set(null)
		this.$scheduledRequest.set(null)
		this.$isPrompting.set(false)
		this.cancelFn = null
	}

	isGenerating() {
		return this.$isPrompting.get()
	}

	clearScheduledRequest() {
		this.$scheduledRequest.set(null)
	}

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
				Box.FromCenter(this.agent.$fairyEntity.get().position, FAIRY_VISION_DIMENSIONS),
		} satisfies AgentRequest
	}

	/**
	 * Convert an input into a partial request.
	 * This involves handling the various ways that the input can be provided.
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
	 */
	setIsPrompting(value: boolean) {
		this.$isPrompting.set(value)
	}

	/**
	 * Set the active request.
	 */
	setActiveRequest(request: AgentRequest | null) {
		this.$activeRequest.set(request)
	}

	/**
	 * Get the active request.
	 */
	getActiveRequest() {
		return this.$activeRequest.get()
	}

	/**
	 * Set the scheduled request.
	 */
	setScheduledRequest(request: AgentRequest | null) {
		this.$scheduledRequest.set(request)
	}

	/**
	 * Get the scheduled request.
	 */
	getScheduledRequest() {
		return this.$scheduledRequest.get()
	}

	/**
	 * Set the cancel function for the current request.
	 */
	setCancelFn(fn: (() => void) | null) {
		this.cancelFn = fn
	}

	/**
	 * Cancel the current request if one is active.
	 */
	cancel() {
		this.cancelFn?.()
		this.$activeRequest.set(null)
		this.$scheduledRequest.set(null)
		this.cancelFn = null
	}
}
