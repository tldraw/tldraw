import { DefaultKeyboardShortcutsDialog, TLUiComponents, Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

function CustomKeyboardShortcutsDialog() {
	return (
		<div style={{ transform: 'rotate(180deg)', position: 'relative' }}>
			<DefaultKeyboardShortcutsDialog />
		</div>
	)
}

const uiComponents: TLUiComponents = {
	KeyboardShortcutsDialog: CustomKeyboardShortcutsDialog,
}

export default function CustomKeyboardShortcutsDialogExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw uiComponents={uiComponents} />
		</div>
	)
}
