import { atom, computed } from '@tldraw/state'
import { ReactNode } from 'react'
import { ReadonlySharedStyleMap } from '../../utils/SharedStylesMap'
import { Editor } from '../Editor'
import { TLEventInfo } from '../types/event-types'

// When the tool is loaded, it adds its state to the editor's state

export interface TLToolState {
	type: string
}

export abstract class ToolUtil<T extends TLToolState> {
	constructor(public editor: Editor) {}

	static type: TLToolState['type']

	// does the default state need to differentiate between private state and sycned state, or is that a detail for the sync stuff?
	abstract getDefaultContext(): T

	private _context = atom<T>('tool context', {} as T)

	@computed getContext() {
		return this._context.get()
	}

	setContext(context: Partial<T>) {
		this._context.set({ ...this._context.__unsafe__getWithoutCapture(), ...context })
	}

	/**
	 * Get the styles (if any) that are relevant to this tool, and which should be displayed when the tool is active.
	 */
	abstract getStyles(): ReadonlySharedStyleMap | null

	/**
	 * A react component to be displayed when the tool is active behind the shapes.
	 *
	 * @param shape - The shape.
	 * @public
	 */
	abstract underlay(): ReactNode

	/**
	 * A react component to be displayed when the tool is active in front of the shapes.
	 *
	 * @param shape - The shape.
	 * @public
	 */
	abstract overlay(): ReactNode

	/**
	 * Handle the tool becoming active.
	 */
	abstract onEnter(info: any): void

	/**
	 * Handle the tool becoming inactive.
	 */
	abstract onExit(info: any): void

	/**
	 * Handle an event.
	 */
	abstract onEvent(event: TLEventInfo): void
}

/** @public */
export interface TLToolUtilConstructor<T extends TLToolState, U extends ToolUtil<T> = ToolUtil<T>> {
	new (editor: Editor): U
	type: T['type']
}
