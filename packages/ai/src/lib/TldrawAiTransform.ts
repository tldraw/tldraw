import { Editor } from 'tldraw'
import { TLAiPrompt, TLAiStreamingChange } from './types'

/** @public */
export abstract class TldrawAiTransform {
	constructor(public editor: Editor) {}
	/**
	 * Will run before the prompt is sent to the AI.
	 * @param prompt - The prompt to transform
	 * @returns The transformed prompt
	 */
	transformPrompt?(prompt: TLAiPrompt): TLAiPrompt
	/**
	 * Will run after each change is received.
	 * @param change - The change to transform
	 * @returns The transformed change
	 */
	transformChange?(change: TLAiStreamingChange): TLAiStreamingChange
	/**
	 * Will run after all changes have been received.
	 * @param changes - The changes to transform
	 * @returns The transformed changes
	 */
	transformChanges?(changes: TLAiStreamingChange[]): TLAiStreamingChange[]
}

/** @public */
export interface TldrawAiTransformConstructor {
	new (editor: Editor): TldrawAiTransform
}
