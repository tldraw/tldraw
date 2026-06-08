import { useState } from 'react'
import {
	DefaultKeyboardShortcutsDialog,
	DefaultKeyboardShortcutsDialogContent,
	DefaultToolbar,
	DefaultToolbarContent,
	Editor,
	TLComponents,
	Tldraw,
	TldrawOptions,
	TLUiOverrides,
	TldrawUiMenuItem,
	useIsToolSelected,
	useTools,
} from 'tldraw'
import { ANNOTATION_TOOL_ID, AnnotationTool } from './annotate/AnnotationTool'
import { MarketingAssetShapeUtil } from './asset/AssetShapeUtil'
import { resetInterruptedGenerations } from './asset/assetActions'
import { MarketingSidebar } from './components/MarketingSidebar'

const shapeUtils = [MarketingAssetShapeUtil]
const tools = [AnnotationTool]

// Register the annotation tool in the UI and give it a keyboard shortcut.
const overrides: TLUiOverrides = {
	tools(editor, tools) {
		tools[ANNOTATION_TOOL_ID] = {
			id: ANNOTATION_TOOL_ID,
			icon: 'comment',
			label: 'Annotate',
			kbd: 'k',
			onSelect: () => editor.setCurrentTool(ANNOTATION_TOOL_ID),
		}
		return tools
	},
}

const components: TLComponents = {
	// Add the annotation tool to the toolbar alongside the standard tools.
	Toolbar: (props) => {
		const tools = useTools()
		const isSelected = useIsToolSelected(tools[ANNOTATION_TOOL_ID])
		return (
			<DefaultToolbar {...props}>
				<TldrawUiMenuItem {...tools[ANNOTATION_TOOL_ID]} isSelected={isSelected} />
				<DefaultToolbarContent />
			</DefaultToolbar>
		)
	},
	KeyboardShortcutsDialog: (props) => {
		const tools = useTools()
		return (
			<DefaultKeyboardShortcutsDialog {...props}>
				<DefaultKeyboardShortcutsDialogContent />
				<TldrawUiMenuItem {...tools[ANNOTATION_TOOL_ID]} />
			</DefaultKeyboardShortcutsDialog>
		)
	},
}

const options: Partial<TldrawOptions> = {
	maxPages: 1,
}

function App() {
	const [editor, setEditor] = useState<Editor | null>(null)

	return (
		<div className="marketing-layout" style={{ position: 'fixed', inset: 0 }}>
			<div className="marketing-sidebar">
				{editor ? <MarketingSidebar editor={editor} /> : <div />}
			</div>
			<div className="marketing-canvas">
				<Tldraw
					persistenceKey="marketing-assets-v2"
					options={options}
					shapeUtils={shapeUtils}
					tools={tools}
					overrides={overrides}
					components={components}
					onMount={(editor) => {
						;(window as any).editor = editor
						setEditor(editor)
						resetInterruptedGenerations(editor)
					}}
				/>
			</div>
		</div>
	)
}

export default App
