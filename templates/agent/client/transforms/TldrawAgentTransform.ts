import { Editor } from 'tldraw'
import { Streaming, TLAgentChange } from '../types/TLAgentChange'
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
	 * Will run after each change is received.
	 * @param change - The change to transform
	 * @returns The transformed change
	 */
	transformChange?(change: Streaming<TLAgentChange>): Streaming<TLAgentChange>
}

/** @public */
export interface TldrawAgentTransformConstructor {
	new (editor: Editor): TldrawAgentTransform
}
