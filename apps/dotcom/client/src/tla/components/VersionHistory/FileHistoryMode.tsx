import { useCallback, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useToasts } from 'tldraw'
import { routes } from '../../../routeDefs'
import { trackEvent } from '../../../utils/analytics'
import { useTldrawCurrentUser } from '../../hooks/useUser'
import { historyModeAtom } from '../../utils/historyRoute'
import { HistoryView } from './applyView'
import { VersionActions } from './VersionActions'
import { VersionHistoryPanel } from './VersionHistoryPanel'
import { VersionPreviewEditor } from './VersionPreviewEditor'
import styles from './version-history.module.css'

export function FileHistoryMode({ fileSlug, ts }: { fileSlug: string; ts: string | null }) {
	const navigate = useNavigate()
	const location = useLocation()
	const user = useTldrawCurrentUser()
	const { addToast } = useToasts()
	const initialView = (location.state as { view?: HistoryView } | null)?.view ?? null

	useEffect(() => {
		historyModeAtom.set(true)
		return () => {
			historyModeAtom.set(false)
		}
	}, [])

	const select = useCallback(
		(next: string | null) => {
			if (next) {
				trackEvent('preview-version', {
					ageHours: Math.round((Date.now() - Date.parse(next)) / 3600_000),
				})
			}
			const path = next
				? routes.tlaFileHistorySnapshot({ fileSlug, timestamp: next })
				: routes.tlaFileHistory(fileSlug)
			navigate(path, { replace: true, state: location.state })
		},
		[fileSlug, navigate, location.state]
	)

	const onError = useCallback(() => {
		addToast({ id: 'version-load-failed', title: 'Could not load this version', severity: 'error' })
	}, [addToast])

	return (
		<div className={styles.mode}>
			<VersionPreviewEditor fileId={fileSlug} ts={ts} initialView={initialView} onError={onError}>
				<VersionHistoryPanel
					fileId={fileSlug}
					selectedTs={ts}
					onSelect={select}
					isStaff={!!user?.isTldraw}
					currentUserId={user?.id ?? null}
					actions={ts ? <VersionActions fileId={fileSlug} ts={ts} /> : null}
				/>
			</VersionPreviewEditor>
		</div>
	)
}
