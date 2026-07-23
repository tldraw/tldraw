import { DrawingReactionPalette, ReactionPicker, ReactionPickerProps } from '@tldraw/commenting'
import { Sketch, Sketchbook } from '../../sketch'

function DrawingReactionPicker(props: ReactionPickerProps) {
	return <ReactionPicker {...props} palette={DrawingReactionPalette} />
}

const sketchbook: Sketchbook<ReactionPickerProps> = {
	title: 'Comments/Drawing reaction picker',
	component: DrawingReactionPicker,
}
export default sketchbook

export const Default: Sketch<ReactionPickerProps> = { args: {} }
