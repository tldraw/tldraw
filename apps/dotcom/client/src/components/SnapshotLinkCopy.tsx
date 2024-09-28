import { SNAPSHOT_PREFIX } from '@tldraw/dotcom-shared'
import React, { useCallback, useState } from 'react'
import {
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	unwrapLabel,
	useActions,
	useTranslation,
} from 'tldraw'
import { writeToClipboard } from '../utils/clipboard'
import { SHARE_SNAPSHOT_ACTION } from '../utils/sharing'

/** @internal */
export const SnapshotLinkCopy = React.memo(function SnapshotLinkCopy() {
	const { [SHARE_SNAPSHOT_ACTION]: shareSnapshot } = useActions()
	const msg = useTranslation()
	const [didCopySnapshotLink, setDidCopySnapshotLink] = useState(false)
	const [isUploadingSnapshot, setIsUploadingSnapshot] = useState(false)

	const handleSnapshotLinkCopy = useCallback(async () => {
		if (window.location.pathname.startsWith(`/${SNAPSHOT_PREFIX}/`)) {
			const result = new Promise<Blob>((resolve) => {
				resolve(new Blob([window.location.href], { type: 'text/plain' }))
			})
			writeToClipboard(result)
		} else {
			setIsUploadingSnapshot(true)
			await shareSnapshot.onSelect('share-menu')
			setIsUploadingSnapshot(false)
		}
		setDidCopySnapshotLink(true)
		setTimeout(() => setDidCopySnapshotLink(false), 1000)
	}, [shareSnapshot])

	return (
		<TldrawUiMenuGroup id="snapshot">
			<TldrawUiMenuItem
				id="copy-to-clipboard"
				readonlyOk
				icon={didCopySnapshotLink ? 'clipboard-copied' : 'clipboard-copy'}
				label={unwrapLabel(shareSnapshot.label)}
				onSelect={handleSnapshotLinkCopy}
				spinner={isUploadingSnapshot}
			/>
			<p className="tlui-menu__group tlui-share-zone__details">
				{msg('share-menu.snapshot-link-note')}
			</p>
		</TldrawUiMenuGroup>
	)
})
