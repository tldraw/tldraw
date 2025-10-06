import { IExamMarkShape } from './add-mark-util'

declare module '@tldraw/tlschema' {
	export interface GlobalShapePropsMap {
		'exam-mark': IExamMarkShape
	}
}
