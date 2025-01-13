import { getLicenseKey } from '@tldraw/dotcom-shared'
import { ReactNode, useEffect } from 'react'
import {
	DefaultDebugMenu,
	DefaultDebugMenuContent,
	DefaultKeyboardShortcutsDialog,
	DefaultKeyboardShortcutsDialogContent,
	DefaultMainMenu,
	EditSubmenu,
	Editor,
	ExportFileContentSubMenu,
	ExtrasGroup,
	PreferencesGroup,
	TLComponents,
	Tldraw,
	TldrawOptions,
	TldrawUiButton,
	TldrawUiButtonLabel,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogFooter,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	TldrawUiMenuActionItem,
	TldrawUiMenuGroup,
	ViewSubmenu,
	getFromLocalStorage,
	setInLocalStorage,
	useDialogs,
	useEditor,
	useEvent,
} from 'tldraw'
import { assetUrls } from '../utils/assetUrls'
import { createAssetFromUrl } from '../utils/createAssetFromUrl'
import { getScratchPersistenceKey } from '../utils/scratch-persistence-key'
import { useSharing } from '../utils/sharing'
import { OPEN_FILE_ACTION, SAVE_FILE_COPY_ACTION, useFileSystem } from '../utils/useFileSystem'
import { useHandleUiEvents } from '../utils/useHandleUiEvent'
import { LocalFileMenu } from './FileMenu'
import { Links } from './Links'
import { ShareMenu } from './ShareMenu'
import { SneakyOnDropOverride } from './SneakyOnDropOverride'
import { ThemeUpdater } from './ThemeUpdater/ThemeUpdater'

const components: TLComponents = {
	ErrorFallback: ({ error }) => {
		throw error
	},
	MainMenu: () => (
		<DefaultMainMenu>
			<TldrawUiMenuGroup id="basic">
				<LocalFileMenu />
				<EditSubmenu />
				<ViewSubmenu />
				<ExportFileContentSubMenu />
				<ExtrasGroup />
			</TldrawUiMenuGroup>
			<PreferencesGroup />
			<Links />
		</DefaultMainMenu>
	),
	KeyboardShortcutsDialog: (props) => {
		return (
			<DefaultKeyboardShortcutsDialog {...props}>
				<TldrawUiMenuGroup label="shortcuts-dialog.file" id="file">
					<TldrawUiMenuActionItem actionId={SAVE_FILE_COPY_ACTION} />
					<TldrawUiMenuActionItem actionId={OPEN_FILE_ACTION} />
				</TldrawUiMenuGroup>
				<DefaultKeyboardShortcutsDialogContent />
			</DefaultKeyboardShortcutsDialog>
		)
	},
	DebugMenu: () => {
		return (
			<DefaultDebugMenu>
				<DefaultDebugMenuContent />
			</DefaultDebugMenu>
		)
	},
	SharePanel: () => {
		return (
			<div className="tlui-share-zone" draggable={false}>
				<ShareMenu />
			</div>
		)
	},
}

export function LocalEditor({
	componentsOverride,
	onMount,
	children,
	persistenceKey,
	'data-testid': dataTestId,
	options,
}: {
	componentsOverride?: TLComponents
	onMount?(editor: Editor): void
	children?: ReactNode
	persistenceKey?: string
	'data-testid'?: string
	options?: Partial<TldrawOptions>
}) {
	const handleUiEvent = useHandleUiEvents()
	const sharingUiOverrides = useSharing()
	const fileSystemUiOverrides = useFileSystem({ isMultiplayer: false })

	const handleMount = useEvent((editor: Editor) => {
		;(window as any).app = editor
		;(window as any).editor = editor
		editor.registerExternalAssetHandler('url', createAssetFromUrl)
		return onMount?.(editor)
	})

	return (
		<div className="tldraw__editor" data-testid={dataTestId}>
			<Tldraw
				licenseKey={getLicenseKey()}
				assetUrls={assetUrls}
				persistenceKey={persistenceKey ?? getScratchPersistenceKey()}
				onMount={handleMount}
				overrides={[sharingUiOverrides, fileSystemUiOverrides]}
				onUiEvent={handleUiEvent}
				components={componentsOverride ?? components}
				options={options}
			>
				<SneakyOnDropOverride isMultiplayer={false} />
				<ThemeUpdater />
				<SneakyLocalSaveWarning />
				{children}
			</Tldraw>
		</div>
	)
}

const LOCAL_SAVE_WARNING_DISMISSED_KEY = 'local save warning dismissed 1'

function SneakyLocalSaveWarning() {
	const editor = useEditor()
	const { addDialog } = useDialogs()

	useEffect(() => {
		const hasConfirmedLocalSave = getFromLocalStorage(LOCAL_SAVE_WARNING_DISMISSED_KEY)

		if (hasConfirmedLocalSave) return

		if (editor.store.allRecords().length > 128) {
			// tell the user to save to the cloud or to desktop

			addDialog({
				component: ({ onClose }) => (
					<>
						<TldrawUiDialogHeader>
							<TldrawUiDialogTitle>
								<b>{`Don't forget to save!`}</b>
							</TldrawUiDialogTitle>
							<TldrawUiDialogCloseButton />
						</TldrawUiDialogHeader>
						<TldrawUiDialogBody
							style={{
								maxWidth: 350,
								display: 'flex',
								flexDirection: 'column',
								gap: 'var(--space-4)',
							}}
						>
							<p>
								Did you know that your tldraw project is being saved to your own computer? This
								means that if you clear your browser cache, you will also lose your project here.
							</p>
							<p>To keep things safe, you can either:</p>
							<ol>
								<li>
									Save your project as a .tldr file. From the Menu, choose <b>File</b> {`>`}{' '}
									<b>Save a copy</b>. You can open it back up again later with <b>File</b> {`>`}{' '}
									<b>Open file</b>.
								</li>
								<li>
									Share your project by clicking the <b>Share</b> button at the top right of your
									screen. Shared projects are hosted on the cloud for free. Just be sure to bookmark
									the new hosted project so that you can come back to it later.
								</li>
							</ol>
							<p>
								Have fun with tldraw! Have questions?{' '}
								<a href="https://discord.gg/rhsyWMUJxd">Ask here!</a>
							</p>
						</TldrawUiDialogBody>
						<TldrawUiDialogFooter className="tlui-dialog__footer__actions">
							<TldrawUiButton type="primary" onClick={() => onClose()}>
								<TldrawUiButtonLabel>Got it!</TldrawUiButtonLabel>
							</TldrawUiButton>
						</TldrawUiDialogFooter>
					</>
				),
				onClose() {
					setInLocalStorage(LOCAL_SAVE_WARNING_DISMISSED_KEY, 'true')
				},
			})
		}
	}, [editor, addDialog])

	return null
}
