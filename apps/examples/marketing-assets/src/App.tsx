import { useSync } from '@tldraw/sync'
import { createTLSchema, defaultBindingSchemas, defaultShapeSchemas } from '@tldraw/tlschema'
import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Editor, TLComponents, Tldraw, TldrawOptions, TLUiOverrides, useValue } from 'tldraw'
import { ANNOTATION_TOOL_ID, AnnotationTool } from './annotate/AnnotationTool'
import { resetInterruptedGenerations } from './asset/assetActions'
import {
	MARKETING_ASSET_TYPE,
	marketingAssetMigrations,
	marketingAssetProps,
} from './asset/assetShape'
import { MarketingAssetShapeUtil } from './asset/AssetShapeUtil'
import { seedBrandFromStorage } from './brand/brandState'
import { AnnotateControl } from './components/AnnotateControl'
import { BrandPanel } from './components/BrandPanel'
import { MarketingSidebar } from './components/MarketingSidebar'
import { RoomBar } from './components/RoomBar'
import { ThemeToggle } from './components/ThemeToggle'
import { multiplayerAssetStore } from './multiplayerAssetStore'

const shapeUtils = [MarketingAssetShapeUtil]
const tools = [AnnotationTool]

// The synced store's schema. It must match the worker's room schema exactly:
// the default shapes and bindings plus our custom marketing-asset shape.
const schema = createTLSchema({
	shapes: {
		...defaultShapeSchemas,
		[MARKETING_ASSET_TYPE]: { props: marketingAssetProps, migrations: marketingAssetMigrations },
	},
	bindings: { ...defaultBindingSchemas },
})

// Register the annotation tool so its keyboard shortcut (k) keeps working even
// though there's no toolbar. The visible control lives in AnnotateControl.
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
	// This should read as a focused product, not a tldraw canvas. Hide every piece
	// of default editor chrome; the only canvas action is annotate, exposed through
	// our own clearly-labelled floating control.
	InFrontOfTheCanvas: AnnotateControl,
	Toolbar: null,
	StylePanel: null,
	NavigationPanel: null,
	ZoomMenu: null,
	Minimap: null,
	QuickActions: null,
	ActionsMenu: null,
	HelperButtons: null,
	MainMenu: null,
	PageMenu: null,
	MenuPanel: null,
	HelpMenu: null,
	KeyboardShortcutsDialog: null,
	DebugMenu: null,
	DebugPanel: null,
}

const options: Partial<TldrawOptions> = {
	maxPages: 1,
}

// Product name shown in the app header. Change this to rebrand the workspace.
const APP_NAME = 'Campaign Studio'

function BrandMark() {
	return (
		<div className="marketing-brand-mark" aria-hidden>
			<svg
				viewBox="0 0 24 24"
				width={18}
				height={18}
				fill="none"
				stroke="currentColor"
				strokeWidth={2}
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					d="M12 3l2.2 5.3L20 9.3l-4 3.9.9 5.8L12 16.3 7.1 19l.9-5.8-4-3.9 5.8-1L12 3z"
				/>
			</svg>
		</div>
	)
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

	// Follow the editor's colour scheme so the custom shell (header, panels,
	// annotate control) flips along with the canvas. Null before the editor mounts.
	const isDark = useValue('app dark', () => editor?.user.getIsDarkMode() ?? false, [editor])

	return (
		<div className={`marketing-app${isDark ? ' marketing-app_dark' : ''}`}>
			<header className="marketing-header">
				<div className="marketing-brand">
					<BrandMark />
					<div className="marketing-brand-text">
						<span className="marketing-brand-name">{APP_NAME}</span>
						<span className="marketing-brand-sub">Campaign workspace</span>
					</div>
				</div>
				<div className="marketing-header-actions">
					<RoomBar roomId={roomId} />
					{editor && <ThemeToggle editor={editor} />}
				</div>
			</header>
			<div className="marketing-body">
				<aside className="marketing-sidebar marketing-sidebar_left">
					{editor ? <MarketingSidebar editor={editor} /> : <div />}
				</aside>
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
							seedBrandFromStorage(editor)
							resetInterruptedGenerations(editor)
						}}
					/>
				</div>
				<aside className="marketing-sidebar marketing-sidebar_right">
					{editor ? <BrandPanel editor={editor} /> : <div />}
				</aside>
			</div>
		</div>
	)
}

export default App
