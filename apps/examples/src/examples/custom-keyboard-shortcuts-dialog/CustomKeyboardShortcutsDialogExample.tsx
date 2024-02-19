import {
	DefaultKeyboardShortcutsDialog,
	DefaultKeyboardShortcutsDialogContent,
	TLComponents,
	TLUiKeyboardShortcutsDialogProps,
	Tldraw,
	TldrawUiMenuItem,
} from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

function CustomKeyboardShortcutsDialog(props: TLUiKeyboardShortcutsDialogProps) {
	return (
		<DefaultKeyboardShortcutsDialog {...props}>
			<TldrawUiMenuItem
				id="about"
				label="Like my posts"
				icon="external-link"
				readonlyOk
				onSelect={() => {
					window.open('https://x.com/tldraw', '_blank')
				}}
			/>
			<DefaultKeyboardShortcutsDialogContent />
		</DefaultKeyboardShortcutsDialog>
	)
}

const components: TLComponents = {
	KeyboardShortcutsDialog: CustomKeyboardShortcutsDialog,
}

export default function CustomKeyboardShortcutsDialogExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={components} />
		</div>
	)
}
