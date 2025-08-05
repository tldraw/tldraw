import { Editor } from 'tldraw'
import { TLAgentChange } from '../types/TLAgentChange'
import { TLAgentPrompt } from '../useTldrawAgent'

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
	transformChange?(change: TLAgentChange): TLAgentChange
}

/** @public */
export interface TldrawAgentTransformConstructor {
	new (editor: Editor): TldrawAgentTransform
}
