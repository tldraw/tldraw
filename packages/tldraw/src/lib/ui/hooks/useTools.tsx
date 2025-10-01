import {
	assertExists,
	createShapeId,
	Editor,
	GeoShapeGeoStyle,
	getIndicesBetween,
	TLLineShape,
	TLPointerEventInfo,
	TLShapeId,
	toRichText,
	useMaybeEditor,
} from '@tldraw/editor'
import * as React from 'react'
import { EmbedDialog } from '../components/EmbedDialog'
import { TLUiIconJsx } from '../components/primitives/TldrawUiIcon'
import { useA11y } from '../context/a11y'
import { TLUiEventSource, useUiEvents } from '../context/events'
import { TLUiIconType } from '../icon-types'
import { TLUiOverrideHelpers, useDefaultHelpers } from '../overrides'
import { TLUiTranslationKey } from './useTranslation/TLUiTranslationKey'
import { useTranslation } from './useTranslation/useTranslation'

/** @public */
export interface TLUiToolItem<
	TranslationKey extends string = string,
	IconType extends string = string,
> {
	id: string
	label: TranslationKey
	shortcutsLabel?: TranslationKey
	icon: IconType | TLUiIconJsx
	onSelect(source: TLUiEventSource): void
	onDragStart?(source: TLUiEventSource, info: TLPointerEventInfo): void
	/**
	 * The keyboard shortcut for this tool. This is a string that can be a single key,
	 * or a combination of keys.
	 * For example, `cmd+z` or `cmd+shift+z` or `cmd+u,ctrl+u`, or just `v` or `a`.
	 * We have backwards compatibility with the old system, where we used to use
	 * symbols to denote cmd/alt/shift, using `!` for shift, `$` for cmd, and `?` for alt.
	 */
	kbd?: string
	readonlyOk?: boolean
	meta?: {
		[key: string]: any
	}
}

/** @public */
export type TLUiToolsContextType = Record<string, TLUiToolItem>

/** @internal */
export const ToolsContext = React.createContext<null | TLUiToolsContextType>(null)

/** @public */
export interface TLUiToolsProviderProps {
	overrides?(
		editor: Editor,
		tools: TLUiToolsContextType,
		helpers: Partial<TLUiOverrideHelpers>
	): TLUiToolsContextType
	children: React.ReactNode
}

/** @internal */
export function ToolsProvider({ overrides, children }: TLUiToolsProviderProps) {
	const editor = useMaybeEditor()
	const trackEvent = useUiEvents()

	const a11y = useA11y()
	const msg = useTranslation()
	const helpers = useDefaultHelpers()

	const onToolSelect = React.useCallback(
		(
			source: TLUiEventSource,
			tool: TLUiToolItem<TLUiTranslationKey, TLUiIconType>,
			id?: string
		) => {
			a11y.announce({ msg: msg(tool.label) })
			trackEvent('select-tool', { source, id: id ?? tool.id })
		},
		[a11y, msg, trackEvent]
	)

	const tools = React.useMemo<TLUiToolsContextType>(() => {
		if (!editor) return {}
		const toolsArray: TLUiToolItem<TLUiTranslationKey, TLUiIconType>[] = [
			{
				id: 'select',
				label: 'tool.select',
				icon: 'tool-pointer',
				kbd: 'v',
				readonlyOk: true,
				onSelect(source) {
					if (editor.isIn('select')) {
						// There's a quirk of select mode, where editing a shape is a sub-state of select.
						// Because the text tool can be locked/sticky, we need to make sure we exit the
						// text tool.
						//
						// psst, if you're changing this code, also change the code
						// in strange-tools.test.ts! Sadly it's duplicated there.
						const currentNode = editor.root.getCurrent()!
						currentNode.exit({}, currentNode.id)
						currentNode.enter({}, currentNode.id)
					}
					editor.setCurrentTool('select')
					onToolSelect(source, this)
				},
			},
			{
				id: 'hand',
				label: 'tool.hand',
				icon: 'tool-hand',
				kbd: 'h',
				readonlyOk: true,
				onSelect(source) {
					editor.setCurrentTool('hand')
					onToolSelect(source, this)
				},
			},
			{
				id: 'eraser',
				label: 'tool.eraser',
				icon: 'tool-eraser',
				kbd: 'e',
				onSelect(source) {
					editor.setCurrentTool('eraser')
					onToolSelect(source, this)
				},
			},
			{
				id: 'draw',
				label: 'tool.draw',
				icon: 'tool-pencil',
				kbd: 'd,b,x',
				onSelect(source) {
					editor.setCurrentTool('draw')
					onToolSelect(source, this)
				},
			},
			...[...GeoShapeGeoStyle.values].map((geo) => ({
				id: geo,
				label: `tool.${geo}` as TLUiTranslationKey,
				meta: {
					geo,
				},
				kbd: geo === 'rectangle' ? 'r' : geo === 'ellipse' ? 'o' : undefined,
				icon: ('geo-' + geo) as TLUiIconType,
				onSelect(source: TLUiEventSource) {
					editor.run(() => {
						editor.setStyleForNextShapes(GeoShapeGeoStyle, geo)
						editor.setCurrentTool('geo')
						onToolSelect(source, this, `geo-${geo}`)
					})
				},
				onDragStart(source: TLUiEventSource, info: TLPointerEventInfo) {
					onDragFromToolbarToCreateShape(editor, info, {
						createShape: (id) =>
							editor.createShape({ id, type: 'geo', props: { w: 200, h: 200, geo } }),
					})
					trackEvent('drag-tool', { source, id: 'geo' })
				},
			})),
			{
				id: 'arrow',
				label: 'tool.arrow',
				icon: 'tool-arrow',
				kbd: 'a',
				onSelect(source) {
					editor.setCurrentTool('arrow')
					onToolSelect(source, this)
				},
				onDragStart(source: TLUiEventSource, info: TLPointerEventInfo) {
					onDragFromToolbarToCreateShape(editor, info, {
						createShape: (id) =>
							editor.createShape({
								id,
								type: 'arrow',
								props: { start: { x: 0, y: 200 }, end: { x: 200, y: 0 } },
							}),
					})
					trackEvent('drag-tool', { source, id: 'arrow' })
				},
			},
			{
				id: 'line',
				label: 'tool.line',
				icon: 'tool-line',
				kbd: 'l',
				onSelect(source) {
					editor.setCurrentTool('line')
					onToolSelect(source, this)
				},
				onDragStart(source, info) {
					onDragFromToolbarToCreateShape(editor, info, {
						createShape: (id) => {
							const [start, end] = getIndicesBetween(null, null, 2)
							editor.createShape<TLLineShape>({
								id,
								type: 'line',
								props: {
									points: {
										[start]: { id: start, index: start, x: 0, y: 200 },
										[end]: { id: end, index: end, x: 200, y: 0 },
									},
								},
							})
						},
					})
					trackEvent('drag-tool', { source, id: 'line' })
				},
			},
			{
				id: 'frame',
				label: 'tool.frame',
				icon: 'tool-frame',
				kbd: 'f',
				onSelect(source) {
					editor.setCurrentTool('frame')
					onToolSelect(source, this)
				},
				onDragStart(source, info) {
					onDragFromToolbarToCreateShape(editor, info, {
						createShape: (id) => editor.createShape({ id, type: 'frame' }),
					})
					trackEvent('drag-tool', { source, id: 'frame' })
				},
			},
			{
				id: 'text',
				label: 'tool.text',
				icon: 'tool-text',
				kbd: 't',
				onSelect(source) {
					editor.setCurrentTool('text')
					onToolSelect(source, this)
				},
				onDragStart(source, info) {
					onDragFromToolbarToCreateShape(editor, info, {
						createShape: (id) =>
							editor.createShape({ id, type: 'text', props: { richText: toRichText('Text') } }),
						onDragEnd: (id) => {
							editor.setEditingShape(id)
							editor.emit('select-all-text', { shapeId: id })
						},
					})
					trackEvent('drag-tool', { source, id: 'text' })
				},
			},
			{
				id: 'asset',
				label: 'tool.media',
				icon: 'tool-media',
				kbd: 'cmd+u,ctrl+u',
				onSelect(source) {
					helpers.insertMedia()
					onToolSelect(source, this, 'media')
				},
			},
			{
				id: 'note',
				label: 'tool.note',
				icon: 'tool-note',
				kbd: 'n',
				onSelect(source) {
					editor.setCurrentTool('note')
					onToolSelect(source, this)
				},
				onDragStart(source, info) {
					onDragFromToolbarToCreateShape(editor, info, {
						createShape: (id) => editor.createShape({ id, type: 'note' }),
						onDragEnd: (id) => {
							editor.setEditingShape(id)
							editor.emit('select-all-text', { shapeId: id })
						},
					})
					trackEvent('drag-tool', { source, id: 'note' })
				},
			},
			{
				id: 'laser',
				label: 'tool.laser',
				readonlyOk: true,
				icon: 'tool-laser',
				kbd: 'k',
				onSelect(source) {
					editor.setCurrentTool('laser')
					onToolSelect(source, this)
				},
			},
			{
				id: 'embed',
				label: 'tool.embed',
				icon: 'dot',
				onSelect(source) {
					helpers.addDialog({ component: EmbedDialog })
					onToolSelect(source, this)
				},
			},
			{
				id: 'highlight',
				label: 'tool.highlight',
				icon: 'tool-highlight',
				// TODO: pick a better shortcut
				kbd: 'shift+d',
				onSelect(source) {
					editor.setCurrentTool('highlight')
					onToolSelect(source, this)
				},
			},
		]

		toolsArray.forEach((t) => (t.onSelect = t.onSelect.bind(t)))

		const tools = Object.fromEntries(toolsArray.map((t) => [t.id, t]))

		if (overrides) {
			return overrides(editor, tools, helpers)
		}

		return tools
	}, [overrides, editor, helpers, onToolSelect, trackEvent])

	return <ToolsContext.Provider value={tools}>{children}</ToolsContext.Provider>
}

/** @public */
export function useTools() {
	const ctx = React.useContext(ToolsContext)

	if (!ctx) {
		throw new Error('useTools must be used within a ToolProvider')
	}

	return ctx
}

/**
 * Options for {@link onDragFromToolbarToCreateShape}.
 * @public
 */
export interface OnDragFromToolbarToCreateShapesOpts {
	/**
	 * Create the shape being dragged. You don't need to worry about positioning it, as it'll be
	 * immediately updated with the correct position.
	 */
	createShape(id: TLShapeId): void
	/**
	 * Called once the drag interaction has finished.
	 */
	onDragEnd?(id: TLShapeId): void
}

/**
 * A helper method to use in {@link TLUiToolItem#onDragStart} to create a shape by dragging it from
 * the toolbar.
 * @public
 */
export function onDragFromToolbarToCreateShape(
	editor: Editor,
	info: TLPointerEventInfo,
	opts: OnDragFromToolbarToCreateShapesOpts
) {
	const { x, y } = editor.inputs.currentPagePoint

	const stoppingPoint = editor.markHistoryStoppingPoint('drag shape tool')
	editor.setCurrentTool('select.translating')

	const id = createShapeId()
	opts.createShape(id)
	const shape = assertExists(editor.getShape(id), 'Shape not found')

	const { w, h } = editor.getShapePageBounds(id)!
	editor.updateShape({ id, type: shape.type, x: x - w / 2, y: y - h / 2 })
	editor.select(id)

	editor.setCurrentTool('select.translating', {
		...info,
		target: 'shape',
		shape: editor.getShape(id),
		isCreating: true,
		creatingMarkId: stoppingPoint,
		onCreate() {
			editor.setCurrentTool('select.idle')
			editor.select(id)
			opts.onDragEnd?.(id)
		},
	})

	editor.getCurrentTool().setCurrentToolIdMask(shape.type)
}
