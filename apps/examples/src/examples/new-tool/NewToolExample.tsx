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
import { SimpleSelectToolUtil } from './SimpleTool'

const tools: TLToolUtilConstructor<any, any>[] = [SimpleSelectToolUtil]

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
				initialState="@simple/select"
				shapeUtils={defaultShapeUtils}
				bindingUtils={defaultBindingUtils}
				tools={tools}
				onMount={(e) => {
					e.createShapes([
						{ type: 'geo', x: 200, y: 200 },
						{ type: 'geo', x: 400, y: 400 },
					])
				}}
			>
				<TldrawUi>
					<ContextMenu>
						<DefaultContextMenuContent />
					</ContextMenu>
				</TldrawUi>
			</TldrawEditor>
		</div>
	)
}
