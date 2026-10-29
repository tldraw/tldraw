import { TLCustomServerEvent } from '@tldraw/dotcom-shared'
import { useCallback } from 'react'
import { useIntl } from 'react-intl'
import { useToasts } from 'tldraw'
import { trackEvent } from '../../../utils/analytics'
import { restoreVersion } from '../../utils/versionHistoryApi'
import { buildRestoredToast } from './restoredToast'
import { versionHistoryMessages as messages } from './version-history-messages'
import { formatVersionTime } from './versionHistoryFormat'

/** Shows everyone in the file who restored what, with an undo for the restore. */
export function useHandleFileRestored(fileId: string) {
	const intl = useIntl()
	const { addToast } = useToasts()
	return useCallback(
		(event: Extract<TLCustomServerEvent, { type: 'file_restored' }>) => {
			const restoredAt = Date.now()
			addToast(
				buildRestoredToast(event, {
					title: intl.formatMessage(messages.restoredToast, {
						name: event.byName || intl.formatMessage(messages.someone),
						time: formatVersionTime(event.restoredFrom).time,
					}),
					undoLabel: intl.formatMessage(messages.undo),
					onUndo: (body) => {
						trackEvent('undo-restore-version', {
							secondsAfterRestore: Math.round((Date.now() - restoredAt) / 1000),
						})
						restoreVersion(fileId, body).catch(() =>
							addToast({
								id: 'restore-failed',
								title: intl.formatMessage(messages.restoreFailed),
								severity: 'error',
							})
						)
					},
				})
			)
		},
		[addToast, intl, fileId]
	)
}
