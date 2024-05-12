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
		this.config = { ...this.getDefaultConfig(), ...config }
	}

	/**
	 * The tool's id. To avoid collisions with other tools, it's best to namespace this (i.e. @yourname/yourtool)
	 */
	abstract id: string

	/**
	 * The tool's default context, set when the tool is first registered in the Editor.
	 */
	abstract getDefaultConfig(): Config

	/**
	 * The tool's default context, set when the tool is first registered in the Editor.
	 */
	abstract getDefaultContext(): Context

	/**
	 * The configuration passed in by the consumer.
	 */
	public readonly config: Partial<Config>

	private _context = atom<Context>('tool context', {} as Context)

	/**
	 * Get the tool's context. This data is used to keep track of the tool's state as the user interacts with it.
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
	getStyles(): ReadonlySharedStyleMap | null {
		return null
	}

	/**
	 * A react component to be displayed when the tool is active behind the shapes.
	 *
	 * @param shape - The shape.
	 * @public
	 */
	underlay(): ReactNode {
		return null
	}

	/**
	 * A react component to be displayed when the tool is active in front of the shapes.
	 *
	 * @param shape - The shape.
	 * @public
	 */
	overlay(): ReactNode {
		return null
	}

	/**
	 * An event fired when the tool becomes active.
	 *
	 * @param info - Information about the event passed in from the caller of Editor.setCurrentTool
	 */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	onEnter(info: any): void {
		return
	}

	/**
	 * An event fired when the tool becomes inactive.
	 *
	 * @param info - Information about the event passed in from the caller of Editor.setCurrentTool
	 */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	onExit(info: any): void {
		return
	}

	/**
	 * An event fired when the editor receives or produces dispatched.
	 *
	 * @param event - The event.
	 */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	onEvent(event: TLEventInfo): void {
		return
	}
}

/** @public */
export interface TLToolUtilConstructor<T extends object, Q extends object> {
	new (editor: Editor, config: Q): ToolUtil<T, Q>
}

export type TLToolUtilConstructorWithConfig<T extends object, Q extends object> = [
	TLToolUtilConstructor<T, Q>,
	Q,
]

export function toolWithConfig<T extends object, Q extends object>(
	tool: TLToolUtilConstructor<T, Q>,
	config: Q
): TLToolUtilConstructorWithConfig<T, Q> {
	return [tool, config]
}
