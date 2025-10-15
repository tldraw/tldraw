import { IMyEditableShape } from './EditableShapeUtil'

declare module '@tldraw/tlschema' {
	export interface GlobalShapePropsMap {
		'my-editable-shape': IMyEditableShape
	}
}
