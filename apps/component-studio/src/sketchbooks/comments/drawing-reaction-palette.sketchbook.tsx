import { DrawingReactionPalette, DrawingReactionPaletteProps } from '@tldraw/commenting'
import { Sketch, Sketchbook } from '../../sketch'

const sketchbook: Sketchbook<DrawingReactionPaletteProps> = {
	title: 'Comments/Drawing reaction palette',
	component: DrawingReactionPalette,
}
export default sketchbook

export const Default: Sketch<DrawingReactionPaletteProps> = { args: {} }

// tokens already on the comment show above the canvas, for one-click reuse
export const WithReuseRow: Sketch<DrawingReactionPaletteProps> = {
	args: { emoji: ['👍', '🎉'], selected: ['🎉'] },
}
