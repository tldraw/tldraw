import {
	ContextMenu,
	DefaultContextMenuContent,
	ErrorScreen,
	LoadingScreen,
	TLComponents,
	TLEditorOptions,
	TldrawEditor,
	TldrawScribble,
	TldrawUi,
	defaultBindingUtils,
	defaultEditorAssetUrls,
	defaultShapeUtils,
	toolWithConfig,
	usePreloadAssets,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { SimpleEraserToolUtil } from './SimpleEraserTool/SimpleEraserTool'
import { SimpleSelectToolUtil } from './SimpleSelectTool/SimpleSelectTool'

const tools: TLEditorOptions['tools'] = [
	SimpleSelectToolUtil,
	toolWithConfig(SimpleEraserToolUtil, { scribbleSize: 16, scribbleColor: 'muted-1' as const }),
]

const components: TLComponents = {
	Scribble: TldrawScribble,
}

export default function NewToolExample() {
	const assetLoading = usePreloadAssets(defaultEditorAssetUrls)

	if (assetLoading.error) {
		return <ErrorScreen>Could not load assets.</ErrorScreen>
	}

	if (!assetLoading.done) {
		return <LoadingScreen>Loading assets...</LoadingScreen>
	}

	return (
		<div className="tldraw__editor">
			<TldrawEditor
				initialState="@simple/eraser"
				shapeUtils={defaultShapeUtils}
				bindingUtils={defaultBindingUtils}
				tools={tools}
				components={components}
				onMount={(e) => {
					e.createShapes([
						{ type: 'geo', x: 200, y: 200 },
						{ type: 'geo', x: 400, y: 400 },
						{ type: 'text', x: 200, y: 400, props: { text: 'hello' } },
						{ type: 'frame', x: 100, y: 600 },
					])

					e.createShapes([{ type: 'geo', x: 150, y: 625 }])
				}}
			>
				<TldrawUi
					overrides={{
						tools: (editor, tools) => {
							tools['select'] = {
								...tools['select'],
								onSelect() {
									editor.setCurrentTool('@simple/select')
								},
							}
							tools['eraser'] = {
								...tools['eraser'],
								onSelect() {
									editor.setCurrentTool('@simple/eraser')
								},
							}
							return tools
						},
					}}
				>
					<ContextMenu>
						<DefaultContextMenuContent />
					</ContextMenu>
				</TldrawUi>
			</TldrawEditor>
		</div>
	)
}
