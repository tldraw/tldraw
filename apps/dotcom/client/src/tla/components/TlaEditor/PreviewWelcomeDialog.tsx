import { createContext, useCallback, useContext, useEffect } from 'react'
import {
	LocalIndexedDb,
	TAB_ID,
	TldrawUiButton,
	TldrawUiButtonLabel,
	TldrawUiDialogBody,
	TldrawUiDialogFooter,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	computed,
	useDialogs,
	useEditor,
	useValue,
} from 'tldraw'
import { getScratchPersistenceKey } from '../../../utils/scratch-persistence-key'
import { useApp } from '../../hooks/useAppState'
import { useCurrentFileId } from '../../hooks/useCurrentFileId'
import { F } from '../../utils/i18n'
import { getLocalSessionState, updateLocalSessionState } from '../../utils/local-session-state'
import { Slurper } from '../../utils/slurping'

// yo this whole file can be deleted when tla becomes the default .com experience
export const RemountImagesContext = createContext<() => void>(() => {})

async function userHasSlurpableDocument() {
	const persistenceKey = getScratchPersistenceKey()
	const db = new LocalIndexedDb(persistenceKey)
	const data = await db.load({ sessionId: TAB_ID })
	db.close()
	const numShapes = data.records.filter((r) => r.typeName === 'shape').length
	return numShapes > 0
}

function WelcomeDialog({ hasSlurpableDocument }: { hasSlurpableDocument: boolean }) {
	const dialogs = useDialogs()
	const editor = useEditor()

	const onDismiss = useCallback(() => {
		dialogs.removeDialog(dialogId)
	}, [dialogs])

	const remountImageShapes = useContext(RemountImagesContext)

	const app = useApp()
	const fileId = useCurrentFileId()!

	const onSlurp = useCallback(async () => {
		const abortController = new AbortController()
		editor.disposables.add(() => abortController.abort())
		await new Slurper({
			abortSignal: abortController.signal,
			addDialog: dialogs.addDialog,
			app,
			editor,
			fileId,
			remountImageShapes,
			slurpPersistenceKey: getScratchPersistenceKey(),
		}).slurp()
		onDismiss()
	}, [app, dialogs.addDialog, editor, fileId, onDismiss, remountImageShapes])

	const file = app.getFile(fileId)
	const isOwner = file && file.ownerId === app.getUser().id
	const isCurrentFileEmpty =
		editor.store.allRecords().filter((r) => r.typeName === 'shape').length === 0
	const offerSlurp = hasSlurpableDocument && isCurrentFileEmpty && isOwner

	return (
		// using `visibility: hidden` instead of `return null` when loading
		// because radix dialog complains if we mount a dialog a title
		<div>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle style={{ fontWeight: 700 }}>
					<F defaultMessage="Welcome to the new tldraw.com!" />
				</TldrawUiDialogTitle>
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody
				style={{ maxWidth: 350, display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}
			>
				<p>
					<F defaultMessage="This is a preview release of the new tldraw.com which features file saving, collaboration, and publishing." />
				</p>
				<p>
					<F defaultMessage="To go back to the old tldraw.com, sign out from the user menu." />
				</p>
			</TldrawUiDialogBody>
			<TldrawUiDialogFooter className="tlui-dialog__footer__actions">
				{offerSlurp ? (
					<>
						<TldrawUiButton type="normal" onClick={onDismiss}>
							<TldrawUiButtonLabel>
								<F defaultMessage="Skip import" />
							</TldrawUiButtonLabel>
						</TldrawUiButton>
						<TldrawUiButton type="primary" onClick={onSlurp}>
							<TldrawUiButtonLabel>
								<F defaultMessage="Import from old tldraw.com" />
							</TldrawUiButtonLabel>
						</TldrawUiButton>
					</>
				) : (
					<TldrawUiButton type="primary" onClick={onDismiss}>
						<TldrawUiButtonLabel>
							<F defaultMessage="Got it" />
						</TldrawUiButtonLabel>
					</TldrawUiButton>
				)}
			</TldrawUiDialogFooter>
		</div>
	)
}

const shouldShowWelcomeDialog$ = computed(
	'shouldShowWelcomeDialog',
	() => getLocalSessionState().shouldShowWelcomeDialog ?? false
)
const dialogId = 'tla-welcome'

export function PreviewWelcomeDialog() {
	const dialogs = useDialogs()
	const shouldShowWelcomeDialog = useValue(shouldShowWelcomeDialog$)
	const onClose = useCallback(
		() => updateLocalSessionState((state) => ({ ...state, shouldShowWelcomeDialog: false })),
		[]
	)

	useEffect(() => {
		if (shouldShowWelcomeDialog) {
			userHasSlurpableDocument().then((hasSlurpableDocument) => {
				dialogs.addDialog({
					id: dialogId,
					component: () => <WelcomeDialog hasSlurpableDocument={hasSlurpableDocument} />,
					onClose,
					preventBackgroundClose: true,
				})
			})
		}
	}, [dialogs, onClose, shouldShowWelcomeDialog])
	return null
}
