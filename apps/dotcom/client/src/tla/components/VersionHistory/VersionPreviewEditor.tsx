import {
	createContext,
	ReactNode,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from 'react'
import { Editor, EditorPortal, TLComponents, TLStoreSnapshot, Tldraw } from 'tldraw'
import { ThemeUpdater } from '../../../components/ThemeUpdater/ThemeUpdater'
import { assetUrls } from '../../../utils/assetUrls'
import { embedShapeUtils } from '../../../utils/embedShapeUtil'
import { globalEditor } from '../../../utils/globalEditor'
import { useMaybeApp } from '../../hooks/useAppState'
import { fetchVersionSnapshot } from '../../utils/versionHistoryApi'
import { TlaEditorMenuPanel } from '../TlaEditor/editor-components/TlaEditorMenuPanel'
import { SneakyDarkModeSync } from '../TlaEditor/sneaky/SneakyDarkModeSync'
import { TlaEditorWrapper } from '../TlaEditor/TlaEditorWrapper'
import { useFileSyncStore } from '../TlaEditor/TlaFileSyncHost'
import { applyView, HistoryView } from './applyView'
import { HistoryTopRightPanel } from './HistoryTopRightPanel'
import { stripCommentRecords } from './previewSnapshot'

// Rendered like the comments sidebar: from the InFrontOfTheCanvas slot through EditorPortal, so it
// sits inside tldraw's UI providers and its dropdown menus have a container to open in.
const OverlayContext = createContext<ReactNode>(null)
function Overlay() {
	return <EditorPortal>{useContext(OverlayContext)}</EditorPortal>
}

// The app root already renders dialogs and toasts; the editor's own copies would show them twice.
const components: TLComponents = {
	Dialogs: null,
	Toasts: null,
	SharePanel: HistoryTopRightPanel,
	// The live editor's top-left panel, which leaves room for the sidebar toggle.
	MenuPanel: TlaEditorMenuPanel,
	InFrontOfTheCanvas: Overlay,
}

/**
 * One long-lived read-only editor: switching versions loads a new snapshot into it and keeps the
 * page and camera, so stepping through versions reads like a flipbook.
 */
export function VersionPreviewEditor({
	fileId,
	ts,
	initialView,
	onError,
	children,
}: {
	fileId: string
	ts: string | null
	initialView: HistoryView | null
	onError(): void
	/** Rendered inside the editor, like the comments sidebar. */
	children?: ReactNode
}) {
	const app = useMaybeApp()
	const sync = useFileSyncStore()
	const editorRef = useRef<Editor | null>(null)
	const viewRef = useRef<HistoryView | null>(initialView)
	const liveSnapshot = () =>
		sync.status === 'synced-remote'
			? stripCommentRecords(sync.store.getStoreSnapshot('document'))
			: null
	// Seeded with the live document so the canvas shows right away; the version swaps in once loaded.
	const [initial, setInitial] = useState<TLStoreSnapshot | null>(liveSnapshot)
	const pendingRef = useRef<TLStoreSnapshot | null>(null)

	const show = useCallback((editor: Editor, snapshot: TLStoreSnapshot) => {
		viewRef.current = { pageId: editor.getCurrentPageId(), camera: editor.getCamera() }
		editor.loadSnapshot(snapshot)
		editor.updateInstanceState({ isReadonly: true })
		applyView(editor, viewRef.current)
	}, [])

	useEffect(() => {
		let cancelled = false
		const load = async () => (ts !== null ? fetchVersionSnapshot(fileId, ts) : liveSnapshot())
		load().then(
			(snapshot) => {
				if (cancelled || !snapshot) return
				const editor = editorRef.current
				if (editor) show(editor, snapshot)
				else if (initial) pendingRef.current = snapshot
				else setInitial(snapshot)
			},
			() => !cancelled && onError()
		)
		return () => {
			cancelled = true
		}
		// liveSnapshot and initial are read for the moment of loading, not as triggers
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [fileId, ts, sync.status, onError, show])

	const handleMount = useCallback(
		(editor: Editor) => {
			editorRef.current = editor
			// App chrome (the sidebar toggle) reads the global editor; the live one is hidden.
			const previous = globalEditor.get()
			globalEditor.set(editor)
			editor.updateInstanceState({ isReadonly: true })
			applyView(editor, viewRef.current)
			if (pendingRef.current) {
				show(editor, pendingRef.current)
				pendingRef.current = null
			}
			return () => {
				if (globalEditor.get() === editor) globalEditor.set(previous)
				editorRef.current = null
			}
		},
		[show]
	)

	if (!initial) return null

	return (
		<OverlayContext.Provider value={children}>
			<TlaEditorWrapper>
				<Tldraw
					className="tla-editor"
					snapshot={initial}
					assetUrls={assetUrls}
					shapeUtils={embedShapeUtils}
					user={app?.tlUser}
					onMount={handleMount}
					initialState="hand"
					components={components}
					options={{ actionShortcutsLocation: 'toolbar' }}
				>
					<ThemeUpdater />
					<SneakyDarkModeSync />
				</Tldraw>
			</TlaEditorWrapper>
		</OverlayContext.Provider>
	)
}
