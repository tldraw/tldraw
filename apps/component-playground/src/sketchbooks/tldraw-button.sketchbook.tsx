import { TldrawUiButton, TldrawUiButtonLabel, useTranslation } from 'tldraw'
import { Sketch, Sketchbook } from '../sketch'

// A real SDK component. Its colors come from the theme tokens and its label from
// the translation for `action`, so it responds to both the theme and locale globals.
interface ActionButtonProps {
	action: string
	type: 'normal' | 'primary' | 'danger' | 'low'
}

function ActionButton({ action, type }: ActionButtonProps) {
	const msg = useTranslation()
	return (
		<TldrawUiButton type={type}>
			<TldrawUiButtonLabel>{msg(action)}</TldrawUiButtonLabel>
		</TldrawUiButton>
	)
}

const sketchbook: Sketchbook<ActionButtonProps> = {
	title: 'tldraw/Button',
	component: ActionButton,
	argTypes: {
		type: { control: 'select', options: ['normal', 'primary', 'danger', 'low'] },
		action: {
			control: 'select',
			options: [
				'action.copy',
				'action.paste',
				'action.delete',
				'action.duplicate',
				'action.select-all',
			],
		},
	},
}
export default sketchbook

export const Copy: Sketch<ActionButtonProps> = { args: { action: 'action.copy', type: 'normal' } }
export const Delete: Sketch<ActionButtonProps> = {
	args: { action: 'action.delete', type: 'danger' },
}
