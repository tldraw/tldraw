import { TLStyleType } from '@tldraw/tlschema'
import { atom, Atom, computed, Computed } from 'signia'
import type { Editor } from '../Editor'
import {
	EVENT_NAME_MAP,
	TLEventHandlers,
	TLEventInfo,
	TLPinchEventInfo,
	UiEnterHandler,
	UiExitHandler,
} from '../types/event-types'

type StateNodeType = 'branch' | 'leaf' | 'root'

/** @public */
export interface StateNodeConstructor {
	new (app: Editor, parent?: StateNode): StateNode
	id: string
	initial?: string
	children?: () => StateNodeConstructor[]
	styles?: TLStyleType[]
}

/** @public */
export abstract class StateNode implements Partial<TLEventHandlers> {
	constructor(public app: Editor, parent?: StateNode) {
		const { id, children, initial } = this.constructor as StateNodeConstructor

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
					children().map((Ctor) => [Ctor.id, new Ctor(this.app, this)])
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
					children().map((Ctor) => [Ctor.id, new Ctor(this.app, this)])
				)
				this.current.set(this.children[this.initial])
			}
		}
	}

	path: Computed<string>

	static id: string
	static initial?: string
	static children?: () => StateNodeConstructor[]

	id: string
	current: Atom<StateNode | undefined>
	type: StateNodeType
	readonly styles: TLStyleType[] = []
	initial?: string
	children?: Record<string, StateNode>
	parent: StateNode

	isActive = false

	transition(id: string, info: any) {
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

	handleEvent(info: Exclude<TLEventInfo, TLPinchEventInfo>) {
		const cbName = EVENT_NAME_MAP[info.name]
		const x = this.current.value
		this[cbName]?.(info as any)
		if (this.current.value === x && this.isActive) {
			x?.handleEvent(info)
		}
	}

	enter(info: any, from: string) {
		this.isActive = true
		this.onEnter?.(info, from)
		if (this.children && this.initial && this.isActive) {
			const initial = this.children[this.initial]
			this.current.set(initial)
			initial.enter(info, from)
		}
	}

	exit(info: any, from: string) {
		this.isActive = false
		this.onExit?.(info, from)
		if (!this.isActive) {
			this.current.value?.exit(info, from)
		}
	}

	onWheel?: TLEventHandlers['onWheel']
	onPointerEnter?: TLEventHandlers['onPointerEnter']
	onPointerLeave?: TLEventHandlers['onPointerLeave']
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

	onEnter?: UiEnterHandler
	onExit?: UiExitHandler
}
