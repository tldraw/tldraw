import {
	DefaultActionsMenu,
	DefaultQuickActions,
	DefaultStylePanel,
	TLComponents,
	Tldraw,
	TldrawUiToolbar,
	useEditor,
	useValue,
} from 'tldraw'
import { OnCanvasComponentPicker } from './components/OnCanvasComponentPicker.tsx'
import { WorkflowToolbar } from './components/WorkflowToolbar.tsx'
import { ConnectionBindingUtil } from './connection/ConnectionBindingUtil'
import { ConnectionShapeUtil } from './connection/ConnectionShapeUtil'
import { keepConnectionsAtBottom } from './connection/keepConnectionsAtBottom'
import { NodeShapeUtil } from './nodes/NodeShapeUtil'
import { PointingPort } from './ports/PointingPort'

const shapeUtils = [NodeShapeUtil, ConnectionShapeUtil]
const bindingUtils = [ConnectionBindingUtil]

const components: TLComponents = {
	InFrontOfTheCanvas: () => <OnCanvasComponentPicker />,
	Toolbar: () => (
		<div style={{ display: 'flex', alignItems: 'flex-end', flexGrow: 2 }}>
			<WorkflowToolbar />
			<div style={{ flex: 2 }} />
			<div className="tlui-toolbar">
				<TldrawUiToolbar className="tlui-toolbar__tools tlui-buttons__horizontal" label="Actions">
					<DefaultQuickActions />
					<DefaultActionsMenu />
				</TldrawUiToolbar>
			</div>
			<div style={{ flex: 2 }} />
		</div>
	),
	MenuPanel: () => null,
	StylePanel: () => {
		const editor = useEditor()
		const currentShape = useValue('currentShape', () => editor.getOnlySelectedShape(), [editor])
		if (['node', 'connection'].includes(currentShape?.type ?? '')) return null
		return <DefaultStylePanel />
	},
}

function App() {
	return (
		<div style={{ position: 'fixed', inset: 0 }}>
			<Tldraw
				persistenceKey="workflow-builder"
				shapeUtils={shapeUtils}
				bindingUtils={bindingUtils}
				components={components}
				onMount={(editor) => {
					;(window as any).editor = editor
					if (!editor.getCurrentPageShapes().some((s) => s.type === 'node')) {
						editor.createShape({ type: 'node', x: 200, y: 200 })
					}

					editor.user.updateUserPreferences({ isSnapMode: true })
					editor.getStateDescendant('select')!.addChild(PointingPort)

					keepConnectionsAtBottom(editor)
				}}
			/>
		</div>
	)
}

export default App
