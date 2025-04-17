import { SignInButton } from '@clerk/clerk-react'
import {
	PUBLISH_PREFIX,
	READ_ONLY_LEGACY_PREFIX,
	READ_ONLY_PREFIX,
	ROOM_PREFIX,
	SNAPSHOT_PREFIX,
} from '@tldraw/dotcom-shared'
import classNames from 'classnames'
import { useCallback, useRef } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { PeopleMenu, useEditor, usePassThroughWheelEvents, useTranslation } from 'tldraw'
import { routes } from '../../../routeDefs'
import { useMaybeApp } from '../../hooks/useAppState'
import { useCurrentFileId } from '../../hooks/useCurrentFileId'
import { useTldrawAppUiEvents } from '../../utils/app-ui-events'
import { F } from '../../utils/i18n'
import { TlaCtaButton } from '../TlaCtaButton/TlaCtaButton'
import { TlaFileShareMenu } from '../TlaFileShareMenu/TlaFileShareMenu'
import { TlaSignedOutShareButton } from '../TlaSignedOutShareButton/TlaSignedOutShareButton'
import styles from './top.module.css'

export function TlaEditorTopRightPanel({
	isAnonUser,
	context,
}: {
	isAnonUser: boolean
	context: 'file' | 'published-file' | 'scratch' | 'legacy'
}) {
	const ref = useRef<HTMLDivElement>(null)
	usePassThroughWheelEvents(ref)
	const fileId = useCurrentFileId()
	const trackEvent = useTldrawAppUiEvents()

	if (isAnonUser) {
		return (
			<div ref={ref} className={classNames(styles.topRightPanel)}>
				<PeopleMenu />
				<TlaSignedOutShareButton fileId={fileId} context={context} />
				<SignInButton
					mode="modal"
					forceRedirectUrl={location.pathname + location.search}
					signUpForceRedirectUrl={location.pathname + location.search}
				>
					<TlaCtaButton
						data-testid="tla-sign-up"
						onClick={() => trackEvent('open-share-menu', { source: 'anon-landing-page' })}
					>
						<F defaultMessage="Sign in" />
					</TlaCtaButton>
				</SignInButton>
			</div>
		)
	}

	return (
		<div ref={ref} className={styles.topRightPanel}>
			<PeopleMenu />
			{context === 'legacy' && <LegacyImportButton />}
			<TlaFileShareMenu fileId={fileId!} source="file-header" context={context}>
				<TlaCtaButton
					data-testid="tla-share-button"
					onClick={() => trackEvent('open-share-menu', { source: 'top-bar' })}
				>
					<F defaultMessage="Share" />
				</TlaCtaButton>
			</TlaFileShareMenu>
		</div>
	)
}

function useGetFileName() {
	const editor = useEditor()
	const msg = useTranslation()
	const defaultPageName = msg('page-menu.new-page-initial-name')

	const documentName = editor.getDocumentSettings().name
	if (documentName?.length > 0) return documentName

	const firstPageName = editor.getPages()[0].name
	if (
		firstPageName.length > 0 &&
		!firstPageName.startsWith('Page 1') &&
		!firstPageName.startsWith(defaultPageName)
	)
		return firstPageName
	return ''
}

function usePrefix() {
	const location = useLocation()
	const roomPrefix = location.pathname.split('/')[1]
	switch (roomPrefix) {
		case ROOM_PREFIX:
		case READ_ONLY_PREFIX:
		case READ_ONLY_LEGACY_PREFIX:
		case SNAPSHOT_PREFIX:
		case PUBLISH_PREFIX:
			return roomPrefix
	}
	return null
}

export function useRoomInfo() {
	const id = useParams()['roomId'] as string
	const prefix = usePrefix()
	if (!id || !prefix) return null
	return { prefix, id }
}

function LegacyImportButton() {
	const trackEvent = useTldrawAppUiEvents()
	const app = useMaybeApp()
	const editor = useEditor()
	const navigate = useNavigate()
	const name = useGetFileName()
	const roomInfo = useRoomInfo()

	const handleClick = useCallback(async () => {
		if (!app || !editor || !roomInfo) return

		const { prefix, id } = roomInfo
		const res = await app.createFile({ name, createSource: `${prefix}/${id}` })
		if (res.ok) {
			const { file } = res.value
			navigate(routes.tlaFile(file.id))
			trackEvent('create-file', { source: 'legacy-import-button' })
		}
	}, [app, editor, name, navigate, roomInfo, trackEvent])

	return (
		<TlaCtaButton data-testid="tla-import-button" onClick={handleClick}>
			<F defaultMessage="Copy to my files" />
		</TlaCtaButton>
	)
}
