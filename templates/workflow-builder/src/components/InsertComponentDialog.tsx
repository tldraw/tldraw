import {
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	TldrawUiMenuContextProvider,
} from 'tldraw'
import { NodeType } from '../nodes/nodeTypes.tsx'
import { ComponentMenuContent } from './ComponentMenuContent'

export function InsertComponentDialog({
	onClose,
	onNodeSelected,
}: {
	onClose: () => void
	onNodeSelected?: (nodeType: NodeType) => void
}) {
	return (
		<>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>Insert Node</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody>
				<TldrawUiMenuContextProvider sourceId="dialog" type="menu">
					<ComponentMenuContent onClose={onClose} onNodeSelected={onNodeSelected} />
				</TldrawUiMenuContextProvider>
			</TldrawUiDialogBody>
		</>
	)
}
