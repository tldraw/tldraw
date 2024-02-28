import { TLShape } from '@tldraw/tlschema'
import { Control } from './Control'

export interface ShapeCanvasItem {
	readonly type: 'shape'
	readonly shape: TLShape
}

export interface ControlCanvasItem {
	readonly type: 'control'
	readonly control: Control
}

export type CanvasItem = ShapeCanvasItem | ControlCanvasItem
