import { createContext, useContext, useState } from 'react'
import {
	ArrangeMenuSubmenu,
	ClipboardMenuGroup,
	ConversionsMenuGroup,
	DefaultContextMenu,
	EditLinkMenuItem,
	Editor,
	EmbedsGroup,
	FitFrameToContentMenuItem,
	GroupMenuItem,
	RemoveFrameMenuItem,
	ReorderMenuSubmenu,
	SetSelectionGroup,
	TLUiContextMenuProps,
	Tldraw,
	TldrawUiMenuGroup,
	ToggleAutoSizeMenuItem,
	ToggleLockMenuItem,
	UngroupMenuItem,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'

const focusedEditorContext = createContext(
	{} as {
		focusedEditor: Editor | null
		setFocusedEditor: (id: Editor | null) => void
	}
)

export default function InlineBehaviorExample() {
	const [focusedEditor, setFocusedEditor] = useState<Editor | null>(null)

	return (
		<focusedEditorContext.Provider value={{ focusedEditor, setFocusedEditor }}>
			<div
				style={{ margin: 20 }}
				onPointerDown={() => {
					if (!focusedEditor) return
					blurEditor(focusedEditor)
					setFocusedEditor(null)
				}}
			>
				<InlineBlock persistenceKey="block-a" />
				<InlineBlock persistenceKey="block-b" />
				<InlineBlock persistenceKey="block-c" />
			</div>
		</focusedEditorContext.Provider>
	)
}

function InlineBlock({ persistenceKey }: { persistenceKey: string }) {
	const { focusedEditor, setFocusedEditor } = useContext(focusedEditorContext)

	const [editor, setEditor] = useState<Editor>()

	return (
		<div
			style={{ width: 600, maxWidth: '100%', height: 400, marginTop: 15 }}
			onFocus={() => {
				if (!editor) return
				if (focusedEditor && focusedEditor !== editor) {
					blurEditor(focusedEditor)
				}
				editor.updateInstanceState({ isFocused: true })
				setFocusedEditor(editor)
			}}
		>
			<Tldraw
				persistenceKey={persistenceKey}
				hideUi={focusedEditor !== editor}
				autoFocus={false}
				components={{
					HelpMenu: null,
					NavigationPanel: null,
					MainMenu: null,
					PageMenu: null,
					ContextMenu: CustomContextMenu,
				}}
				onMount={(editor) => {
					setEditor(editor)
					editor.updateInstanceState({ isDebugMode: false })
					editor.setCurrentTool('hand')
					editor.user.updateUserPreferences({ edgeScrollSpeed: 0 })
				}}
			/>
		</div>
	)
}

function blurEditor(editor: Editor) {
	editor.selectNone()
	editor.updateInstanceState({ isFocused: false })
	editor.setCurrentTool('hand')
}

function CustomContextMenu(props: TLUiContextMenuProps) {
	const editor = useEditor()

	const selectToolActive = useValue(
		'isSelectToolActive',
		() => editor.getCurrentToolId() === 'select',
		[editor]
	)

	return (
		<DefaultContextMenu {...props}>
			{selectToolActive && (
				<>
					<TldrawUiMenuGroup id="selection">
						<ToggleAutoSizeMenuItem />
						<EditLinkMenuItem />
						<GroupMenuItem />
						<UngroupMenuItem />
						<RemoveFrameMenuItem />
						<FitFrameToContentMenuItem />
						<ToggleLockMenuItem />
					</TldrawUiMenuGroup>
					<EmbedsGroup />
					<TldrawUiMenuGroup id="modify">
						<ArrangeMenuSubmenu />
						<ReorderMenuSubmenu />
						{/* <MoveToPageMenu /> */}
					</TldrawUiMenuGroup>
					<ClipboardMenuGroup />
					<ConversionsMenuGroup />
					<SetSelectionGroup />
				</>
			)}
		</DefaultContextMenu>
	)
}
