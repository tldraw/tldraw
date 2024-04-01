import { createContext, useContext, useState } from 'react'
import {
	ArrangeMenuSubmenu,
	ClipboardMenuGroup,
	ConversionsMenuGroup,
	ConvertToBookmarkMenuItem,
	ConvertToEmbedMenuItem,
	DefaultContextMenu,
	EditLinkMenuItem,
	Editor,
	FitFrameToContentMenuItem,
	GroupMenuItem,
	RemoveFrameMenuItem,
	ReorderMenuSubmenu,
	SelectAllMenuItem,
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

// There's a guide at the bottom of this page!

// [1]
const focusedEditorContext = createContext(
	{} as {
		focusedEditor: Editor | null
		setFocusedEditor: (id: Editor | null) => void
	}
)

// [2]
function blurEditor(editor: Editor) {
	editor.selectNone()
	editor.setCurrentTool('hand')
	editor.updateInstanceState({ isFocused: false })
}

export default function InlineBehaviorExample() {
	const [focusedEditor, setFocusedEditor] = useState<Editor | null>(null)

	return (
		<focusedEditorContext.Provider value={{ focusedEditor, setFocusedEditor }}>
			<div
				style={{
					margin: 20,
					display: 'flex',
					flexDirection: 'column',
					gap: 20,
				}}
				// [3]
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
			style={{ width: 600, height: 400, maxWidth: '100%' }}
			// [4]
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
				autoFocus={false}
				// [5]
				hideUi={focusedEditor !== editor}
				// [6]
				components={{
					HelpMenu: null,
					NavigationPanel: null,
					MainMenu: null,
					PageMenu: null,
					ContextMenu: CustomContextMenu,
				}}
				// [7]
				onMount={(editor) => {
					setEditor(editor)
					editor.setCurrentTool('hand')
					editor.user.updateUserPreferences({ edgeScrollSpeed: 0 })
					editor.updateInstanceState({ isDebugMode: false })
				}}
			/>
		</div>
	)
}

// [8]
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
					<TldrawUiMenuGroup id="misc">
						<GroupMenuItem />
						<UngroupMenuItem />
						<EditLinkMenuItem />
						<ToggleAutoSizeMenuItem />
						<RemoveFrameMenuItem />
						<FitFrameToContentMenuItem />
						<ConvertToEmbedMenuItem />
						<ConvertToBookmarkMenuItem />
						<ToggleLockMenuItem />
					</TldrawUiMenuGroup>
					<TldrawUiMenuGroup id="modify">
						<ArrangeMenuSubmenu />
						<ReorderMenuSubmenu />
						{/* <MoveToPageMenu /> */}
					</TldrawUiMenuGroup>
					<ClipboardMenuGroup />
					<ConversionsMenuGroup />
					<TldrawUiMenuGroup id="select-all">
						<SelectAllMenuItem />
					</TldrawUiMenuGroup>
				</>
			)}
		</DefaultContextMenu>
	)
}

/*
This example demonstrates some common best practices for using tldraw as an
inline block within a larger document editor.

It includes:

- Making sure that only one editor has focus at a time.
- Always defaulting to the hand tool when you click into an editor.
- Deselecting everything when an editor loses focus.
- Hiding the UI when an editor is not focused.
- Disabling edge scrolling by default.
- Using a stripped down UI to make the most of the available space.
- Removing actions from the context menu to match the stripped down UI.

[1]
We use a context to manage which editor is currently focused. This allows us to
have multiple editors on the same page, without them interfering with each
other, or hijacking any keyboard shortcuts. For more information about handling
focus, check out the 'Multiple editors' and 'Editor focus' examples.

[2]
We have a helper function that we call on any editor that loses focus. We
deselect everything, and switch back to the hand tool, essentially 'resetting'
the user's tool state.

[3]
When the user clicks anywhere on the page outside of an editor, we blur the
currently focused editor.

[4]
When the user clicks into an editor, we focus it, and blur any other editor.

[5]
We hide the UI of any unfocused editor.

[6]
We disable many of tldraw's default UI components to make the most of the
available space. We also pass through a custom context menu component. Check out
point [8] for more information about that.

[7]
When an editor mounts, we default to the hand tool, and disable edge scrolling.
We also store a reference to the editor so that we can access it later. For the
purposes of this example, we also disable debug mode, so that you can see the
full effect of the stripped down UI.

[8]
For our custom context menu, we've copied the default context menu contents, and
we've commented out the 'Move to page' action. This is because we've removed
the Pages menu, so we don't want any drawings getting lost on a different page!

*/
