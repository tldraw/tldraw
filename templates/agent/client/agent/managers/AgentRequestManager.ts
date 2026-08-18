import { atom, Atom } from 'tldraw'
import { AgentInput } from '../../../shared/types/AgentInput'
import { AgentRequest } from '../../../shared/types/AgentRequest'
import type { TldrawAgent } from '../TldrawAgent'
import { BaseAgentManager } from './BaseAgentManager'

/**
 * Request lifecycle: the active request, the request scheduled to run next,
 * and whether the agent is prompting.
 */
export class AgentRequestManager extends BaseAgentManager {
	/** Mainly used to render highlights and other UI. */
	private $activeRequest: Atom<AgentRequest | null>
	private $scheduledRequest: Atom<AgentRequest | null>
	private $isPrompting: Atom<boolean>
	private cancelFn: (() => void) | null = null

	constructor(agent: TldrawAgent) {
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

	setIsPrompting(value: boolean) {
		this.$isPrompting.set(value)
	}

	clearScheduledRequest() {
		this.$scheduledRequest.set(null)
	}

	clearActiveRequest() {
		this.$activeRequest.set(null)
	}

	/**
	 * Fill out a partial input with defaults. Bounds default to the active
	 * request's bounds, then the viewport.
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

	setActiveRequest(request: AgentRequest | null) {
		this.$activeRequest.set(request)
	}

	getActiveRequest() {
		return this.$activeRequest.get()
	}

	setScheduledRequest(request: AgentRequest | null) {
		this.$scheduledRequest.set(request)
	}

	getScheduledRequest() {
		return this.$scheduledRequest.get()
	}

	setCancelFn(fn: (() => void) | null) {
		this.cancelFn = fn
	}

	/** Cancel the current request and clear both active and scheduled requests. */
	cancel() {
		this.cancelFn?.()
		this.$activeRequest.set(null)
		this.$scheduledRequest.set(null)
		this.cancelFn = null
	}
}
