import { atom, computed } from '@tldraw/state'
import { ReactNode } from 'react'
import { ReadonlySharedStyleMap } from '../../utils/SharedStylesMap'
import { Editor } from '../Editor'
import { TLEventInfo } from '../types/event-types'

export abstract class ToolUtil<Context extends object, Config extends object = object> {
	constructor(
		public editor: Editor,
		config: Partial<Config> = {}
	) {
		this.config = { ...this.getDefaultConfig?.(), ...config }
	}

	static type: string

	public readonly config: Partial<Config>

	/**
	 * The tool's default context, set when the tool is first registered in the Editor.
	 */
	abstract getDefaultConfig?(): Config

	/**
	 * The tool's default context, set when the tool is first registered in the Editor.
	 */
	abstract getDefaultContext(): Context

	private _context = atom<Context>('tool context', {} as Context)

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
	setContext(context: Partial<Context>) {
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
export interface TLToolUtilConstructor<T extends object, Q extends object> {
	new (editor: Editor, config: Q): ToolUtil<T, Q>
	type: string
}

export type TLToolUtilConstructorWithConfig<T extends object, Q extends object> = [
	TLToolUtilConstructor<T, Q>,
	Q,
]
