import {
	DefaultKeyboardShortcutsDialogContent,
	TLUiComponents,
	Tldraw,
	TldrawUiMenuItem,
} from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

function CustomKeyboardShortcutsDialogContent() {
	return (
		<>
			<DefaultKeyboardShortcutsDialogContent />
			<TldrawUiMenuItem
				id="about"
				label="Like my posts"
				icon="external-link"
				kbd="$q"
				readonlyOk
				onSelect={() => {
					window.open('https://x.com/tldraw', '_blank')
				}}
			/>
		</>
	)
}

const uiComponents: TLUiComponents = {
	KeyboardShortcutsDialogContent: CustomKeyboardShortcutsDialogContent,
}

export default function CustomKeyboardShortcutsDialogContentExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw uiComponents={uiComponents} />
		</div>
	)
}
