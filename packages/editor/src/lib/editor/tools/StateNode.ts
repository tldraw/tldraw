import { Atom, Computed, atom, computed } from '@tldraw/state'
import { PerformanceTracker } from '@tldraw/utils'
import { debugFlags } from '../../utils/debug-flags'
import type { Editor } from '../Editor'
import {
	EVENT_NAME_MAP,
	TLEnterEventHandler,
	TLEventHandlers,
	TLEventInfo,
	TLExitEventHandler,
	TLPinchEventInfo,
} from '../types/event-types'

const STATE_NODES_TO_MEASURE = [
	'brushing',
	'cropping',
	'dragging',
	'dragging_handle',
	'drawing',
	'erasing',
	'lasering',
	'resizing',
	'rotating',
	'scribble_brushing',
	'translating',
]

/** @public */
export interface TLStateNodeConstructor {
	new (editor: Editor, parent?: StateNode): StateNode
	id: string
	initial?: string
	children?: () => TLStateNodeConstructor[]
	isLockable: boolean
}

/** @public */
export abstract class StateNode implements Partial<TLEventHandlers> {
	performanceTracker: PerformanceTracker
	constructor(
		public editor: Editor,
		parent?: StateNode
	) {
		const { id, children, initial, isLockable } = this.constructor as TLStateNodeConstructor

		this.id = id
		this._isActive = atom<boolean>('toolIsActive' + this.id, false)
		this._current = atom<StateNode | undefined>('toolState' + this.id, undefined)

		this._path = computed('toolPath' + this.id, () => {
			const current = this.getCurrent()
			return this.id + (current ? `.${current.getPath()}` : '')
		})

		this.parent = parent ?? ({} as any)

		if (this.parent) {
			if (children && initial) {
				this.type = 'branch'
				this.initial = initial
				this.children = Object.fromEntries(
					children().map((Ctor) => [Ctor.id, new Ctor(this.editor, this)])
				)
				this._current.set(this.children[this.initial])
			} else {
				this.type = 'leaf'
			}
		} else {
			this.type = 'root'

			if (children && initial) {
				this.initial = initial
				this.children = Object.fromEntries(
					children().map((Ctor) => [Ctor.id, new Ctor(this.editor, this)])
				)
				this._current.set(this.children[this.initial])
			}
		}
		this.isLockable = isLockable
		this.performanceTracker = new PerformanceTracker()
	}

	static id: string
	static initial?: string
	static children?: () => TLStateNodeConstructor[]
	static isLockable = true

	id: string
	type: 'branch' | 'leaf' | 'root'
	shapeType?: string
	initial?: string
	children?: Record<string, StateNode>
	isLockable: boolean
	parent: StateNode

	/**
	 * This node's path of active state nodes
	 *
	 * @public
	 */
	getPath() {
		return this._path.get()
	}
	_path: Computed<string>

	/**
	 * This node's current active child node, if any.
	 *
	 * @public
	 */
	getCurrent() {
		return this._current.get()
	}
	private _current: Atom<StateNode | undefined>

	/**
	 * Whether this node is active.
	 *
	 * @public
	 */
	getIsActive() {
		return this._isActive.get()
	}
	private _isActive: Atom<boolean>

	/**
	 * Transition to a new active child state node.
	 *
	 * @example
	 * ```ts
	 * parentState.transition('childStateA')
	 * parentState.transition('childStateB', { myData: 4 })
	 *```
	 *
	 * @param id - The id of the child state node to transition to.
	 * @param info - Any data to pass to the `onEnter` and `onExit` handlers.
	 *
	 * @public
	 */
	transition = (id: string, info: any = {}) => {
		const path = id.split('.')

		let currState = this as StateNode

		for (let i = 0; i < path.length; i++) {
			const id = path[i]
			const prevChildState = currState.getCurrent()
			const nextChildState = currState.children?.[id]

			if (!nextChildState) {
				throw Error(`${currState.id} - no child state exists with the id ${id}.`)
			}

			if (prevChildState?.id !== nextChildState.id) {
				prevChildState?.exit(info, id)
				currState._current.set(nextChildState)
				nextChildState.enter(info, prevChildState?.id || 'initial')
				if (!nextChildState.getIsActive()) break
			}

			currState = nextChildState
		}

		return this
	}

	handleEvent = (info: Exclude<TLEventInfo, TLPinchEventInfo>) => {
		const cbName = EVENT_NAME_MAP[info.name]
		const currentActiveChild = this._current.__unsafe__getWithoutCapture()
		this[cbName]?.(info as any)
		if (
			this._isActive.__unsafe__getWithoutCapture() &&
			currentActiveChild &&
			currentActiveChild === this._current.__unsafe__getWithoutCapture()
		) {
			currentActiveChild.handleEvent(info)
		}
	}

	// todo: move this logic into transition
	enter = (info: any, from: string) => {
		if (debugFlags.measurePerformance.get() && STATE_NODES_TO_MEASURE.includes(this.id)) {
			this.performanceTracker.start(this.id)
		}

		this._isActive.set(true)
		this.onEnter?.(info, from)

		if (this.children && this.initial && this.getIsActive()) {
			const initial = this.children[this.initial]
			this._current.set(initial)
			initial.enter(info, from)
		}
	}

	// todo: move this logic into transition
	exit = (info: any, from: string) => {
		if (debugFlags.measurePerformance.get() && this.performanceTracker.isStarted()) {
			this.performanceTracker.stop()
		}
		this._isActive.set(false)
		this.onExit?.(info, from)

		if (!this.getIsActive()) {
			this.getCurrent()?.exit(info, from)
		}
	}

	/**
	 * This is a hack / escape hatch that will tell the editor to
	 * report a different state as active (in `getCurrentToolId()`) when
	 * this state is active. This is usually used when a tool transitions
	 * to a child of a different state for a certain interaction and then
	 * returns to the original tool when that interaction completes; and
	 * where we would want to show the original tool as active in the UI.
	 *
	 * @public
	 */
	_currentToolIdMask = atom('curent tool id mask', undefined as string | undefined)

	getCurrentToolIdMask() {
		return this._currentToolIdMask.get()
	}

	setCurrentToolIdMask(id: string | undefined) {
		this._currentToolIdMask.set(id)
	}

	onWheel?: TLEventHandlers['onWheel']
	onPointerDown?: TLEventHandlers['onPointerDown']
	onPointerMove?: TLEventHandlers['onPointerMove']
	onLongPress?: TLEventHandlers['onLongPress']
	onPointerUp?: TLEventHandlers['onPointerUp']
	onDoubleClick?: TLEventHandlers['onDoubleClick']
	onTripleClick?: TLEventHandlers['onTripleClick']
	onQuadrupleClick?: TLEventHandlers['onQuadrupleClick']
	onRightClick?: TLEventHandlers['onRightClick']
	onMiddleClick?: TLEventHandlers['onMiddleClick']
	onKeyDown?: TLEventHandlers['onKeyDown']
	onKeyUp?: TLEventHandlers['onKeyUp']
	onKeyRepeat?: TLEventHandlers['onKeyRepeat']
	onCancel?: TLEventHandlers['onCancel']
	onComplete?: TLEventHandlers['onComplete']
	onInterrupt?: TLEventHandlers['onInterrupt']
	onTick?: TLEventHandlers['onTick']

	onEnter?: TLEnterEventHandler
	onExit?: TLExitEventHandler
}
