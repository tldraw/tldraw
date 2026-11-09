import {
	AddToCollectionMenuItem,
	type CollectionSource,
	CollectionsPanel,
	CollectionsQuickActions,
	collectionSchemaRecords,
	collectionsPanelOpen,
} from '@tldraw/collections'
import { type ReactNode, useEffect, useMemo } from 'react'
import {
	DefaultContextMenu,
	DefaultContextMenuContent,
	Editor,
	PageRecordType,
	TLComponents,
	Tldraw,
	useEditor,
	useValue,
} from 'tldraw'
import '@tldraw/collections/collections.css'
import 'tldraw/tldraw.css'

export interface Showing {
	source: CollectionSource
	/** Fills the source the first time it shows. */
	seed?(editor: Editor): Promise<void>
	menuItems?: ReactNode
}

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

function makeComponents(getShowing: (editor: Editor) => Showing): TLComponents {
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

	return {
		InFrontOfTheCanvas: ExamplePanel,
		ContextMenu: (props) => (
			<DefaultContextMenu {...props}>
				<ExampleSaveMenu />
				<DefaultContextMenuContent />
			</DefaultContextMenu>
		),
		QuickActions: CollectionsQuickActions,
	}
}

// One page per name. A fresh, empty first page becomes the first, missing pages are added, and each
// gets shapes to select and save.
function setUpPages(editor: Editor, names: readonly string[]) {
	const pages = () => editor.getPages()
	const first = pages()[0]
	const hasPage = (name: string) => pages().some((page) => page.name === name)
	if (!hasPage(names[0]) && first && editor.getPageShapeIds(first.id).size === 0) {
		editor.renamePage(first.id, names[0])
	}
	for (const name of names) {
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

export interface CollectionsExampleProps {
	persistenceKey: string
	pages: readonly string[]
	/** What the current page shows. Called reactively. */
	getShowing(editor: Editor): Showing
	onMount?(editor: Editor): void
}

export function CollectionsExample({
	persistenceKey,
	pages,
	getShowing,
	onMount,
}: CollectionsExampleProps) {
	const components = useMemo(() => makeComponents(getShowing), [getShowing])
	const handleMount = (editor: Editor) => {
		editor.run(() => setUpPages(editor, pages), { history: 'ignore' })
		collectionsPanelOpen.set(editor, true)
		if (onMount) onMount(editor)
	}
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey={persistenceKey}
				records={collectionSchemaRecords}
				components={components}
				onMount={handleMount}
			/>
		</div>
	)
}
