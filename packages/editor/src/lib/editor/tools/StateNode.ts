import { Atom, Computed, atom, computed } from '@tldraw/state'
import type { Editor } from '../Editor'
import {
	EVENT_NAME_MAP,
	TLEnterEventHandler,
	TLEventHandlers,
	TLEventInfo,
	TLExitEventHandler,
	TLPinchEventInfo,
} from '../types/event-types'

type TLStateNodeType = 'branch' | 'leaf' | 'root'

/** @public */
export interface TLStateNodeConstructor {
	new (editor: Editor, parent?: StateNode): StateNode
	id: string
	initial?: string
	children?: () => TLStateNodeConstructor[]
}

/** @public */
export abstract class StateNode implements Partial<TLEventHandlers> {
	constructor(public editor: Editor, parent?: StateNode) {
		const { id, children, initial } = this.constructor as TLStateNodeConstructor

		this.id = id
		this.current = atom<StateNode | undefined>('toolState' + this.id, undefined)

		this.path = computed('toolPath' + this.id, () => {
			const current = this.current.value
			return this.id + (current ? `.${current.path.value}` : '')
		})

		this.parent = parent ?? ({} as any)

		if (this.parent) {
			if (children && initial) {
				this.type = 'branch'
				this.initial = initial
				this.children = Object.fromEntries(
					children().map((Ctor) => [Ctor.id, new Ctor(this.editor, this)])
				)
				this.current.set(this.children[this.initial])
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
				this.current.set(this.children[this.initial])
			}
		}
	}

	path: Computed<string>

	static id: string
	static initial?: string
	static children?: () => TLStateNodeConstructor[]

	id: string
	current: Atom<StateNode | undefined>
	type: TLStateNodeType
	shapeType?: string
	initial?: string
	children?: Record<string, StateNode>
	parent: StateNode

	isActive = false

	transition = (id: string, info: any) => {
		const path = id.split('.')

		let currState = this as StateNode

		for (let i = 0; i < path.length; i++) {
			const id = path[i]
			const prevChildState = currState.current.value
			const nextChildState = currState.children?.[id]

			if (!nextChildState) {
				throw Error(`${currState.id} - no child state exists with the id ${id}.`)
			}

			if (prevChildState?.id !== nextChildState.id) {
				prevChildState?.exit(info, id)
				currState.current.set(nextChildState)
				nextChildState.enter(info, prevChildState?.id || 'initial')
				if (!nextChildState.isActive) break
			}

			currState = nextChildState
		}

		return this
	}

	handleEvent = (info: Exclude<TLEventInfo, TLPinchEventInfo>) => {
		const cbName = EVENT_NAME_MAP[info.name]
		const x = this.current.value
		this[cbName]?.(info as any)
		if (this.current.value === x && this.isActive) {
			x?.handleEvent(info)
		}
	}

	enter = (info: any, from: string) => {
		this.isActive = true
		this.onEnter?.(info, from)
		if (this.children && this.initial && this.isActive) {
			const initial = this.children[this.initial]
			this.current.set(initial)
			initial.enter(info, from)
		}
	}

	exit = (info: any, from: string) => {
		this.isActive = false
		this.onExit?.(info, from)
		if (!this.isActive) {
			this.current.value?.exit(info, from)
		}
	}

	/**
	 * This is a hack / escape hatch that will tell the editor to
	 * report a different state as active (in `currentToolId`) when
	 * this state is active. This is usually used when a tool transitions
	 * to a child of a different state for a certain interaction and then
	 * returns to the original tool when that interaction completes; and
	 * where we would want to show the original tool as active in the UI.
	 *
	 * @public
	 */
	_currentToolIdMask = atom('curent tool id mask', undefined as string | undefined)

	@computed get currentToolIdMask() {
		return this._currentToolIdMask.value
	}

	set currentToolIdMask(id: string | undefined) {
		this._currentToolIdMask.set(id)
	}

	onWheel?: TLEventHandlers['onWheel']
	onPointerDown?: TLEventHandlers['onPointerDown']
	onPointerMove?: TLEventHandlers['onPointerMove']
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

	onEnter?: TLEnterEventHandler
	onExit?: TLExitEventHandler
}
