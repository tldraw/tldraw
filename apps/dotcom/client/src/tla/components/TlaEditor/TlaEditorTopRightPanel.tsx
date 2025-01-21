import { SignInButton } from '@clerk/clerk-react'
import { TlaFileOpenState } from '@tldraw/dotcom-shared'
import classNames from 'classnames'
import { useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
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
				<PeopleMenu displayUserWhenAlone={false} />
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
			<PeopleMenu displayUserWhenAlone={false} />
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

function LegacyImportButton() {
	const trackEvent = useTldrawAppUiEvents()
	const app = useMaybeApp()
	const editor = useEditor()
	const navigate = useNavigate()
	const name = useGetFileName()

	const handleClick = useCallback(() => {
		if (!app || !editor) return

		const res = app.createFile({ name })
		if (res.ok) {
			const { file } = res.value
			const snapshot = editor.getSnapshot()
			navigate(routes.tlaFile(file.id), {
				state: { mode: 'slurp-legacy-file', snapshot } satisfies TlaFileOpenState,
			})
			trackEvent('create-file', { source: 'legacy-import-button' })
		}
	}, [app, editor, name, navigate, trackEvent])

	return (
		<TlaCtaButton data-testid="tla-import-button" onClick={handleClick}>
			<F defaultMessage="Copy to my files" />
		</TlaCtaButton>
	)
}
