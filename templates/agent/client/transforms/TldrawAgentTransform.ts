import { Editor } from 'tldraw'
import { IAgentEvent } from '../../worker/prompt/AgentEvent'
import { Streaming } from '../types/Streaming'
import { TLAgentPrompt } from '../types/TLAgentPrompt'

/** @public */
export abstract class TldrawAgentTransform {
	constructor(public editor: Editor) {}
	/**
	 * Will run before the prompt is sent to the AI.
	 * @param prompt - The prompt to transform
	 * @returns The transformed prompt
	 */
	transformPrompt?(prompt: TLAgentPrompt): TLAgentPrompt
	/**
	 * Will run after each event is received.
	 * @param event - The event to transform
	 * @returns The transformed event
	 */
	transformEvent?(event: Streaming<IAgentEvent>): Streaming<IAgentEvent>
}

/** @public */
export interface TldrawAgentTransformConstructor {
	new (editor: Editor): TldrawAgentTransform
}
