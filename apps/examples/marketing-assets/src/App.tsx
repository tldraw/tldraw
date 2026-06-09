import { createTLSchema, defaultBindingSchemas, defaultShapeSchemas } from '@tldraw/tlschema'
import { useSync } from '@tldraw/sync'
import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
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
import { MARKETING_ASSET_TYPE, marketingAssetProps } from './asset/assetShape'
import { MarketingAssetShapeUtil } from './asset/AssetShapeUtil'
import { resetInterruptedGenerations } from './asset/assetActions'
import { MarketingSidebar } from './components/MarketingSidebar'
import { multiplayerAssetStore } from './multiplayerAssetStore'
import { RoomBar } from './components/RoomBar'

const shapeUtils = [MarketingAssetShapeUtil]
const tools = [AnnotationTool]

// The synced store's schema. It must match the worker's room schema exactly:
// the default shapes and bindings plus our custom marketing-asset shape.
const schema = createTLSchema({
	shapes: {
		...defaultShapeSchemas,
		[MARKETING_ASSET_TYPE]: { props: marketingAssetProps },
	},
	bindings: { ...defaultBindingSchemas },
})

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
	const { roomId } = useParams<{ roomId: string }>()
	const [editor, setEditor] = useState<Editor | null>(null)

	// Connect this room to the multiplayer backend. The store is shared by every
	// client in the same room; assets are uploaded to R2 rather than synced inline.
	const store = useSync({
		uri: useMemo(() => `${window.location.origin}/api/connect/${roomId}`, [roomId]),
		assets: multiplayerAssetStore,
		schema,
	})

	return (
		<div className="marketing-layout" style={{ position: 'fixed', inset: 0 }}>
			<div className="marketing-sidebar">
				<RoomBar roomId={roomId} />
				{editor ? <MarketingSidebar editor={editor} /> : <div />}
			</div>
			<div className="marketing-canvas">
				<Tldraw
					store={store}
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
