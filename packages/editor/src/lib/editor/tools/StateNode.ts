import { Atom, Computed, atom, computed } from '@tldraw/state'
import { PerformanceTracker } from '@tldraw/utils'
import { debugFlags } from '../../utils/debug-flags'
import type { Editor } from '../Editor'
import {
	EVENT_NAME_MAP,
	TLCancelEventInfo,
	TLClickEventInfo,
	TLCompleteEventInfo,
	TLEventHandlers,
	TLEventInfo,
	TLInterruptEventInfo,
	TLKeyboardEventInfo,
	TLPinchEventInfo,
	TLPointerEventInfo,
	TLTickEventInfo,
	TLWheelEventInfo,
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
	children?(): TLStateNodeConstructor[]
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
				this.children[this.initial]._isActive.set(true)
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

	getDescendant<T extends StateNode>(path: string): T | undefined {
		const ids = path.split('.').reverse()
		let state = this as any
		while (ids.length > 0) {
			const id = ids.pop()
			if (!id) return state as T
			const childState = state.children?.[id]
			if (!childState) return undefined
			state = childState
		}
		return state as T
	}

	private exitBranch(id: string, info: any = {}) {
		let nextExitingParent = this as StateNode | undefined
		while (nextExitingParent) {
			nextExitingParent.exit(info, id)
			const nextExitingChild = nextExitingParent.getCurrent()
			nextExitingParent = nextExitingChild
		}
	}

	private enterBranch(id: string, info: any = {}) {
		let nextEnteringParent = this as StateNode | undefined
		while (nextEnteringParent) {
			nextEnteringParent.enter(info, id)
			if (nextEnteringParent.initial && nextEnteringParent.children) {
				const nextEnteringChild = nextEnteringParent.children[nextEnteringParent.initial]
				nextEnteringParent._current.set(nextEnteringChild)
				nextEnteringParent = nextEnteringChild
			} else {
				break
			}
		}
	}

	/**
	 * Transition to a new active child state node.
	 *
	 * @example
	 * ```ts
	 * parentState.transition('childStateA')
	 * parentState.transition('childStateB', { myData: 4 })
	 * parentState.transition('childStateA.childStateAB.childStateABC')
	 *```
	 *
	 * @param path - The path of child state nodes to transition to.
	 * @param info - Any data to pass to the `onEnter` and `onExit` handlers.
	 *
	 * @public
	 */
	transition(path: string, info: any = {}) {
		const pathIds = path.split('.')

		let currState = this as StateNode

		let currentPath = this.getPath().split('root.')[1]

		if (currentPath === path) {
			return
		}

		if (currentPath?.includes(path)) {
			this.exitBranch('self', info)
			this.enterBranch('self', info)
		}

		currentPath = this.getPath().split('root.')[1]

		for (let i = 0; i < pathIds.length; i++) {
			const id = pathIds[i]
			const prevChildState = currState.getCurrent()
			const nextChildState = currState.children?.[id]

			if (!nextChildState) {
				throw Error(`${currState.id} - no child state exists with the id ${id}.`)
			}

			if (!prevChildState) {
				throw Error(
					`${currState.id} - no current child state exists, should at least be in the initial state.`
				)
			}

			// If the previous child state is active and we're transitioning to a new child state,
			// exit the previous child state and all of its children
			if (prevChildState.getIsActive()) {
				prevChildState.exitBranch(id, info)
			}

			currState._current.set(nextChildState)
			if (!nextChildState.getIsActive()) {
				nextChildState.enter(info, prevChildState?.id || 'initial')
			}

			// Since the `enter` will call `onEnter`, if that `onEnter` created a transition, we need to bail
			if (!nextChildState.getIsActive()) {
				currState = nextChildState
				break
			}

			currState = nextChildState
		}

		// If the new state has children, transition to the initial child state
		// and repeat all the way down the tree, entering each initial child state
		while (currState.children && currState.initial) {
			const prevChildState = currState.getCurrent()
			const nextChildState = currState.children[currState.initial]

			if (!prevChildState) {
				throw Error(
					`${currState.id} - no current child state exists, should at least be in the initial state.`
				)
			}

			if (prevChildState.id !== nextChildState.id || !nextChildState.getIsActive()) {
				// If the previous child state is active and we're transitioning to a new child state,
				// exit the previous child state and all of its children
				if (prevChildState.getIsActive()) {
					prevChildState.exitBranch(nextChildState.id, info)
				}

				// Now enter the new child state and repeat the process
				currState._current.set(nextChildState)
				nextChildState.enter(info, 'initial')

				// Since the `enter` will call `onEnter`, if that `onEnter` created a transition, we need to bail
				if (!currState.getIsActive()) {
					currState = nextChildState
					break
				}
			}

			currState = nextChildState
		}

		return this
	}

	handleEvent(info: Exclude<TLEventInfo, TLPinchEventInfo>) {
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

	_started = false
	start() {
		this._isActive.set(true)
		this.onEnter?.({}, 'initial')
		if (this.children && this.initial) {
			this._current.set(this.children[this.initial])
			this.children[this.initial].start()
		}
		this._started = true
	}

	enter(info: any, from: string) {
		if (debugFlags.measurePerformance.get() && STATE_NODES_TO_MEASURE.includes(this.id)) {
			this.performanceTracker.start(this.id)
		}

		this._isActive.set(true)
		this.onEnter?.(info, from)
	}

	exit(info: any, from: string) {
		if (debugFlags.measurePerformance.get() && this.performanceTracker.isStarted()) {
			this.performanceTracker.stop()
		}
		this._isActive.set(false)
		this.onExit?.(info, from)
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

	onWheel?(info: TLWheelEventInfo): void
	onPointerDown?(info: TLPointerEventInfo): void
	onPointerMove?(info: TLPointerEventInfo): void
	onLongPress?(info: TLPointerEventInfo): void
	onPointerUp?(info: TLPointerEventInfo): void
	onDoubleClick?(info: TLClickEventInfo): void
	onTripleClick?(info: TLClickEventInfo): void
	onQuadrupleClick?(info: TLClickEventInfo): void
	onRightClick?(info: TLPointerEventInfo): void
	onMiddleClick?(info: TLPointerEventInfo): void
	onKeyDown?(info: TLKeyboardEventInfo): void
	onKeyUp?(info: TLKeyboardEventInfo): void
	onKeyRepeat?(info: TLKeyboardEventInfo): void
	onCancel?(info: TLCancelEventInfo): void
	onComplete?(info: TLCompleteEventInfo): void
	onInterrupt?(info: TLInterruptEventInfo): void
	onTick?(info: TLTickEventInfo): void

	onEnter?(info: any, from: string): void
	onExit?(info: any, to: string): void
}
