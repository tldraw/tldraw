import { useEffect } from 'react'
import { TldrawUiMenuCheckboxItem, useEditor, useToasts, useValue } from 'tldraw'
import { defineMessages, useMsg } from '../../tla/utils/i18n'
import { startJevController } from './JevController'
import { recordJevUpdate } from './JevState'

const messages = defineMessages({
	label: { defaultMessage: 'Automatic tools and styles (Jev)' },
	enabled: { defaultMessage: 'Jev is on for this canvas' },
	description: {
		defaultMessage:
			'Recent actions and nearby canvas content are sent to TypeSafe to suggest automatic tool and style changes. Turn this off in the canvas menu at any time.',
	},
	unavailable: {
		defaultMessage: 'Jev is unavailable. Automatic tools and styles have been turned off.',
	},
})

const metaKey = 'jevEnabled'

export function JevMenuItem() {
	const editor = useEditor()
	const enabled = useValue('Jev enabled', () => editor.getInstanceState().meta[metaKey] === true, [
		editor,
	])
	const label = useMsg(messages.label)
	const title = useMsg(messages.enabled)
	const description = useMsg(messages.description)
	const { addToast } = useToasts()
	return (
		<TldrawUiMenuCheckboxItem
			id="jev"
			label={label}
			checked={enabled}
			onSelect={() => {
				editor.updateInstanceState(
					{ meta: { ...editor.getInstanceState().meta, [metaKey]: !enabled } },
					{ history: 'ignore' }
				)
				if (!enabled) addToast({ title, description })
			}}
		/>
	)
}

export function Jev() {
	const editor = useEditor()
	const mode = useValue(
		'Jev mode',
		() => (editor.getInstanceState().meta.jevMode === 'staged' ? 'staged' : 'single'),
		[editor]
	)
	const enabled = useValue('Jev enabled', () => editor.getInstanceState().meta[metaKey] === true, [
		editor,
	])
	const unavailable = useMsg(messages.unavailable)
	const { addToast } = useToasts()
	useEffect(() => {
		if (!enabled) return
		return startJevController(editor, {
			endpoint: '/api/app/jev',
			mode,
			onError(error) {
				// Configuration/auth failures cannot recover by retrying a pointer event.
				if (error instanceof Error && /\((401|403|503)\)/.test(error.message)) {
					editor.updateInstanceState(
						{ meta: { ...editor.getInstanceState().meta, [metaKey]: false } },
						{ history: 'ignore' }
					)
					addToast({ title: unavailable, severity: 'warning' })
				}
			},
			onUpdate: (update) => recordJevUpdate(editor, update),
		})
	}, [editor, enabled, mode, addToast, unavailable])
	return null
}
