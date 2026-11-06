import {
	AddToCollectionMenuItem,
	CollectionsPanel,
	CollectionsQuickActions,
	collectionSchemaRecords,
	collectionsPanelOpen,
} from '@tldraw/collections'
import { useEffect } from 'react'
import {
	DefaultContextMenu,
	DefaultContextMenuContent,
	Editor,
	PageRecordType,
	TLComponents,
	Tldraw,
	TldrawUiButton,
	TldrawUiButtonLabel,
	useEditor,
	useValue,
} from 'tldraw'
import '@tldraw/collections/collections.css'
import {
	getShowing,
	PAGES,
	seedBoard,
	type Showing,
	STRESS_MODES,
	stressMode,
} from './collections-pages'
import 'tldraw/tldraw.css'

// Unlisted, like /develop: @tldraw/collections is unreleased. Each page of the document shows the
// panel over a different CollectionSource.

const seeded = new Map<Showing, Promise<void>>()

function seedOnce(editor: Editor, showing: Showing) {
	if (!showing.seed || seeded.has(showing)) return
	seeded.set(
		showing,
		showing
			.seed(editor)
			.catch((error) => console.error(`[collections] seeding ${showing.source.id} failed`, error))
	)
}

function useShowing() {
	const editor = useEditor()
	return useValue('showing', () => getShowing(editor), [editor])
}

function ExamplePanel() {
	const editor = useEditor()
	const showing = useShowing()
	useEffect(() => seedOnce(editor, showing), [editor, showing])
	return <CollectionsPanel source={showing.source} menuItems={showing.menuItems} />
}

function ExampleSaveMenu() {
	const { source } = useShowing()
	return <AddToCollectionMenuItem source={source} />
}

function StressSwitch() {
	const editor = useEditor()
	const onStressPage = useValue('on stress page', () => editor.getCurrentPage().name === 'Stress', [
		editor,
	])
	const mode = useValue('stress mode', () => stressMode.get(), [])
	if (!onStressPage) return null
	return (
		<div
			role="group"
			aria-label="Stress"
			style={{
				display: 'flex',
				margin: 8,
				pointerEvents: 'all',
				background: 'var(--tl-color-panel)',
				borderRadius: 'var(--tl-radius-4)',
				boxShadow: 'var(--tl-shadow-2)',
			}}
		>
			{STRESS_MODES.map((m) => (
				<TldrawUiButton
					key={m}
					type="normal"
					isActive={m === mode}
					aria-pressed={m === mode}
					onClick={() => stressMode.set(m)}
				>
					<TldrawUiButtonLabel>{m}</TldrawUiButtonLabel>
				</TldrawUiButton>
			))}
		</div>
	)
}

const components: TLComponents = {
	InFrontOfTheCanvas: ExamplePanel,
	TopPanel: StressSwitch,
	ContextMenu: (props) => (
		<DefaultContextMenu {...props}>
			<ExampleSaveMenu />
			<DefaultContextMenuContent />
		</DefaultContextMenu>
	),
	QuickActions: CollectionsQuickActions,
}

// One page per source. A fresh, empty first page becomes the first, missing pages are added, and
// each gets shapes to select and save.
function setUpPages(editor: Editor) {
	const pages = () => editor.getPages()
	const first = pages()[0]
	const hasPage = (name: string) => pages().some((page) => page.name === name)
	if (!hasPage(PAGES[0]) && first && editor.getPageShapeIds(first.id).size === 0) {
		editor.renamePage(first.id, PAGES[0])
	}
	for (const name of PAGES) {
		if (!hasPage(name)) editor.createPage({ id: PageRecordType.createId(), name })
		const page = pages().find((p) => p.name === name)
		if (page && editor.getPageShapeIds(page.id).size === 0) {
			editor.createShapes([
				{ type: 'geo', parentId: page.id, x: 400, y: 200, props: { w: 160, h: 100 } },
				{
					type: 'geo',
					parentId: page.id,
					x: 620,
					y: 220,
					props: { geo: 'ellipse', w: 120, h: 80, color: 'blue', fill: 'semi' },
				},
			])
		}
	}
}

const handleMount = (editor: Editor) => {
	editor.run(() => setUpPages(editor), { history: 'ignore' })
	collectionsPanelOpen.set(editor, true)
	seedBoard(editor).catch((error) => console.error('[collections] seeding the board failed', error))
}

export default function Collections() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="collections-sources"
				records={collectionSchemaRecords}
				components={components}
				onMount={handleMount}
			/>
		</div>
	)
}
