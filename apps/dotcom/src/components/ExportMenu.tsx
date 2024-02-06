import * as Popover from '@radix-ui/react-popover'
import { Button, useActions, useContainer, useEditor, useTranslation } from '@tldraw/tldraw'
import React, { useState } from 'react'
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
	const saveFileCopyAction = getSaveFileCopyAction(editor, handleUiEvent)
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
					<div className="tlui-menu__group">
						<Button
							type="menu"
							label={shareProject.label}
							icon={'share-1'}
							onClick={() => {
								shareProject.onSelect('export-menu')
							}}
						/>
						<p className="tlui-menu__group tlui-share-zone__details">
							{msg('share-menu.fork-note')}
						</p>
					</div>
					<div className="tlui-menu__group">
						<Button
							type="menu"
							icon={didCopySnapshotLink ? 'clipboard-copied' : 'clipboard-copy'}
							label={shareSnapshot.label!}
							onClick={async () => {
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
					</div>
					<div className="tlui-menu__group">
						<Button
							type="menu"
							label={saveFileCopyAction.label}
							icon={'share-2'}
							onClick={() => {
								saveFileCopyAction.onSelect('export-menu')
							}}
						/>
						<p className="tlui-menu__group tlui-share-zone__details">
							{msg('share-menu.save-note')}
						</p>
					</div>
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	)
})
