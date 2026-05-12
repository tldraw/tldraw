import {
	DefaultContextMenu,
	DefaultContextMenuContent,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	TLUiContextMenuProps,
	useDialogs,
	useEditor,
	useValue,
} from 'tldraw'
import { useMaybeApp } from '../../hooks/useAppState'
import { defineMessages, useMsg } from '../../utils/i18n'
import { WebhookDialog } from '../dialogs/WebhookDialog'

const contextMenuMessages = defineMessages({
	webhooks: { defaultMessage: 'Webhooks' },
})

export function TlaEditorContextMenu({
	fileId,
	...props
}: TLUiContextMenuProps & { fileId: string }) {
	const app = useMaybeApp()
	const editor = useEditor()
	const { addDialog } = useDialogs()

	const isReadOnly = useValue('isReadOnly', () => editor.getIsReadonly(), [editor])

	const showWebhooks = Boolean(app) && !isReadOnly
	const webhooksLabel = useMsg(contextMenuMessages.webhooks)

	return (
		<DefaultContextMenu {...props}>
			<>
				<DefaultContextMenuContent />
				{showWebhooks && (
					<TldrawUiMenuGroup id="dotcom-webhooks">
						<TldrawUiMenuItem
							id="tla-webhooks"
							label={webhooksLabel}
							readonlyOk
							onSelect={() => {
								addDialog({
									component: ({ onClose }) => <WebhookDialog fileSlug={fileId} onClose={onClose} />,
								})
							}}
						/>
					</TldrawUiMenuGroup>
				)}
			</>
		</DefaultContextMenu>
	)
}
