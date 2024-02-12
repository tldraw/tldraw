import { DefaultKeyboardShortcutsDialog, TLComponents, Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

function CustomKeyboardShortcutsDialog() {
	return (
		<div style={{ transform: 'rotate(180deg)', position: 'relative' }}>
			<DefaultKeyboardShortcutsDialog />
		</div>
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
