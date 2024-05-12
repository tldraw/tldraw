import {
	ContextMenu,
	DefaultContextMenuContent,
	ErrorScreen,
	LoadingScreen,
	TLToolUtilConstructor,
	TldrawEditor,
	TldrawUi,
	defaultBindingUtils,
	defaultEditorAssetUrls,
	defaultShapeUtils,
	usePreloadAssets,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { SimpleEraserToolUtil } from './SimpleEraserTool'
import { SimpleSelectToolUtil } from './SimpleSelectTool'

const tools: TLToolUtilConstructor<any, any>[] = [SimpleSelectToolUtil, SimpleEraserToolUtil]

//[2]
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
				onMount={(e) => {
					e.createShapes([
						{ type: 'geo', x: 200, y: 200 },
						{ type: 'geo', x: 400, y: 400 },
						{ type: 'text', x: 200, y: 400, props: { text: 'hello' } },
					])
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
