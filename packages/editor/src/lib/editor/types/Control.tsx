import { ReactNode } from 'react'
import { Geometry2d } from '../../primitives/geometry/Geometry2d'
import { Editor } from '../Editor'

export type ControlFn = (editor: Editor) => null | Control | Control[]

export abstract class Control {
	abstract getGeometry(): Geometry2d
	component(): ReactNode {
		return null
	}
}
