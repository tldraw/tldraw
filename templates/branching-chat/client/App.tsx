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
import { ConnectionCenterHandleOverlayUtil } from './connection/ConnectionCenterHandleOverlayUtil.tsx'
import { ConnectionShapeUtil } from './connection/ConnectionShapeUtil.tsx'
import { keepConnectionsAtBottom } from './connection/keepConnectionsAtBottom.tsx'
import { disableTransparency } from './disableTransparency.tsx'
import { NodeShapeUtil } from './nodes/NodeShapeUtil.tsx'
import { PointingPort } from './ports/PointingPort.tsx'

const shapeUtils = [NodeShapeUtil, ConnectionShapeUtil]
const bindingUtils = [ConnectionBindingUtil]
const overlayUtils = [ConnectionCenterHandleOverlayUtil]

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
			() =>
				!editor.isIn('select') ||
				editor.getSelectedShapes().some((s) => s.type !== 'node' && s.type !== 'connection'),
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
				overlayUtils={overlayUtils}
				components={components}
				onMount={(editor) => {
					;(window as any).editor = editor
					if (!editor.getCurrentPageShapes().some((s) => s.type === 'node')) {
						editor.createShape({ type: 'node', x: 200, y: 200 })
					}

					editor.user.updateUserPreferences({ isSnapMode: true })

					// Lets users create connections by dragging from ports
					editor.getStateDescendant('select')!.addChild(PointingPort)

					// todo: move connections to on the canvas layer
					keepConnectionsAtBottom(editor)
					disableTransparency(editor, ['node', 'connection'])
				}}
			/>
		</div>
	)
}

export default App
