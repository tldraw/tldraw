import { Sketch, Sketchbook } from '../../sketch'
import { CanvasWithComments, CanvasWithCommentsProps } from './canvas-with-comments'

const sketchbook: Sketchbook<CanvasWithCommentsProps> = {
	title: 'Flows/Canvas with comments',
	component: CanvasWithComments,
}
export default sketchbook

export const Mobile: Sketch<CanvasWithCommentsProps> = {
	args: { empty: false },
	parameters: { viewport: 'mobile' },
}
export const Tablet: Sketch<CanvasWithCommentsProps> = {
	args: { empty: false },
	parameters: { viewport: 'tablet' },
}
export const Desktop: Sketch<CanvasWithCommentsProps> = {
	args: { empty: false },
	parameters: { viewport: 'desktop' },
}
