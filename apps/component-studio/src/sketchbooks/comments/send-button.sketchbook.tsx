import { SendButton, SendButtonProps } from '@tldraw/comments'
import { Sketch, Sketchbook } from '../../sketch'

const sketchbook: Sketchbook<SendButtonProps> = {
	title: 'Comments/Send button',
	component: SendButton,
}
export default sketchbook

export const Default: Sketch<SendButtonProps> = { args: { label: 'Send' } }
export const Hover: Sketch<SendButtonProps> = {
	args: { label: 'Send' },
	parameters: { pseudo: 'hover' },
}
export const Active: Sketch<SendButtonProps> = {
	args: { label: 'Send' },
	parameters: { pseudo: 'active' },
}
export const Focused: Sketch<SendButtonProps> = {
	args: { label: 'Send' },
	parameters: { pseudo: 'focus-visible' },
}
export const Disabled: Sketch<SendButtonProps> = { args: { label: 'Send', disabled: true } }
