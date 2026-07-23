import { ReactionPicker, ReactionPickerProps } from '@tldraw/commenting'
import { Sketch, Sketchbook } from '../../sketch'

const sketchbook: Sketchbook<ReactionPickerProps> = {
	title: 'Comments/Reaction picker',
	component: ReactionPicker,
}
export default sketchbook

export const Default: Sketch<ReactionPickerProps> = { args: {} }

// the user's current pick shows pressed in the grid
export const WithSelection: Sketch<ReactionPickerProps> = { args: { selected: ['🎉'] } }
