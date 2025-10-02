import { useAuth } from '@clerk/clerk-react'
import { ROOM_PREFIX } from '@tldraw/dotcom-shared'
import { useEffect } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import {
	TldrawUiButton,
	TldrawUiButtonLabel,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogFooter,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	useDialogs,
} from 'tldraw'
import { routes } from '../../../../routeDefs'
import { trackEvent } from '../../../../utils/analytics'
import { useMaybeApp } from '../../../hooks/useAppState'
import { F } from '../../../utils/i18n'
import { useGetFileName } from '../TlaEditorTopRightPanel'
import styles from './sneaky-legacy-modal.module.css'

function LegacyChangesModal({ onClose }: { onClose(): void }) {
	const { isSignedIn } = useAuth()
	const app = useMaybeApp()
	const navigate = useNavigate()
	const name = useGetFileName()

	const handleCopy = async () => {
		if (!app) return
		const res = await app.createFile({
			name,
			createSource: window.location.pathname.slice(1),
		})
		onClose()
		if (res?.ok) {
			const { file } = res.value
			navigate(routes.tlaFile(file.id))
			trackEvent('create-file', { source: 'legacy-import-button' })
		}
	}

	return (
		<div className={styles.dialog}>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>
					<F defaultMessage="This room is now read-only" />
				</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody>
				<p>
					{isSignedIn ? (
						<F defaultMessage="To continue editing please copy the room to your files." />
					) : (
						<F defaultMessage="This anonymous tldraw multiplayer room is now read-only. To continue editing, please sign in and copy it to your files." />
					)}
				</p>
			</TldrawUiDialogBody>
			<TldrawUiDialogFooter className={styles.footer}>
				{isSignedIn && (
					<TldrawUiButton type="primary" onClick={handleCopy}>
						<TldrawUiButtonLabel>
							<F defaultMessage="Copy to my files" />
						</TldrawUiButtonLabel>
					</TldrawUiButton>
				)}
				<TldrawUiButton type="normal" onClick={onClose} onTouchEnd={onClose}>
					<TldrawUiButtonLabel>
						<F defaultMessage="Close" />
					</TldrawUiButtonLabel>
				</TldrawUiButton>
			</TldrawUiDialogFooter>
		</div>
	)
}

export function SneakyLegacyModal() {
	const { addDialog, removeDialog } = useDialogs()
	const location = useLocation()
	const { isSignedIn } = useAuth()
	const [searchParams, setSearchParams] = useSearchParams()
	const app = useMaybeApp()

	useEffect(() => {
		if (!location.pathname.startsWith(`/${ROOM_PREFIX}/`)) {
			return
		}

		const id = addDialog({
			component: ({ onClose }) => <LegacyChangesModal onClose={onClose} />,
			preventBackgroundClose: true,
		})
		return () => {
			removeDialog(id)
		}
	}, [addDialog, removeDialog, location.pathname, searchParams, isSignedIn, setSearchParams, app])
	return null
}
