import { Sketch, Sketchbook } from '../../sketch'
import { SendButton, SendButtonProps } from './send-button'

const sketchbook: Sketchbook<SendButtonProps> = {
	title: 'Comments/Send button',
	component: SendButton,
}
export default sketchbook

export const Default: Sketch<SendButtonProps> = { args: { label: 'Send' } }
