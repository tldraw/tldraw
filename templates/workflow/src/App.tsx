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
import { OnCanvasComponentPicker } from './components/OnCanvasComponentPicker.tsx'
import { WorkflowRegions } from './components/WorkflowRegions.tsx'
import { overrides, WorkflowToolbar } from './components/WorkflowToolbar.tsx'
import { ConnectionBindingUtil } from './connection/ConnectionBindingUtil'
import { ConnectionCenterHandleOverlayUtil } from './connection/ConnectionCenterHandleOverlayUtil'
import { ConnectionShapeUtil } from './connection/ConnectionShapeUtil'
import { keepConnectionsAtBottom } from './connection/keepConnectionsAtBottom'
import { disableTransparency } from './disableTransparency.tsx'
import { NodeShapeUtil } from './nodes/NodeShapeUtil'
import { PointingPort } from './ports/PointingPort'

const shapeUtils = [NodeShapeUtil, ConnectionShapeUtil]
const bindingUtils = [ConnectionBindingUtil]
const overlayUtils = [ConnectionCenterHandleOverlayUtil]

const components: TLComponents = {
	InFrontOfTheCanvas: () => (
		<>
			<OnCanvasComponentPicker />
			<WorkflowRegions />
		</>
	),
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
			() =>
				!editor.isIn('select') ||
				editor.getSelectedShapes().some((s) => s.type !== 'node' && s.type !== 'connection'),
			[editor]
		)
		if (!shouldShowStylePanel) return null
		return <DefaultStylePanel />
	},
}

const options: Partial<TldrawOptions> = {
	actionShortcutsLocation: 'menu',
	maxPages: 1,
}

function App() {
	return (
		<div style={{ position: 'fixed', inset: 0 }}>
			<Tldraw
				persistenceKey="workflow"
				options={options}
				overrides={overrides}
				shapeUtils={shapeUtils}
				bindingUtils={bindingUtils}
				overlayUtils={overlayUtils}
				components={components}
				onMount={(editor) => {
					;(window as any).editor = editor
					if (!editor.getCurrentPageShapes().some((s) => s.type === 'node')) {
						editor.createShape({ type: 'node', x: 200, y: 200 })
					}

					editor.user.updateUserPreferences({ isSnapMode: true })

					// Extend the select tool so pointing at a port starts a connection
					editor.getStateDescendant('select')!.addChild(PointingPort)
					keepConnectionsAtBottom(editor)
					disableTransparency(editor, ['node', 'connection'])
				}}
			/>
		</div>
	)
}

export default App
