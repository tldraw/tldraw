import { useCallback, useRef, useState } from 'react'
import {
	DEFAULT_MAX_ASSET_SIZE,
	getFromLocalStorage,
	setInLocalStorage,
	useDialogs,
	useEditor,
	useOnMount,
} from 'tldraw'
import { BigDocIcon } from './BigDocIcon'
import {
	ACKNOWLEDGEMENT_EXPIRY_MS,
	CHECK_INTERVAL_MS,
	LOCAL_STORAGE_KEY_FILESIZE,
	LOCAL_STORAGE_KEY_SESSION,
	MAX_SESSION_TIME_MS,
} from './constants'
import { LargeFileDialog, SessionTimeDialog } from './dialogs'
import styles from './LocalFileHandler.module.css'
import { OldDocIcon } from './OldDocIcon'

enum LocalFileState {
	LARGE = 'LARGE',
	LONG_SESSION = 'LONG_SESSION',
	NONE = '',
}

export function LocalFileHandler() {
	const isMounted = useRef(false)
	const intervalRef = useRef<number | undefined>(undefined)
	const mountTime = useRef(0)
	const [localFileState, setLocalFileState] = useState<LocalFileState>(LocalFileState.NONE)
	const editor = useEditor()

	const handleFileSizeAcknowledged = useCallback(() => {
		setLocalFileState(LocalFileState.NONE)
		setInLocalStorage(LOCAL_STORAGE_KEY_FILESIZE, Date.now().toString())
	}, [])

	const handleTimeSessionAcknowledged = useCallback(() => {
		setLocalFileState(LocalFileState.NONE)
		setInLocalStorage(LOCAL_STORAGE_KEY_SESSION, Date.now().toString())
	}, [])

	const handleShapesChecked = useCallback(async () => {
		if (!isMounted.current) return

		const pages = editor.getPages()
		const maxShapes = 0.9 * editor.options.maxShapesPerPage
		const totalShapes = pages.reduce((sum, page) => sum + editor.getPageShapeIds(page).size, 0)
		const lastFileSizeAcknowledged = Number(getFromLocalStorage(LOCAL_STORAGE_KEY_FILESIZE) ?? '0')
		const lastTimeSessionAcknowledged = Number(
			getFromLocalStorage(LOCAL_STORAGE_KEY_SESSION) ?? '0'
		)

		if (Date.now() - lastFileSizeAcknowledged > ACKNOWLEDGEMENT_EXPIRY_MS) {
			const totalAssetsSizeInMB = editor.getAssets().reduce((acc, asset) => {
				if (asset.type === 'image' || asset.type === 'video') {
					return acc + (asset.props.fileSize ?? 0)
				}
				return acc
			}, 0)

			if (totalShapes > maxShapes || totalAssetsSizeInMB > DEFAULT_MAX_ASSET_SIZE) {
				setLocalFileState(LocalFileState.LARGE)
				// file size has more weight than session time and return early
				return
			}
		}

		const timeSinceMount = Date.now()
		if (
			timeSinceMount - lastTimeSessionAcknowledged > ACKNOWLEDGEMENT_EXPIRY_MS &&
			timeSinceMount - mountTime.current > MAX_SESSION_TIME_MS
		) {
			setLocalFileState(LocalFileState.LONG_SESSION)
			return
		}

		setLocalFileState(LocalFileState.NONE)
	}, [editor])

	useOnMount(() => {
		isMounted.current = true
		mountTime.current = Date.now()

		handleShapesChecked()

		intervalRef.current = window.setInterval(() => {
			if (!isMounted.current) return
			handleShapesChecked()
		}, CHECK_INTERVAL_MS)

		return () => {
			isMounted.current = false
			clearInterval(intervalRef.current)
		}
	})

	return localFileState === LocalFileState.LARGE ? (
		<BigDocIndicator onClose={handleFileSizeAcknowledged} />
	) : localFileState === LocalFileState.LONG_SESSION ? (
		<SessionTimeIndicator onClose={handleTimeSessionAcknowledged} />
	) : null
}

function BigDocIndicator({ onClose }: { onClose(): void }) {
	const { addDialog } = useDialogs()

	const handleClick = useCallback(() => {
		addDialog({
			id: 'large-file-warning',
			onClose: onClose,
			component: ({ onClose }) => <LargeFileDialog onClose={onClose} />,
		})
	}, [onClose, addDialog])

	return (
		<button
			onClick={handleClick}
			aria-label="File size warning - open for details"
			className={styles.indicatorButton}
			data-testid="tldraw-large-file-indicator"
		>
			<BigDocIcon />
		</button>
	)
}

function SessionTimeIndicator({ onClose }: { onClose(): void }) {
	const { addDialog } = useDialogs()

	const handleClick = useCallback(() => {
		addDialog({
			id: 'session-time-warning',
			onClose: onClose,
			component: ({ onClose }) => <SessionTimeDialog onClose={onClose} />,
		})
	}, [onClose, addDialog])

	return (
		<button
			onClick={handleClick}
			className={styles.indicatorButton}
			aria-label="Session time warning - open for details"
			data-testid="tldraw-session-time-indicator"
		>
			<OldDocIcon />
		</button>
	)
}
