import {
	CanvasComments,
	CommentAuthor,
	CommentTool,
	commentToolOverrides,
} from '@tldraw/commenting'
import { getLicenseKey } from '@tldraw/dotcom-shared'
import { useMemo } from 'react'
import {
	commentSchemaRecords,
	createTLSchema,
	DefaultContextMenu,
	DefaultContextMenuContent,
	DefaultDebugMenu,
	DefaultDebugMenuContent,
	Editor,
	ExampleDialog,
	PerformanceApiAdapter,
	TLComponents,
	Tldraw,
	TldrawUiMenuActionCheckboxItem,
	TldrawUiMenuActionItem,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	getFromSessionStorage,
	setInSessionStorage,
	track,
	useDialogs,
	useEditor,
	useLocalStore,
} from 'tldraw'
import '@tldraw/commenting/commenting.css'
import 'tldraw/tldraw.css'
import { trackedShapes, useDebugging } from '../hooks/useDebugging'
import { usePerformance } from '../hooks/usePerformance'
import { A11yResultTable } from './a11y'
import { getDiff } from './diff'

const ContextMenu = track(() => {
	const editor = useEditor()
	const oneShape = editor.getOnlySelectedShape()
	const selectedShapes = editor.getSelectedShapes()
	const tracked = trackedShapes.get()

	return (
		<DefaultContextMenu>
			<DefaultContextMenuContent />
			{selectedShapes.length > 0 && (
				<TldrawUiMenuGroup id="debugging">
					<TldrawUiMenuActionItem actionId="log-shapes" />
					{oneShape && (
						<TldrawUiMenuActionCheckboxItem
							checked={tracked.includes(oneShape.id)}
							actionId="track-changes"
						/>
					)}
				</TldrawUiMenuGroup>
			)}
		</DefaultContextMenu>
	)
})

function A11yAudit() {
	const { addDialog } = useDialogs()

	const runA11yAudit = async () => {
		const axe = (await import('axe-core')).default
		axe.run(document, {}, (err, results) => {
			if (err) throw err

			// eslint-disable-next-line no-console
			console.debug('[a11y]:', results)

			addDialog({
				component: ({ onClose }) => (
					<ExampleDialog
						body={<A11yResultTable results={results} />}
						title="Accessibility Audit Results"
						maxWidth="80vw"
						cancel="Close"
						confirm="Ok"
						onCancel={() => onClose()}
						onContinue={() => onClose()}
					/>
				),
				onClose: () => {
					void null
				},
			})
		})
	}

	return <TldrawUiMenuItem id="a11y-audit" onSelect={runA11yAudit} label={'A11y audit'} />
}

// Comments are authored as the local user, so the develop page shows whatever name and color are
// set in the preferences menu. Any other author id came from another tab of the same document.
const Comments = track(() => {
	const editor = useEditor()
	const userId = editor.user.getExternalId()
	const resolveAuthor = (id: string): CommentAuthor =>
		id === userId
			? { name: editor.user.getName() || 'You', color: editor.user.getColor() }
			: { name: id }

	return <CanvasComments currentUserId={userId} resolveAuthor={resolveAuthor} />
})

const components: TLComponents = {
	ContextMenu,
	DebugMenu: () => (
		<DefaultDebugMenu>
			<A11yAudit />
			<DefaultDebugMenuContent />
		</DefaultDebugMenu>
	),
	InFrontOfTheCanvas: Comments,
}

// Dragging the comment tool out anchors a comment to a rectangular region; a click anchors a pin.
const tools = [CommentTool.configure({ enableRegions: true })]

// Debug mode is on by default on this page. The default is applied once per
// browser tab so that turning debug mode off still sticks across reloads.
const DEBUG_MODE_DEFAULT_KEY = 'tldraw_develop_debug_mode_default_applied'

function turnOnDebugModeByDefault(editor: Editor) {
	if (getFromSessionStorage(DEBUG_MODE_DEFAULT_KEY)) return
	setInSessionStorage(DEBUG_MODE_DEFAULT_KEY, 'true')
	editor.updateInstanceState({ isDebugMode: true })
}

function afterChangeHandler(prev: any, next: any) {
	const tracked = trackedShapes.get()
	if (tracked.includes(next.id)) {
		// eslint-disable-next-line no-console
		console.table(getDiff(prev, next))
	}
}

export default function Develop() {
	const performanceOverrides = usePerformance()
	const debuggingOverrides = useDebugging()

	// The comment records live in the store alongside shapes, so the schema needs them registered
	// before the persisted document loads. That makes this schema newer than the default one, so
	// no other example may share the 'example' persistence key: a newer-schema tab ignores an
	// older tab's changes and overwrites the shared database with its own copy (#10514).
	const schema = useMemo(() => createTLSchema({ records: commentSchemaRecords }), [])
	const store = useLocalStore({ persistenceKey: 'example', schema })

	return (
		<div className="tldraw__editor">
			<Tldraw
				licenseKey={getLicenseKey()}
				overrides={[performanceOverrides, debuggingOverrides, commentToolOverrides]}
				store={store}
				tools={tools}
				onMount={(editor) => {
					;(window as any).app = editor
					;(window as any).editor = editor

					turnOnDebugModeByDefault(editor)

					Object.defineProperty(window, '$s', {
						get: function () {
							return editor.getOnlySelectedShape()
						},
						configurable: true,
						enumerable: true,
					})

					const dispose = editor.store.sideEffects.registerAfterChangeHandler(
						'shape',
						afterChangeHandler
					)

					const perfAdapter = new PerformanceApiAdapter(editor.performance)

					return () => {
						dispose()
						perfAdapter.dispose()
					}
				}}
				components={components}
			></Tldraw>
		</div>
	)
}
