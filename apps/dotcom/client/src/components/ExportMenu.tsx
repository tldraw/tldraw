import * as Popover from '@radix-ui/react-popover'
import React from 'react'
import {
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	useActions,
	useContainer,
	useEditor,
	useTranslation,
} from 'tldraw'
import { useShareMenuIsOpen } from '../hooks/useShareMenuOpen'
import { SHARE_PROJECT_ACTION } from '../utils/sharing'
import { getSaveFileCopyAction } from '../utils/useFileSystem'
import { useHandleUiEvents } from '../utils/useHandleUiEvent'
import { ShareButton } from './ShareButton'
import { SnapshotLinkCopy } from './SnapshotLinkCopy'

export const ExportMenu = React.memo(function ExportMenu() {
	const { [SHARE_PROJECT_ACTION]: shareProject } = useActions()
	const container = useContainer()
	const msg = useTranslation()
	const handleUiEvent = useHandleUiEvents()
	const editor = useEditor()
	const saveFileCopyAction = getSaveFileCopyAction(
		editor,
		handleUiEvent,
		msg('document.default-name')
	)
	const [isOpen, onOpenChange] = useShareMenuIsOpen()

	return (
		<Popover.Root open={isOpen} onOpenChange={onOpenChange}>
			<Popover.Trigger dir="ltr" asChild>
				<ShareButton title={'share-menu.title'} label={'share-menu.title'} />
			</Popover.Trigger>
			<Popover.Portal container={container}>
				<Popover.Content
					dir="ltr"
					className="tlui-menu tlui-share-zone__popover"
					align="end"
					side="bottom"
					sideOffset={6}
				>
					<TldrawUiMenuContextProvider type="panel" sourceId="export-menu">
						<TldrawUiMenuGroup id="share">
							<TldrawUiMenuItem {...shareProject} />
							<p className="tlui-menu__group tlui-share-zone__details">
								{msg('share-menu.fork-note')}
							</p>
						</TldrawUiMenuGroup>
						<SnapshotLinkCopy />
						<TldrawUiMenuGroup id="save">
							<TldrawUiMenuItem {...saveFileCopyAction} />
							<p className="tlui-menu__group tlui-share-zone__details">
								{msg('share-menu.save-note')}
							</p>
						</TldrawUiMenuGroup>
					</TldrawUiMenuContextProvider>
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	)
})
