import { captureException } from '@sentry/react'
import { CommentTool, commentToolOverrides } from '@tldraw/commenting'
import {
	ACCESS_POLICY_ID,
	accessGrantId,
	TLAccessGrant,
	TLAccessPolicy,
} from '@tldraw/dotcom-shared'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import {
	createDebugValue,
	createSessionStateSnapshotSignal,
	debugFlags,
	DefaultContextMenu,
	DefaultContextMenuContent,
	DefaultDebugMenu,
	DefaultDebugMenuContent,
	createShapeId,
	DefaultColorStyle,
	DefaultStylePanel,
	defineMessages,
	Editor,
	getColorStyleItems,
	isPageId,
	react,
	StylePanelArrowheadPicker,
	StylePanelArrowKindPicker,
	StylePanelButtonPicker,
	StylePanelDashPicker,
	StylePanelFillPicker,
	StylePanelFontPicker,
	StylePanelGeoShapePicker,
	StylePanelLabelAlignPicker,
	StylePanelOpacityPicker,
	StylePanelSection,
	StylePanelSizePicker,
	StylePanelSplinePicker,
	StylePanelTextAlignPicker,
	throttle,
	TLAsset,
	TldrawUiButton,
	TldrawUiButtonLabel,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogFooter,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	TldrawUiIcon,
	TLBinding,
	TLComponents,
	Tldraw,
	TldrawUiMenuItem,
	TLPage,
	TLParentId,
	TLRecordChange,
	TLRefusal,
	TLSessionStateSnapshot,
	TLShape,
	tltime,
	TLUiDialogsContextType,
	TLUiStylePanelProps,
	useAtom,
	useDialogs,
	useEditor,
	useEvent,
	useStylePanelContext,
	useToasts,
	useTranslation,
	useValue,
} from 'tldraw'
import { SneakyMermaidHandler } from '../../../components/SneakyMermaidHandler/SneakyMermaidHandler'
import { ThemeUpdater } from '../../../components/ThemeUpdater/ThemeUpdater'
import { useOpenUrlAndTrack } from '../../../hooks/useOpenUrlAndTrack'
import { usePerformanceTracking } from '../../../hooks/usePerformanceTracking'
import {
	boardSizeFields,
	estimateFileSizeBucket,
	useRoomLoadTracking,
} from '../../../hooks/useRoomLoadTracking'
import { trackEvent, useHandleUiEvents } from '../../../utils/analytics'
import { assetUrls } from '../../../utils/assetUrls'
import { createAssetFromUrl } from '../../../utils/createAssetFromUrl'
import { embedShapeUtils } from '../../../utils/embedShapeUtil'
import { reportFileLoad } from '../../../utils/fileLoad'
import { markFirstLoad, reportFirstLoad } from '../../../utils/firstLoad'
import { globalEditor } from '../../../utils/globalEditor'
import { LOADS_DEBUG_FLAG } from '../../../utils/loadTracker'
import { TldrawApp } from '../../app/TldrawApp'
import { useMaybeApp } from '../../hooks/useAppState'
import { useIsCommentingEnabled } from '../../hooks/useIsCommentingEnabled'
import { ReadyWrapper, useSetIsReady } from '../../hooks/useIsReady'
import { useNewRoomCreationTracking } from '../../hooks/useNewRoomCreationTracking'
import { useShareLinkOpenTracking } from '../../hooks/useShareLinkOpenTracking'
import { maybeSlurp } from '../../utils/slurping'
import { getPolicy } from '../../utils/student-restrictions'
import { TlaAnonDotDevLink } from '../TlaAnonDotDevLink/TlaAnonDotDevLink'
import {
	TlaAddToCollectionMenuItem,
	TlaCollectionsPanel,
} from '../TlaCollections/TlaCollectionsPanel'
import { CommentsOnCanvas, SignInToComment, useAnonCommentToolOverrides } from './CommentsOnCanvas'
import { TlaEditorErrorFallback } from './editor-components/TlaEditorErrorFallback'
import { TlaEditorMenuPanel } from './editor-components/TlaEditorMenuPanel'
import { TlaEditorSharePanel } from './editor-components/TlaEditorSharePanel'
import { TlaEditorTopPanel } from './editor-components/TlaEditorTopPanel'
import { SneakyCommentDeepLink } from './sneaky/SneakyCommentDeepLink'
import { SneakyDarkModeSync } from './sneaky/SneakyDarkModeSync'
import { SneakyDebugModeToast } from './sneaky/SneakyDebugModeToast'
import { SneakyTldrawFileDropHandler } from './sneaky/SneakyFileDropHandler'
import { SneakyLargeFileHander } from './sneaky/SneakyLargeFileHandler'
import { SneakySetDocumentTitle } from './sneaky/SneakySetDocumentTitle'
import { SneakyToolSwitcher } from './sneaky/SneakyToolSwitcher'
import { A11yAudit } from './TlaDebug'
import { TlaEditorWrapper } from './TlaEditorWrapper'
import { useFileLoad, useFileSyncStore } from './TlaFileSyncHost'
import { useExtraDragIconOverrides } from './useExtraToolDragIcons'
import { useFileEditorOverrides } from './useFileEditorOverrides'

const messages = defineMessages({
	slurpFailed: {
		defaultMessage: 'Could not restore your local drawing. Try reloading this page.',
	},
	fileHistory: { defaultMessage: 'File history' },
	studentsCanEditAll: { defaultMessage: 'Students can edit everything' },
	sharePage: { defaultMessage: 'Show only this page to students' },
	redOnly: { defaultMessage: 'Only red shapes' },
	color: { defaultMessage: 'Color' },
	refusedTitle: { defaultMessage: 'Change not saved' },
	ok: { defaultMessage: 'OK' },
	blockedHeading: { defaultMessage: 'Things that will fail' },
	tryPolicy: { defaultMessage: 'Change the permissions' },
	tryOtherPage: { defaultMessage: "Edit the teacher's page" },
	tryBlue: { defaultMessage: 'Add a blue shape' },
	tryRecolour: { defaultMessage: 'One shape red, one blue' },
	refusedCount: { defaultMessage: 'Refused' },
	revertedCount: { defaultMessage: 'Reverted' },
})

// Composing needs a signed-in author and an editable canvas. Signed-out visitors on an
// editable canvas get a sign-in prompt where the composers would be; view-only sessions
// read threads without composers (the server rejects their writes in the authorizers).
const tlaCommentTools = [
	CommentTool.configure({
		canComment: ({ editor, currentUserId }) => currentUserId !== null && !editor.getIsReadonly(),
		components: { ComposerFallback: SignInToComment },
	}),
]

/** @internal */
export const components: TLComponents = {
	ErrorFallback: TlaEditorErrorFallback,
	MenuPanel: TlaEditorMenuPanel,
	TopPanel: TlaEditorTopPanel,
	SharePanel: TlaEditorSharePanel,
	Dialogs: null,
	Toasts: null,
	// No loading screen on tla editors: the editor only mounts once it's ready,
	// so a spinner would only flash before the content appears.
	LoadingScreen: null,
}

interface TlaEditorProps {
	fileSlug: string
	isEmbed?: boolean
	deepLinks?: boolean
}

export function TlaEditor(props: TlaEditorProps) {
	// force re-mount when the file slug changes to prevent state from leaking between files
	return (
		<>
			<SneakySetDocumentTitle />
			<ReadyWrapper key={props.fileSlug}>
				<TlaEditorInner {...props} key={props.fileSlug} />
			</ReadyWrapper>
		</>
	)
}

// SPIKE: a restricted student can only use red, so the colour picker offers only red.
function RedOnlyColorPicker() {
	const editor = useEditor()
	const msg = useTranslation()
	const { styles } = useStylePanelContext()
	const items = useValue(
		'red-only color items',
		() =>
			getColorStyleItems(editor.getCurrentTheme().colors[editor.getColorMode()]).filter(
				(item) => item.value === 'red'
			),
		[editor]
	)
	const color = styles.get(DefaultColorStyle)
	if (color === undefined) return null
	return (
		<StylePanelButtonPicker
			title={msg(messages.color)}
			uiType="color"
			style={DefaultColorStyle}
			items={items}
			value={color}
		/>
	)
}

// SPIKE: the default style panel with the colour picker swapped for the red-only one.
function RestrictedStylePanel(props: TLUiStylePanelProps) {
	return (
		<DefaultStylePanel {...props}>
			<StylePanelSection>
				<RedOnlyColorPicker />
				<StylePanelOpacityPicker />
			</StylePanelSection>
			<StylePanelSection>
				<StylePanelFillPicker />
				<StylePanelDashPicker />
				<StylePanelSizePicker />
			</StylePanelSection>
			<StylePanelSection>
				<StylePanelFontPicker />
				<StylePanelTextAlignPicker />
				<StylePanelLabelAlignPicker />
			</StylePanelSection>
			<StylePanelSection>
				<StylePanelGeoShapePicker />
				<StylePanelArrowKindPicker />
				<StylePanelArrowheadPicker />
				<StylePanelSplinePicker />
			</StylePanelSection>
		</DefaultStylePanel>
	)
}

function putPolicy(
	editor: Editor,
	change: Partial<Pick<TLAccessPolicy, 'studentsCanEditAll' | 'studentsRedOnly' | 'studentPages'>>
) {
	const current = getPolicy(editor.store)
	editor.run(
		() =>
			editor.store.put([
				{
					id: ACCESS_POLICY_ID,
					typeName: 'access-policy',
					studentsCanEditAll: false,
					studentPages: [],
					meta: {},
					...current,
					...change,
				} as any,
			]),
		{ history: 'ignore' }
	)
}

// SPIKE: the dialog shown when the server refuses a change.
function RefusedDialog({ refusal, onClose }: { refusal: TLRefusal; onClose(): void }) {
	const msg = useTranslation()
	const refused = refusal.ids?.length ?? 0
	const changes = refusal.changes
	const reverted = changes
		? Object.keys(changes.added).length +
			Object.keys(changes.updated).length +
			Object.keys(changes.removed).length
		: 0
	const summary = [
		msg(messages.refusedCount),
		': ',
		refused,
		'. ',
		msg(messages.revertedCount),
		': ',
		reverted,
		'.',
	].join('')
	return (
		<>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>{msg(messages.refusedTitle)}</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody style={{ maxWidth: 350 }}>
				<div>{refusal.reason}</div>
				<div>{summary}</div>
			</TldrawUiDialogBody>
			<TldrawUiDialogFooter className="tlui-dialog__footer__actions">
				<TldrawUiButton type="primary" onClick={onClose}>
					<TldrawUiButtonLabel>{msg(messages.ok)}</TldrawUiButtonLabel>
				</TldrawUiButton>
			</TldrawUiDialogFooter>
		</>
	)
}

// SPIKE: opens the dialog for every refusal the server sends back.
function ShowRefusals() {
	const editor = useEditor()
	const { addDialog } = useDialogs()
	useEffect(() => {
		const onRefused = (refusal: TLRefusal) => {
			addDialog({
				id: 'refused-dialog',
				component: ({ onClose }) => <RefusedDialog refusal={refusal} onClose={onClose} />,
			})
		}
		editor.on('refused', onRefused)
		return () => void editor.off('refused', onRefused)
	}, [editor, addDialog])
	return null
}

// SPIKE: for a restricted student, buttons that try things the server will refuse. They write
// straight to the store, past the editor's own checks, so the server has to say no.
function TryBlockedActions({ grantId }: { grantId: string }) {
	const editor = useEditor()
	const msg = useTranslation()
	const isRestrictedStudent = useValue(
		'isRestrictedStudent',
		() =>
			(editor.store.get(grantId as any) as unknown as TLAccessGrant | undefined)?.role !==
				'teacher' && getPolicy(editor.store)?.studentsCanEditAll !== true,
		[editor, grantId]
	)
	const redOnly = useValue('redOnly', () => getPolicy(editor.store)?.studentsRedOnly === true, [
		editor,
	])
	if (!isRestrictedStudent) return null

	const tryPolicy = () => putPolicy(editor, { studentsCanEditAll: true })
	const tryOtherPage = () => {
		const shared = getPolicy(editor.store)?.studentPages ?? []
		const shape = editor.store.allRecords().find((record) => {
			if (record.typeName !== 'shape') return false
			const pageId = editor.getAncestorPageId(record as TLShape)
			return !!pageId && !shared.includes(pageId)
		})
		if (shape) editor.store.put([{ ...shape, x: (shape as TLShape).x + 10 } as TLShape])
	}
	// One change, two shapes: one goes to red (the rule accepts it), one to blue (it refuses it).
	// The room judges the whole change, so both are reverted.
	const tryRecolour = () => {
		const shapes = editor.getCurrentPageShapes().filter((shape) => 'color' in shape.props) as Array<
			TLShape & { props: { color: string } }
		>
		const toRed = shapes.find((shape) => shape.props.color !== 'red')
		const toBlue = shapes.find((shape) => shape !== toRed && shape.props.color !== 'blue')
		if (!toRed || !toBlue) return
		editor.store.put([
			{ ...toRed, props: { ...toRed.props, color: 'red' } },
			{ ...toBlue, props: { ...toBlue.props, color: 'blue' } },
		] as TLShape[])
	}
	const tryBlue = () => {
		const parentId = editor.getCurrentPageId()
		editor.store.put([
			{
				id: createShapeId(),
				typeName: 'shape',
				type: 'geo',
				x: 100,
				y: 100,
				rotation: 0,
				isLocked: false,
				opacity: 1,
				meta: {},
				parentId,
				index: editor.getHighestIndexForParent(parentId),
				props: { ...editor.getShapeUtil('geo').getDefaultProps(), color: 'blue' },
			} as TLShape,
		])
	}

	return (
		<div
			style={{
				position: 'absolute',
				top: 8,
				left: '50%',
				transform: 'translateX(-50%)',
				display: 'flex',
				flexDirection: 'column',
				minWidth: 240,
				padding: 4,
				borderRadius: 'var(--tl-radius-3)',
				background: 'var(--tl-color-panel)',
				boxShadow: 'var(--tl-shadow-2)',
				pointerEvents: 'all',
				zIndex: 'var(--tl-layer-canvas-in-front)' as any,
			}}
			onPointerDown={(e) => e.stopPropagation()}
		>
			<div
				style={{
					padding: '8px 12px 4px',
					font: '500 12px var(--tl-font-sans)',
					color: 'var(--tl-color-text-3)',
				}}
			>
				{msg(messages.blockedHeading)}
			</div>
			<TldrawUiButton type="menu" onClick={tryPolicy}>
				<TldrawUiButtonLabel>{msg(messages.tryPolicy)}</TldrawUiButtonLabel>
			</TldrawUiButton>
			<TldrawUiButton type="menu" onClick={tryOtherPage}>
				<TldrawUiButtonLabel>{msg(messages.tryOtherPage)}</TldrawUiButtonLabel>
			</TldrawUiButton>
			{redOnly && (
				<TldrawUiButton type="menu" onClick={tryRecolour}>
					<TldrawUiButtonLabel>{msg(messages.tryRecolour)}</TldrawUiButtonLabel>
				</TldrawUiButton>
			)}
			{redOnly && (
				<TldrawUiButton type="menu" onClick={tryBlue}>
					<TldrawUiButtonLabel>{msg(messages.tryBlue)}</TldrawUiButtonLabel>
				</TldrawUiButton>
			)}
		</div>
	)
}

// SPIKE: one row of the teacher's panel, in tldraw's own menu button style.
function PolicyOption({
	label,
	checked,
	onChange,
}: {
	label: string
	checked: boolean
	onChange(next: boolean): void
}) {
	return (
		<TldrawUiButton type="menu" onClick={() => onChange(!checked)}>
			<TldrawUiIcon small label={label} icon={checked ? 'toggle-on' : 'toggle-off'} />
			<TldrawUiButtonLabel>{label}</TldrawUiButtonLabel>
		</TldrawUiButton>
	)
}

// SPIKE: shown to teachers only; controls what students may do.
function TeacherEditingToggle({ grantId }: { grantId: string }) {
	const editor = useEditor()
	const msg = useTranslation()
	const isTeacher = useValue(
		'isTeacher',
		() =>
			(editor.store.get(grantId as any) as unknown as TLAccessGrant | undefined)?.role ===
			'teacher',
		[editor, grantId]
	)
	const policy = useValue('policy', () => getPolicy(editor.store), [editor])
	const pageShared = useValue(
		'currentPageShared',
		() => !!getPolicy(editor.store)?.studentPages.includes(editor.getCurrentPageId()),
		[editor]
	)
	if (!isTeacher) return null
	return (
		<div
			style={{
				position: 'absolute',
				top: 8,
				left: '50%',
				transform: 'translateX(-50%)',
				display: 'flex',
				flexDirection: 'column',
				minWidth: 240,
				padding: 4,
				borderRadius: 'var(--tl-radius-3)',
				background: 'var(--tl-color-panel)',
				boxShadow: 'var(--tl-shadow-2)',
				pointerEvents: 'all',
				zIndex: 'var(--tl-layer-canvas-in-front)' as any,
			}}
			onPointerDown={(e) => e.stopPropagation()}
		>
			<PolicyOption
				label={msg(messages.sharePage)}
				checked={pageShared}
				// students get exactly one page: this one, or none
				onChange={(next) =>
					putPolicy(editor, { studentPages: next ? [editor.getCurrentPageId()] : [] })
				}
			/>
			<PolicyOption
				label={msg(messages.redOnly)}
				checked={policy?.studentsRedOnly === true}
				onChange={(next) => putPolicy(editor, { studentsRedOnly: next })}
			/>
			<PolicyOption
				label={msg(messages.studentsCanEditAll)}
				checked={policy?.studentsCanEditAll === true}
				onChange={(next) => putPolicy(editor, { studentsCanEditAll: next })}
			/>
		</div>
	)
}

function TlaEditorInner({ fileSlug, deepLinks, isEmbed = false }: TlaEditorProps) {
	const msg = useTranslation()
	const fileLoad = useFileLoad()
	fileLoad.mark('editor-rendered')
	markFirstLoad('editor-rendered')
	const handleUiEvent = useHandleUiEvents()
	const app = useMaybeApp()

	const fileId = fileSlug

	const setIsReady = useSetIsReady()
	const { addToast } = useToasts()
	const showSlurpFailure = useEvent(() => {
		addToast({
			id: 'local-file-restore-failed',
			severity: 'warning',
			title: msg(messages.slurpFailed),
			keepOpen: true,
		})
	})

	const dialogs = useDialogs()
	// need to wrap this in a useEvent to prevent the context id from changing on us
	const addDialog: TLUiDialogsContextType['addDialog'] = useEvent((dialog) =>
		dialogs.addDialog(dialog)
	)

	// We cycle this flag to cause shapes to remount when slurping images/videos fails.
	// Because in that case we want to show the failure state for the images/videos.
	// i.e. where it appears that they are not present. so the user knows which ones failed.
	// There's probably a better way of doing this but I couldn't think of one.
	const hideAllShapes = useAtom('hideAllShapes', false)
	// SPIKE: the sync server writes each session's role as an `access-grant` record and a teacher
	// writes the `access-policy` record (pages students may use, edit-everything switch).
	// Both are object-store records and arrive over sync.
	const grantId = accessGrantId(app?.userId)
	// A student is restricted until the teacher's policy says otherwise.
	const isStudentIn = useCallback(
		(editor: Editor) =>
			(editor.store.get(grantId as any) as unknown as TLAccessGrant | undefined)?.role !==
				'teacher' && getPolicy(editor.store)?.studentsCanEditAll !== true,
		[grantId]
	)
	const getShapeVisibility = useCallback(
		(shape: TLShape, editor: Editor) => {
			if (hideAllShapes.get()) return 'hidden'
			if (isStudentIn(editor)) {
				const pageId = editor.getAncestorPageId(shape)
				if (!pageId || !getPolicy(editor.store)?.studentPages.includes(pageId)) return 'hidden'
			}
			return 'inherit'
		},
		[hideAllShapes, isStudentIn]
	)
	const canChangeRecord = useCallback(
		(change: TLRecordChange<TLShape | TLPage | TLBinding | TLAsset>, editor: Editor) => {
			if (!isStudentIn(editor)) return true
			const record = change.next ?? change.prev
			const isStudentPage = (pageId: TLParentId) =>
				isPageId(pageId) && !!getPolicy(editor.store)?.studentPages.includes(pageId)
			if (record.typeName === 'page') return isStudentPage(record.id)
			if (record.typeName === 'shape') {
				// SPIKE: students only create red shapes, and may only recolour to red
				if (getPolicy(editor.store)?.studentsRedOnly === true && change.type !== 'delete') {
					const color = (record.props as { color?: string }).color
					const prevColor =
						change.type === 'update'
							? ((change.prev as TLShape).props as { color?: string }).color
							: undefined
					if ((change.type === 'create' || color !== prevColor) && color !== 'red') return false
				}
				let parent: TLParentId = record.parentId
				while (!isPageId(parent)) {
					const next: TLShape | undefined = editor.getShape(parent)
					if (!next) return true
					parent = next.parentId
				}
				return isStudentPage(parent)
			}
			if (record.typeName === 'binding') {
				const from = editor.getShape(record.fromId)
				const pageId = from && editor.getAncestorPageId(from)
				return !pageId || isStudentPage(pageId)
			}
			return true
		},
		[isStudentIn]
	)
	const remountImageShapes = useCallback(() => {
		hideAllShapes.set(true)
		requestAnimationFrame(() => {
			hideAllShapes.set(false)
		})
	}, [hideAllShapes])

	const store = useFileSyncStore()
	const isStudent = useValue(
		'isStudent',
		() =>
			store.status === 'synced-remote' &&
			(store.store.get(grantId as any) as unknown as TLAccessGrant | undefined)?.role !==
				'teacher' &&
			getPolicy(store.store)?.studentsCanEditAll !== true,
		[store, grantId]
	)

	const isRedOnlyStudent = useValue(
		'isRedOnlyStudent',
		() =>
			isStudent &&
			store.status === 'synced-remote' &&
			getPolicy(store.store)?.studentsRedOnly === true,
		[store, isStudent]
	)

	const trackRoomLoaded = useRoomLoadTracking()
	const trackNewRoomCreation = useNewRoomCreationTracking()
	const trackShareLinkOpen = useShareLinkOpenTracking()
	const trackPerformance = usePerformanceTracking()

	const handleMount = useCallback(
		(editor: Editor) => {
			markFirstLoad('editor-mounted')
			fileLoad.mark('editor-mounted')
			// SPIKE: keep a student on a page shared with them
			const stopStudentPageGuard = react('student page guard', () => {
				if (!isStudentIn(editor)) return
				// shapes can only be red, so start every new shape red
				if (getPolicy(editor.store)?.studentsRedOnly === true) {
					editor.setStyleForNextShapes(DefaultColorStyle, 'red', { history: 'ignore' })
				}
				const shared = getPolicy(editor.store)?.studentPages ?? []
				if (shared.includes(editor.getCurrentPageId())) return
				const first = editor.getPages().find((p) => shared.includes(p.id))
				if (first) editor.setCurrentPage(first.id)
			})
			trackRoomLoaded(editor)
			trackNewRoomCreation(app, fileId)
			trackShareLinkOpen(app, fileId, isEmbed)
			const cleanupPerf = trackPerformance(editor)
			;(window as any).app = app
			;(window as any).editor = editor
			// Register the editor globally
			globalEditor.set(editor)

			// Register the external asset handler
			editor.registerExternalAssetHandler('url', createAssetFromUrl)

			if (!app) {
				setIsReady()
				markFirstLoad('board-visible')
				fileLoad.mark('board-visible')
				const size = boardSizeFields(editor)
				reportFirstLoad({ email: null, flagEnabled: false, trackEvent, fileLoad, extra: size })
				reportFileLoad(fileLoad, {
					email: null,
					flagEnabled: false,
					trackEvent,
					extra: { file_size_bucket: estimateFileSizeBucket(editor), ...size },
				})
				return
			}

			const fileState = app.getFileState(fileId)
			const deepLink = new URLSearchParams(window.location.search).get('d')
			let sessionState: TLSessionStateSnapshot | null = null
			if (fileState?.lastSessionState) {
				try {
					sessionState = JSON.parse(fileState.lastSessionState.trim() || 'null')
				} catch (err) {
					// A corrupt stored session state must not take the whole board down with it.
					captureException(err, {
						tags: { operation: 'parse-session-state' },
						extra: { fileId },
					})
				}
			}
			if (sessionState && deepLink) {
				// When using a deep link, only load preferences (not camera/page states)
				// since the deep link will control navigation
				const { pageStates: _, currentPageId: _cpid, ...preferencesOnly } = sessionState
				editor.loadSnapshot({ session: preferencesOnly }, { forceOverwriteSessionState: true })
			} else if (sessionState) {
				// No deep link - load the full session state including camera position
				editor.loadSnapshot({ session: sessionState }, { forceOverwriteSessionState: true })
			}
			if (deepLink) {
				// Let the SDK parse the link: a malformed `?d=` then zooms to fit instead of
				// throwing out of onMount and replacing the board with an error page.
				editor.navigateToDeepLink()
			}
			const fileStateUpdater = new FileStateUpdater(app, fileId, editor)

			const abortController = new AbortController()
			maybeSlurp({
				app,
				editor,
				fileId,
				abortSignal: abortController.signal,
				addDialog,
				remountImageShapes,
			})
				.catch((err) => {
					// ReadyWrapper keeps the editor invisible and inert until setIsReady runs, so a
					// failed slurp must not stop it from running.
					console.error('Failed to slurp local file', err)
					captureException(err, {
						tags: { operation: 'slurp-local-file' },
						extra: { fileId },
					})
					if (!abortController.signal.aborted) showSlurpFailure()
				})
				.then(() => {
					// A restore aborted by navigating away still resolves; the board it belonged to never
					// showed, so it must not take the one-shot report from the next one.
					if (abortController.signal.aborted) return
					setIsReady()
					markFirstLoad('board-visible')
					fileLoad.mark('board-visible')
					const size = boardSizeFields(editor)
					reportFirstLoad({
						email: app?.email,
						flagEnabled: app?.isLoadRumEnabled ?? false,
						trackEvent,
						fileLoad,
						extra: size,
					})
					reportFileLoad(fileLoad, {
						email: app?.email,
						flagEnabled: app?.isLoadRumEnabled ?? false,
						trackEvent,
						extra: { file_size_bucket: estimateFileSizeBucket(editor), ...size },
					})
				})

			return () => {
				stopStudentPageGuard()
				cleanupPerf()
				fileStateUpdater.dispose()
				abortController.abort()
			}
		},
		[
			addDialog,
			fileLoad,
			trackRoomLoaded,
			trackNewRoomCreation,
			trackShareLinkOpen,
			trackPerformance,
			app,
			fileId,
			isEmbed,
			isStudentIn,
			remountImageShapes,
			setIsReady,
			showSlurpFailure,
		]
	)

	// we need to prevent recording the file exit if the store is in an error state
	const storeError = useRef(false)
	if (store.status === 'error') {
		storeError.current = true
	}

	// Handle entering and exiting the file, with some protection against rapid enters/exits
	useEffect(() => {
		if (!app) return
		if (store.status !== 'synced-remote') return
		let didEnter = false
		let timer: number

		const fileState = app.getFileState(fileId)

		if (fileState && fileState.firstVisitAt) {
			// If there's a file state already then wait a second before marking it as entered
			timer = tltime.setTimeout(
				'file enter timer',
				() => {
					app.onFileEnter(fileId)
					didEnter = true
				},
				1000
			)
		} else {
			// If there's not a file state yet (i.e. if we're visiting this for the first time) then do an enter
			app.onFileEnter(fileId)
			didEnter = true
		}

		return () => {
			clearTimeout(timer)
			if (didEnter && !storeError.current) {
				app.updateFileState(fileId, { lastVisitAt: Date.now() })
			}
		}
	}, [app, fileId, store.status])

	const overrides = useFileEditorOverrides({ fileSlug })
	const extraDragIconOverrides = useExtraDragIconOverrides()
	const anonCommentToolOverrides = useAnonCommentToolOverrides()
	const commentingEnabled = useIsCommentingEnabled()

	const instanceComponents = useMemo((): TLComponents => {
		return {
			...components,
			...(isStudent ? { PageMenu: null } : null),
			...(isRedOnlyStudent ? { StylePanel: RestrictedStylePanel } : null),
			DebugMenu: () => <CustomDebugMenu />,
			ContextMenu: (props) => (
				<DefaultContextMenu {...props}>
					<TlaAddToCollectionMenuItem />
					<DefaultContextMenuContent />
				</DefaultContextMenu>
			),
			InFrontOfTheCanvas: () => (
				<>
					<TeacherEditingToggle grantId={grantId} />
					<TryBlockedActions grantId={grantId} />
					{commentingEnabled && <CommentsOnCanvas fileId={fileId} />}
					<TlaCollectionsPanel />
				</>
			),
		}
	}, [fileId, commentingEnabled, isStudent, isRedOnlyStudent, grantId])

	// The comment tool overrides stay in for signed-out visitors too: `anonCommentToolOverrides`
	// turns their button into the sign-in dialog. On read-only canvases the button and `c` shortcut
	// hide via the UI's readonly handling, and composing is gated by the tool's `canComment`.
	const editorOverrides = useMemo(
		() => [overrides, extraDragIconOverrides, commentToolOverrides, anonCommentToolOverrides],
		[overrides, extraDragIconOverrides, anonCommentToolOverrides]
	)

	return (
		<TlaEditorWrapper>
			<Tldraw
				className="tla-editor"
				store={store}
				assetUrls={assetUrls}
				shapeUtils={embedShapeUtils}
				tools={commentingEnabled ? tlaCommentTools : undefined}
				user={app?.tlUser}
				onMount={handleMount}
				onUiEvent={handleUiEvent}
				components={instanceComponents}
				options={{
					actionShortcutsLocation: 'toolbar',
					deepLinks: deepLinks ? true : undefined,
				}}
				overrides={editorOverrides}
				getShapeVisibility={getShapeVisibility}
				canChangeRecord={canChangeRecord}
			>
				<ThemeUpdater />
				<ShowRefusals />
				<SneakyDarkModeSync />
				<SneakyToolSwitcher />
				<SneakyMermaidHandler />
				{app && <SneakyTldrawFileDropHandler />}
				<SneakyLargeFileHander />
				<SneakyDebugModeToast />
				{commentingEnabled && <SneakyCommentDeepLink />}
				<TlaAnonDotDevLink />
			</Tldraw>
		</TlaEditorWrapper>
	)
}

const DOTCOM_DEBUG_FLAGS = {
	...debugFlags,
	logLoads: createDebugValue(LOADS_DEBUG_FLAG, { defaults: { all: false } }),
}

function CustomDebugMenu() {
	const app = useMaybeApp()
	const openAndTrack = useOpenUrlAndTrack('unknown')
	const editor = useEditor()
	const isReadOnly = useValue('isReadOnly', () => editor.getIsReadonly(), [editor])
	const msg = useTranslation()
	return (
		<DefaultDebugMenu>
			<A11yAudit />
			{!isReadOnly && app && (
				<TldrawUiMenuItem
					id="file-history"
					label={msg(messages.fileHistory)}
					readonlyOk
					onSelect={() => {
						const url = new URL(window.location.href)
						url.pathname += '/history'
						openAndTrack(url.toString())
					}}
				/>
			)}
			<DefaultDebugMenuContent customDebugFlags={DOTCOM_DEBUG_FLAGS} />
		</DefaultDebugMenu>
	)
}

const FILE_STATE_UPDATE_INTERVAL = 10_000
class FileStateUpdater {
	disposables = new Set<() => void>()
	constructor(
		private readonly app: TldrawApp,
		private readonly fileId: string,
		editor: Editor
	) {
		this.disposables.add(
			editor.store.listen(
				() => {
					this.didDocumentChange = true
					this.update()
				},
				{ scope: 'document', source: 'user' }
			)
		)
		const flush = () => {
			this.update.flush()
		}
		window.addEventListener('beforeunload', flush)
		this.disposables.add(() => {
			window.removeEventListener('beforeunload', flush)
		})

		const sessionState$ = createSessionStateSnapshotSignal(editor.store)
		let firstTime = true
		this.disposables.add(
			react('update session state', () => {
				const state = sessionState$.get()
				if (firstTime) {
					firstTime = false
					return
				}
				if (!state) return
				this.nextSessionState = state
				this.update()
			})
		)
	}

	private nextSessionState: TLSessionStateSnapshot | null = null
	private didDocumentChange = false

	private update = throttle(
		() => {
			if (!this.nextSessionState && !this.didDocumentChange) return
			const state = this.nextSessionState
			this.nextSessionState = null
			const didChange = this.didDocumentChange
			this.didDocumentChange = false
			this.app.updateFileState(this.fileId, {
				lastSessionState: state ? JSON.stringify(state) : undefined,
				lastEditAt: didChange ? Date.now() : undefined,
				lastVisitAt: Date.now(),
			})
		},
		FILE_STATE_UPDATE_INTERVAL,
		{ trailing: true, leading: false }
	)

	dispose() {
		this.update.flush()
		this.disposables.forEach((dispose) => dispose())
		this.disposables.clear()
	}
}
