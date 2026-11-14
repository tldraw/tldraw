import {
	commentsSidebarOpen,
	toggleCommentsSidebar,
	useCommentingEnabled,
	useCommentsSidebarOpen,
} from '@tldraw/commenting'
import classNames from 'classnames'
import { useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
	defineMessages,
	F,
	PeopleMenu,
	TldrawUiButton,
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	TldrawUiMenuCheckboxItem,
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	useDialogs,
	useEditor,
	usePassThroughWheelEvents,
	useTranslation,
	useValue,
} from 'tldraw'
import { routes } from '../../../routeDefs'
import { useMaybeApp } from '../../hooks/useAppState'
import { useCurrentFileId } from '../../hooks/useCurrentFileId'
import { useIsCommentingEnabledForUser } from '../../hooks/useIsCommentingEnabled'
import { useIsUiV3 } from '../../hooks/useIsUiV3'
import { useGetFileName, useRoomInfo } from '../../hooks/useRoomInfo'
import { useTldrawAppUiEvents } from '../../utils/app-ui-events'
import { DesignSwitch, designSwitches } from '../../utils/designSwitches'
import { TlaSignInDialog } from '../dialogs/TlaSignInDialog'
import { TLA_MENU_POSITION } from '../tla-menu/tla-menu-position'
import { TlaCtaButton } from '../TlaCtaButton/TlaCtaButton'
import { TlaFileShareMenu } from '../TlaFileShareMenu/TlaFileShareMenu'
import { TlaIcon } from '../TlaIcon/TlaIcon'
import styles from './top.module.css'

const ctaMessages = defineMessages({
	signInToShare: { defaultMessage: 'Sign in to share' },
})

const commentsMessages = defineMessages({
	comments: { defaultMessage: 'Comments' },
})

type TopRightPanelContext = 'file' | 'published-file' | 'scratch' | 'legacy'

export function TlaEditorTopRightPanel({
	isAnonUser,
	context,
}: {
	isAnonUser: boolean
	context: TopRightPanelContext
}) {
	const msg = useTranslation()
	const ref = useRef<HTMLDivElement>(null)
	usePassThroughWheelEvents(ref)
	const fileId = useCurrentFileId()
	const trackEvent = useTldrawAppUiEvents()
	const { addDialog } = useDialogs()
	const editor = useEditor()
	// Share and the comments sidebar are mutually exclusive: opening share closes the sidebar.
	// (The reverse is automatic — clicking the sidebar button dismisses the share popover as an
	// outside interaction.)
	const closeSidebarOnShareOpen = useCallback(
		(isOpen: boolean) => {
			if (isOpen) commentsSidebarOpen.set(editor, false)
		},
		[editor]
	)

	if (isAnonUser) {
		return (
			<div ref={ref} className={styles.topRightPanel}>
				<PeopleMenu />
				<SignedOutShareButton fileId={fileId} context={context} />
				<TlaCtaButton
					canvas
					data-testid="tla-sign-in-button"
					onClick={() => {
						trackEvent('sign-up-clicked', {
							source: 'anon-landing-page',
							ctaMessage: msg(ctaMessages.signInToShare),
						})
						addDialog({ component: TlaSignInDialog })
					}}
				>
					<F {...ctaMessages.signInToShare} />
				</TlaCtaButton>
			</div>
		)
	}

	return (
		<div ref={ref} className={styles.topRightPanel}>
			<DesignSwitchesMenu />
			<PeopleMenu />
			{/* Only file editors mount the comments sidebar (see TlaEditor); in legacy and published
			    contexts this button would toggle state nothing reads. */}
			{context !== 'legacy' && context !== 'published-file' && <CommentsSidebarButton />}
			{context === 'legacy' && <LegacyImportButton />}
			{context !== 'legacy' && (
				<TlaFileShareMenu
					fileId={fileId!}
					source="file-header"
					context={context}
					onOpenChange={closeSidebarOnShareOpen}
				>
					<TlaCtaButton
						canvas
						data-testid="tla-share-button"
						onClick={() => trackEvent('open-share-menu', { source: 'top-bar' })}
					>
						<F defaultMessage="Share" />
					</TlaCtaButton>
				</TlaFileShareMenu>
			)}
		</div>
	)
}

/**
 * Toggles the comments sidebar (the thread list) open and closed. Lives next to Share as an opt-in
 * entry point, decoupled from the comment tool: the tool places comments on the canvas, this button
 * reveals the list. Hidden entirely when commenting isn't licensed for this editor, or when the
 * viewer is signed out.
 */
function CommentsSidebarButton() {
	const msg = useTranslation()
	const editor = useEditor()
	const trackEvent = useTldrawAppUiEvents()
	const commentingEnabled = useCommentingEnabled()
	const commentingEnabledForUser = useIsCommentingEnabledForUser()
	const open = useCommentsSidebarOpen()
	const label = msg(commentsMessages.comments)

	if (!commentingEnabled || !commentingEnabledForUser) return null

	return (
		<TldrawUiButton
			type="icon"
			className={styles.topRightIconButton}
			data-testid="tla-comments-button"
			aria-pressed={open}
			tooltip={label}
			title={label}
			onClick={() => {
				toggleCommentsSidebar(editor)
				trackEvent('toggle-comments-sidebar', { source: 'comments', open: !open })
			}}
		>
			<TlaIcon icon="comment" />
		</TldrawUiButton>
	)
}

/** The beaker: v3 design switches, for `ui_v3` users only. See `designSwitches`. */
function DesignSwitchesMenu() {
	const isUiV3 = useIsUiV3()
	if (!isUiV3) return null

	return (
		<TldrawUiDropdownMenuRoot id="design-switches">
			<TldrawUiMenuContextProvider type="menu" sourceId="menu">
				<TldrawUiDropdownMenuTrigger>
					<TldrawUiButton
						type="icon"
						className={styles.topRightIconButton}
						data-testid="tla-design-switches-button"
						tooltip="Design switches"
						title="Design switches"
					>
						<TlaIcon icon="beaker" />
					</TldrawUiButton>
				</TldrawUiDropdownMenuTrigger>
				<TldrawUiDropdownMenuContent side="bottom" align="end" {...TLA_MENU_POSITION}>
					<TldrawUiMenuGroup id="design-switches">
						{Object.values(designSwitches).map((designSwitch) => (
							<DesignSwitchItem key={designSwitch.id} designSwitch={designSwitch} />
						))}
					</TldrawUiMenuGroup>
				</TldrawUiDropdownMenuContent>
			</TldrawUiMenuContextProvider>
		</TldrawUiDropdownMenuRoot>
	)
}

function DesignSwitchItem({ designSwitch }: { designSwitch: DesignSwitch }) {
	const checked = useValue(designSwitch.value)
	return (
		<TldrawUiMenuCheckboxItem
			id={`design-switch-${designSwitch.id}`}
			label={designSwitch.label}
			checked={checked}
			onSelect={() => {
				designSwitch.value.set(!checked)
			}}
			readonlyOk
		/>
	)
}

function LegacyImportButton() {
	const trackEvent = useTldrawAppUiEvents()
	const app = useMaybeApp()
	const navigate = useNavigate()
	const name = useGetFileName()
	const roomInfo = useRoomInfo()

	const handleClick = useCallback(async () => {
		if (!app || !roomInfo) return

		const { prefix, id } = roomInfo
		const res = await app.createFile({ name, createSource: `${prefix}/${id}` })
		if (res.ok) {
			const { fileId } = res.value
			navigate(routes.tlaFile(fileId))
			trackEvent('create-file', { source: 'legacy-import-button' })
		}
	}, [app, name, navigate, roomInfo, trackEvent])

	return (
		<TlaCtaButton canvas data-testid="tla-import-button" onClick={handleClick}>
			<F defaultMessage="Copy to my workspace" />
		</TlaCtaButton>
	)
}

const signedOutShareMessages = defineMessages({
	share: { defaultMessage: 'Share' },
})

function SignedOutShareButton({
	fileId,
	context,
}: {
	fileId?: string
	context: TopRightPanelContext
}) {
	const msg = useTranslation()
	const trackEvent = useTldrawAppUiEvents()
	const shareLbl = msg(signedOutShareMessages.share)

	return (
		<TlaFileShareMenu fileId={fileId} context={context} source="anon">
			<TldrawUiButton
				type="icon"
				data-testid="tla-share-button"
				tooltip={shareLbl}
				title={shareLbl}
				className={classNames(styles.topRightAnonShareButton)}
				onClick={() => trackEvent('open-share-menu', { source: 'anon-top-bar' })}
			>
				<TlaIcon icon="share" />
			</TldrawUiButton>
		</TlaFileShareMenu>
	)
}
