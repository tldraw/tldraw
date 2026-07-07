import { Sketch, Sketchbook } from '../../sketch'
import { EditorToolbar } from './editor-toolbar'

const sketchbook: Sketchbook<Record<string, never>> = {
	title: 'Toolbar/Editor',
	component: EditorToolbar,
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
