import { computed } from '@tldraw/state'
import { ReactNode } from 'react'
import { Geometry2d } from '../../primitives/geometry/Geometry2d'
import { Editor } from '../Editor'
import {
	EVENT_NAME_MAP,
	TLClickEventInfo,
	TLPointerEventInfo,
	TLWheelEventInfo,
	WithPreventDefault,
} from './event-types'

/** @public */
export type ControlFn = (editor: Editor) => null | Control | Control[]

/** @public */
export interface ControlProps {
	isHovered: boolean
}

/** @public */
export abstract class Control {
	constructor(
		readonly editor: Editor,
		readonly id: string
	) {
		computedify(this, ['getGeometry'])
	}

	abstract getGeometry(): Geometry2d

	getIndex() {
		return 0
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	component(props: ControlProps): ReactNode {
		return null
	}

	handleEvent(info: TLPointerEventInfo | TLWheelEventInfo | TLClickEventInfo) {
		const handler = EVENT_NAME_MAP[info.name]
		;(this as any)[handler]?.(info)
	}

	onWheel?(info: WithPreventDefault<TLWheelEventInfo>): void
	onPointerDown?(info: WithPreventDefault<TLPointerEventInfo>): void
	onPointerMove?(info: WithPreventDefault<TLPointerEventInfo>): void
	onPointerUp?(info: WithPreventDefault<TLPointerEventInfo>): void
	onDoubleClick?(info: WithPreventDefault<TLClickEventInfo>): void
	onTripleClick?(info: WithPreventDefault<TLClickEventInfo>): void
	onQuadrupleClick?(info: WithPreventDefault<TLClickEventInfo>): void
	onRightClick?(info: WithPreventDefault<TLPointerEventInfo>): void
	onMiddleClick?(info: WithPreventDefault<TLPointerEventInfo>): void
}

function computedify<const Key extends string, Obj extends { [K in Key]: () => any }>(
	obj: Obj,
	keys: readonly Key[]
) {
	for (const key of keys) {
		const original = obj[key]
		const cache = computed(key, () => original.call(obj))
		;(obj[key] as any) = () => cache.get()
	}
}
