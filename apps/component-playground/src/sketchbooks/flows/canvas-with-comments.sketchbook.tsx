import { Sketch, Sketchbook } from '../../sketch'
import { CanvasWithComments } from './canvas-with-comments'

const sketchbook: Sketchbook<Record<string, never>> = {
	title: 'Flows/Canvas with comments',
	component: CanvasWithComments,
}
export default sketchbook

export const Mobile: Sketch<Record<string, never>> = {
	args: {},
	parameters: { viewport: 'mobile' },
}
export const Tablet: Sketch<Record<string, never>> = {
	args: {},
	parameters: { viewport: 'tablet' },
}
export const Desktop: Sketch<Record<string, never>> = {
	args: {},
	parameters: { viewport: 'desktop' },
}
