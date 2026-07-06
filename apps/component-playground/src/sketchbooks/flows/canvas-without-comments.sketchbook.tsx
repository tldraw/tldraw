import { Sketch, Sketchbook } from '../../sketch'
import { CanvasWithComments, CanvasWithCommentsProps } from './canvas-with-comments'

// The empty state: a canvas with no comments. The sidebar shows the empty state on
// wide viewports and collapses on narrow ones.
const sketchbook: Sketchbook<CanvasWithCommentsProps> = {
	title: 'Flows/Canvas without comments',
	component: CanvasWithComments,
}
export default sketchbook

export const Mobile: Sketch<CanvasWithCommentsProps> = {
	args: { empty: true },
	parameters: { viewport: 'mobile' },
}
export const Tablet: Sketch<CanvasWithCommentsProps> = {
	args: { empty: true },
	parameters: { viewport: 'tablet' },
}
export const Desktop: Sketch<CanvasWithCommentsProps> = {
	args: { empty: true },
	parameters: { viewport: 'desktop' },
}
