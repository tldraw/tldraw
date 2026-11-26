import { Editor, coreShapes, createTLStore, type TLContent, type TLThemeId } from 'tldraw'
import { getThumbnailExport } from './save-shapes'

const coreShapeTypes = new Set<string>(coreShapes.map((util) => util.type))

const constructorsOf = <T extends object>(utils: { readonly [type: string]: T | undefined }) =>
	Object.entries(utils).flatMap(([type, util]) =>
		util && !coreShapeTypes.has(type) ? [util.constructor as never] : []
	)

export interface ItemPreviewOptions {
	darkMode: boolean
	themeId: TLThemeId
}

/**
 * Renders an item's content as a saved thumbnail would look, or null when it has no shapes. The
 * content is placed in an editor of its own, made with `host`'s shapes, bindings, assets and
 * themes, so nothing is added to `host`'s document.
 */
export async function renderItemPreview(
	host: Editor,
	content: TLContent,
	{ darkMode, themeId }: ItemPreviewOptions
): Promise<Blob | null> {
	const doc = host.getContainerDocument()
	const container = doc.createElement('div')
	container.className = 'tl-container'
	container.setAttribute('aria-hidden', 'true')
	container.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden'
	doc.body.appendChild(container)
	const editor = new Editor({
		store: createTLStore({ schema: host.store.schema, assets: host.store.props.assets }),
		shapeUtils: constructorsOf(host.shapeUtils),
		bindingUtils: constructorsOf(host.bindingUtils),
		assetUtils: constructorsOf(host.assetUtils),
		tools: [],
		getContainer: () => container,
		themes: host.getThemes(),
		options: host.options,
	})
	try {
		editor.setCurrentTheme(themeId)
		editor.putContentOntoCurrentPage(content, { select: true })
		const shapeIds = editor.getSelectedShapeIds()
		if (shapeIds.length === 0) return null
		const { ids, ...options } = getThumbnailExport(editor, shapeIds)
		const { blob } = await editor.toImage(ids, { ...options, darkMode })
		return blob
	} finally {
		editor.dispose()
		container.remove()
	}
}
