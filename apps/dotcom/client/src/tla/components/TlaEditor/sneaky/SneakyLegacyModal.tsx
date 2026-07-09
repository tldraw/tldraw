import { useAuth } from '@clerk/clerk-react'
import { ROOM_PREFIX } from '@tldraw/dotcom-shared'
import {
	TlButton,
	TlButtonLabel,
	TlDialogBody,
	TlDialogCloseButton,
	TlDialogFooter,
	TlDialogHeader,
	TlDialogTitle,
} from '@tldraw/ui'
import { useEffect } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useDialogs } from 'tldraw'
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
			const { fileId } = res.value
			navigate(routes.tlaFile(fileId))
			trackEvent('create-file', { source: 'legacy-import-button' })
		}
	}

	return (
		<div className={styles.dialog}>
			<TlDialogHeader>
				<TlDialogTitle>
					<F defaultMessage="This file is now read-only" />
				</TlDialogTitle>
				<TlDialogCloseButton />
			</TlDialogHeader>
			<TlDialogBody>
				<p>
					{isSignedIn ? (
						<F defaultMessage="To continue editing please copy the file to your files." />
					) : (
						<F defaultMessage="This anonymous tldraw multiplayer file is now read-only. To continue editing, please sign in and copy it to your files." />
					)}
				</p>
			</TlDialogBody>
			<TlDialogFooter className={styles.footer}>
				{isSignedIn && (
					<TlButton type="primary" onClick={handleCopy}>
						<TlButtonLabel>
							<F defaultMessage="Copy to personal workspace" />
						</TlButtonLabel>
					</TlButton>
				)}
				<TlButton type="normal" onClick={onClose} onTouchEnd={onClose}>
					<TlButtonLabel>
						<F defaultMessage="Close" />
					</TlButtonLabel>
				</TlButton>
			</TlDialogFooter>
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
