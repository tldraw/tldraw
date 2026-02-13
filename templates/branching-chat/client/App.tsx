import {
	DefaultActionsMenu,
	DefaultQuickActions,
	DefaultStylePanel,
	TLComponents,
	Tldraw,
	TldrawOptions,
	TldrawUiToolbar,
	useEditor,
	useValue,
} from 'tldraw'
import { overrides, WorkflowToolbar } from './components/WorkflowToolbar.tsx'
import { ConnectionBindingUtil } from './connection/ConnectionBindingUtil.tsx'
import { ConnectionShapeUtil } from './connection/ConnectionShapeUtil.tsx'
import { keepConnectionsAtBottom } from './connection/keepConnectionsAtBottom.tsx'
import { disableTransparency } from './disableTransparency.tsx'
import { NodeShapeUtil } from './nodes/NodeShapeUtil.tsx'
import { PointingPort } from './ports/PointingPort.tsx'

// Define custom shape utilities that extend tldraw's shape system
const shapeUtils = [NodeShapeUtil, ConnectionShapeUtil]
// Define binding utilities that handle relationships between shapes
const bindingUtils = [ConnectionBindingUtil]

// Customize tldraw's UI components to add workflow-specific functionality
const components: TLComponents = {
	Toolbar: () => (
		<>
			<WorkflowToolbar />
			<div className="tlui-main-toolbar tlui-main-toolbar--horizontal">
				<TldrawUiToolbar className="tlui-main-toolbar__tools" label="Actions">
					<DefaultQuickActions />
					<DefaultActionsMenu />
				</TldrawUiToolbar>
			</div>
		</>
	),

	MenuPanel: () => null,
	StylePanel: () => {
		const editor = useEditor()
		const shouldShowStylePanel = useValue(
			'shouldShowStylePanel',
			() => {
				return (
					!editor.isIn('select') ||
					editor.getSelectedShapes().some((s) => s.type !== 'node' && s.type !== 'connection')
				)
			},
			[editor]
		)
		if (!shouldShowStylePanel) return
		return <DefaultStylePanel />
	},
}

const options: Partial<TldrawOptions> = {
	actionShortcutsLocation: 'menu',
	maxPages: 1,
}

function App() {
	return (
		<div className="workflow" style={{ position: 'fixed', inset: 0 }}>
			<Tldraw
				persistenceKey="workflow"
				options={options}
				overrides={overrides}
				shapeUtils={shapeUtils}
				bindingUtils={bindingUtils}
				components={components}
				onMount={(editor) => {
					;(window as any).editor = editor
					if (!editor.getCurrentPageShapes().some((s) => s.type === 'node')) {
						editor.createShape({ type: 'node', x: 200, y: 200 })
					}

					editor.user.updateUserPreferences({ isSnapMode: true })

					// Add our custom pointing port tool to the select tool's state machine
					// This allows users to create connections by pointing at ports
					editor.getStateDescendant('select')!.addChild(PointingPort)

					// todo: move connections to on the canvas layer

					// Ensure connections always stay at the bottom of the shape stack
					// This prevents them from covering other shapes
					keepConnectionsAtBottom(editor)

					// Disable transparency for workflow shapes
					disableTransparency(editor, ['node', 'connection'])
				}}
			/>
		</div>
	)
}

export default App
