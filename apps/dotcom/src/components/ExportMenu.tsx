import * as Popover from '@radix-ui/react-popover'
import React, { useState } from 'react'
import {
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	unwrapLabel,
	useActions,
	useContainer,
	useEditor,
	useTranslation,
} from 'tldraw'
import { useShareMenuIsOpen } from '../hooks/useShareMenuOpen'
import { SHARE_PROJECT_ACTION, SHARE_SNAPSHOT_ACTION } from '../utils/sharing'
import { getSaveFileCopyAction } from '../utils/useFileSystem'
import { useHandleUiEvents } from '../utils/useHandleUiEvent'
import { ShareButton } from './ShareButton'

export const ExportMenu = React.memo(function ExportMenu() {
	const { [SHARE_PROJECT_ACTION]: shareProject, [SHARE_SNAPSHOT_ACTION]: shareSnapshot } =
		useActions()
	const container = useContainer()
	const msg = useTranslation()
	const handleUiEvent = useHandleUiEvents()
	const editor = useEditor()
	const saveFileCopyAction = getSaveFileCopyAction(
		editor,
		handleUiEvent,
		msg('document.default-name')
	)
	const [didCopySnapshotLink, setDidCopySnapshotLink] = useState(false)
	const [isUploadingSnapshot, setIsUploadingSnapshot] = useState(false)

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
						<TldrawUiMenuGroup id="snapshot">
							<TldrawUiMenuItem
								id="copy-to-clipboard"
								readonlyOk
								icon={didCopySnapshotLink ? 'clipboard-copied' : 'clipboard-copy'}
								label={unwrapLabel(shareSnapshot.label)}
								onSelect={async () => {
									setIsUploadingSnapshot(true)
									await shareSnapshot.onSelect('share-menu')
									setIsUploadingSnapshot(false)
									setDidCopySnapshotLink(true)
									setTimeout(() => setDidCopySnapshotLink(false), 1000)
								}}
								spinner={isUploadingSnapshot}
							/>
							<p className="tlui-menu__group tlui-share-zone__details">
								{msg('share-menu.snapshot-link-note')}
							</p>
						</TldrawUiMenuGroup>
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
