import { AssetRecordType, createShapeId, Editor, TLShapeId, toRichText } from 'tldraw'

/** Left image under the broken spread (5 clipping ancestors). */
export const BROKEN_LEFT_IMAGE_ID = createShapeId('broken-leftImage')

const WORKING_SPREAD_ID = createShapeId('spread')
const BROKEN_SPREAD_ID = createShapeId('broken-spread')

const SAMPLE_IMAGE_ASSET_ID = AssetRecordType.createId()

function createSampleImageAsset(editor: Editor) {
	editor.createAssets([
		{
			id: SAMPLE_IMAGE_ASSET_ID,
			type: 'image',
			typeName: 'asset',
			props: {
				name: 'sample.png',
				src: '/tldraw.png',
				w: 1200,
				h: 675,
				mimeType: 'image/png',
				isAnimated: false,
			},
			meta: {},
		},
	])
}

function clearPage(editor: Editor) {
	const shapes = editor.getCurrentPageShapes()
	if (shapes.length > 0) {
		editor.deleteShapes(shapes.map((s) => s.id))
	}
}

function placeNoteLeftOf(editor: Editor, noteId: TLShapeId, anchorX: number, anchorY: number) {
	const bounds = editor.getShapePageBounds(noteId)
	if (!bounds) return
	editor.updateShape({
		id: noteId,
		type: 'note',
		x: anchorX - bounds.w - 40,
		y: anchorY,
	})
}

function placeNoteRightOf(editor: Editor, noteId: TLShapeId, anchorX: number, anchorY: number) {
	editor.updateShape({
		id: noteId,
		type: 'note',
		x: anchorX + 40,
		y: anchorY,
	})
}

/** Working spread (1 clip) + broken spread (4 nested clips), from external customer repro. */
export function setupCustomerSpreadScene(editor: Editor) {
	clearPage(editor)
	createSampleImageAsset(editor)

	const pageId = editor.getCurrentPageId()
	const originX = 100
	const originY = 100

	// --- Working spread ---
	const spreadId = WORKING_SPREAD_ID
	const leftPageId = createShapeId('leftPage')
	const rightPageId = createShapeId('rightPage')
	const leftTemplateId = createShapeId('leftTemplate')
	const rightTemplateId = createShapeId('rightTemplate')
	const leftLayoutId = createShapeId('leftLayout')
	const rightLayoutId = createShapeId('rightLayout')
	const leftImageId = createShapeId('leftImage')
	const rightPlaceholderId = createShapeId('rightPlaceholder')

	editor.createShape({
		id: spreadId,
		type: 'frame',
		x: originX,
		y: originY,
		parentId: pageId,
		props: { w: 800, h: 600, name: 'Spread' },
		meta: { role: 'spread' },
	})

	editor.createShape({
		id: leftPageId,
		type: 'frame',
		x: originX,
		y: originY,
		parentId: pageId,
		props: { w: 400, h: 600, name: 'Left Page' },
		meta: { role: 'page' },
	})
	editor.createShape({
		id: rightPageId,
		type: 'frame',
		x: originX + 400,
		y: originY,
		parentId: pageId,
		props: { w: 400, h: 600, name: 'Right Page' },
		meta: { role: 'page' },
	})

	editor.reparentShapes([leftPageId, rightPageId], spreadId)

	editor.createShape({
		id: leftTemplateId,
		type: 'frame',
		x: originX,
		y: originY,
		parentId: pageId,
		props: { w: 400, h: 600, name: 'Left Template' },
		meta: { role: 'template' },
	})
	editor.createShape({
		id: rightTemplateId,
		type: 'frame',
		x: originX + 400,
		y: originY,
		parentId: pageId,
		props: { w: 400, h: 600, name: 'Right Template' },
		meta: { role: 'template' },
	})

	editor.createShape({
		id: leftLayoutId,
		type: 'frame',
		x: originX,
		y: originY,
		parentId: pageId,
		props: { w: 400, h: 600, name: 'Left Layout' },
		meta: { role: 'layout' },
	})
	editor.createShape({
		id: rightLayoutId,
		type: 'frame',
		x: originX + 400,
		y: originY,
		parentId: pageId,
		props: { w: 400, h: 600, name: 'Right Layout' },
		meta: { role: 'layout' },
	})

	editor.createShape({
		id: leftImageId,
		type: 'image',
		x: originX,
		y: originY,
		parentId: pageId,
		props: { w: 400, h: 600, assetId: SAMPLE_IMAGE_ASSET_ID },
	})
	editor.createShape({
		id: rightPlaceholderId,
		type: 'frame',
		x: originX + 400,
		y: originY,
		parentId: pageId,
		props: { w: 400, h: 600, name: 'Right Placeholder' },
		meta: { role: 'placeholder' },
	})

	editor.reparentShapes([leftTemplateId], leftPageId)
	editor.reparentShapes([rightTemplateId], rightPageId)
	editor.reparentShapes([leftLayoutId], leftTemplateId)
	editor.reparentShapes([rightLayoutId], rightTemplateId)
	editor.reparentShapes([leftImageId], leftLayoutId)
	editor.reparentShapes([rightPlaceholderId], rightLayoutId)

	const workingNoteId = createShapeId('working-legend')
	editor.createShape({
		id: workingNoteId,
		type: 'note',
		x: 0,
		y: originY,
		parentId: pageId,
		props: {
			richText: toRichText(
				'Working (1 clip)\n\n■ spread clips\n✗ page, template, layout\n\nLeft: image · Right: empty frame'
			),
			color: 'violet',
			size: 's',
		},
	})
	placeNoteLeftOf(editor, workingNoteId, originX, originY)

	// --- Broken spread (offset to the right) ---
	const brokenSpreadX = originX + 800 + 100

	const brokenLeftPageId = createShapeId('broken-leftPage')
	const brokenRightPageId = createShapeId('broken-rightPage')
	const brokenLeftTemplateId = createShapeId('broken-leftTemplate')
	const brokenRightTemplateId = createShapeId('broken-rightTemplate')
	const brokenLeftLayoutId = createShapeId('broken-leftLayout')
	const brokenRightLayoutId = createShapeId('broken-rightLayout')
	const brokenRightPlaceholderId = createShapeId('broken-rightPlaceholder')

	editor.createShape({
		id: BROKEN_SPREAD_ID,
		type: 'frame',
		x: brokenSpreadX,
		y: originY,
		parentId: pageId,
		props: { w: 800, h: 600, name: 'Broken Spread' },
		meta: { role: 'broken-spread' },
	})

	editor.createShape({
		id: brokenLeftPageId,
		type: 'frame',
		x: brokenSpreadX,
		y: originY,
		parentId: pageId,
		props: { w: 400, h: 600, name: 'Left Page' },
		meta: { role: 'broken-page' },
	})
	editor.createShape({
		id: brokenRightPageId,
		type: 'frame',
		x: brokenSpreadX + 400,
		y: originY,
		parentId: pageId,
		props: { w: 400, h: 600, name: 'Right Page' },
		meta: { role: 'broken-page' },
	})

	editor.createShape({
		id: brokenLeftTemplateId,
		type: 'frame',
		x: brokenSpreadX,
		y: originY,
		parentId: pageId,
		props: { w: 400, h: 600, name: 'Left Template' },
		meta: { role: 'broken-template' },
	})
	editor.createShape({
		id: brokenRightTemplateId,
		type: 'frame',
		x: brokenSpreadX + 400,
		y: originY,
		parentId: pageId,
		props: { w: 400, h: 600, name: 'Right Template' },
		meta: { role: 'broken-template' },
	})

	editor.createShape({
		id: brokenLeftLayoutId,
		type: 'frame',
		x: brokenSpreadX,
		y: originY,
		parentId: pageId,
		props: { w: 400, h: 600, name: 'Left Layout' },
		meta: { role: 'broken-layout' },
	})
	editor.createShape({
		id: brokenRightLayoutId,
		type: 'frame',
		x: brokenSpreadX + 400,
		y: originY,
		parentId: pageId,
		props: { w: 400, h: 600, name: 'Right Layout' },
		meta: { role: 'broken-layout' },
	})

	editor.createShape({
		id: BROKEN_LEFT_IMAGE_ID,
		type: 'image',
		x: brokenSpreadX,
		y: originY,
		parentId: pageId,
		props: { w: 400, h: 600, assetId: SAMPLE_IMAGE_ASSET_ID },
	})
	editor.createShape({
		id: brokenRightPlaceholderId,
		type: 'frame',
		x: brokenSpreadX + 400,
		y: originY,
		parentId: pageId,
		props: { w: 400, h: 600, name: 'Right Placeholder' },
		meta: { role: 'broken-placeholder' },
	})

	editor.reparentShapes([brokenLeftPageId, brokenRightPageId], BROKEN_SPREAD_ID)
	editor.reparentShapes([brokenLeftTemplateId], brokenLeftPageId)
	editor.reparentShapes([brokenRightTemplateId], brokenRightPageId)
	editor.reparentShapes([brokenLeftLayoutId], brokenLeftTemplateId)
	editor.reparentShapes([brokenRightLayoutId], brokenRightTemplateId)
	editor.reparentShapes([BROKEN_LEFT_IMAGE_ID], brokenLeftLayoutId)
	editor.reparentShapes([brokenRightPlaceholderId], brokenRightLayoutId)

	const brokenNoteId = createShapeId('broken-legend')
	editor.createShape({
		id: brokenNoteId,
		type: 'note',
		x: brokenSpreadX + 800,
		y: originY,
		parentId: pageId,
		props: {
			richText: toRichText(
				'Broken (4 clips)\n\n■ spread, page, template, layout\n\nSame geometry stacked → old SDK wedge'
			),
			color: 'red',
			size: 's',
		},
	})
	placeNoteRightOf(editor, brokenNoteId, brokenSpreadX + 800, originY)

	editor.selectNone()
	editor.zoomToFit({ animation: { duration: 0 } })
}
