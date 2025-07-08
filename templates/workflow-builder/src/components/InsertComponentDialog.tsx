import {
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	TldrawUiMenuContextProvider,
} from 'tldraw'
import { ComponentMenuContent } from './ComponentMenuContent'

export function InsertComponentDialog({ onClose }: { onClose: () => void }) {
	return (
		<>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>Insert Node</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody>
				<TldrawUiMenuContextProvider sourceId="dialog" type="menu">
					<ComponentMenuContent onClose={onClose} />
				</TldrawUiMenuContextProvider>
			</TldrawUiDialogBody>
		</>
	)
}
