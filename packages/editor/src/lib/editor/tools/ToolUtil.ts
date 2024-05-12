import { atom, computed } from '@tldraw/state'
import { ReactNode } from 'react'
import { ReadonlySharedStyleMap } from '../../utils/SharedStylesMap'
import { Editor } from '../Editor'
import { TLEventInfo } from '../types/event-types'

export interface TLToolContext {
	type: string
}

export abstract class ToolUtil<T extends TLToolContext> {
	constructor(public editor: Editor) {}

	static type: TLToolContext['type']

	/**
	 * The tool's default context, set when the tool is first registered in the Editor.
	 */
	abstract getDefaultContext(): T

	private _context = atom<T>('tool context', {} as T)

	/**
	 * Get the tool's context.
	 */
	@computed getContext() {
		return this._context.get()
	}

	/**
	 * Set the tool's context.
	 *
	 * @param context - A partial of the tool's context.
	 */
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
	 * An event fired when the tool becomes active.
	 */
	abstract onEnter(info: any): void

	/**
	 * An event fired when the tool becomes inactive.
	 */
	abstract onExit(info: any): void

	/**
	 * An event fired when the editor receives or produces dispatched.
	 */
	abstract onEvent(event: TLEventInfo): void
}

/** @public */
export interface TLToolUtilConstructor<
	T extends TLToolContext,
	U extends ToolUtil<T> = ToolUtil<T>,
> {
	new (editor: Editor): U
	type: T['type']
}
