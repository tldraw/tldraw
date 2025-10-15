import { IMyPopupShape } from './PopupShapeUtil'

declare module '@tldraw/tlschema' {
	export interface GlobalShapePropsMap {
		'my-popup-shape': IMyPopupShape
	}
}
