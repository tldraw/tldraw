import { EditorExtension } from '@tldraw/tldraw'
import { CardShapeTool } from './CardShapeTool'
import { CardShapeUtil } from './CardShapeUtil'

export const CardShapeExtension = EditorExtension.create({
	name: '@my-app/card-shape',
	addShapes() {
		return [CardShapeUtil]
	},
	addTools() {
		return [CardShapeTool]
	},
})
