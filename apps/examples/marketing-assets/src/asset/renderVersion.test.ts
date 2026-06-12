import { createShapeId, Editor, TLShapeId } from 'tldraw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeEditor } from '../test/makeEditor'
import { getCurrentVersion } from './assetRecord'
import { AssetVersion, MARKETING_ASSET_TYPE, MarketingAssetShape } from './assetShape'
import { MarketingAssetShapeUtil } from './AssetShapeUtil'
import { getRenderProgress, renderFromAnnotations, renderFromBrief } from './renderVersion'

// The pipeline orchestrates three external seams — the model API, the brand, and the
// byte/upload conversions. Stub them so the tests exercise the orchestration: which
// calls are made, in what shape, and how their results land on the asset record.
vi.mock('../api/marketingApi', () => ({
	apiGenerate: vi.fn(),
	apiPlan: vi.fn(),
}))
vi.mock('../brand/brandState', () => ({
	getBrand: vi.fn(() => ({})),
	serializeBrand: vi.fn(() => 'brand-text'),
	brandReferenceImages: vi.fn(() => ['brand-ref']),
}))
vi.mock('./assetBytes', () => ({
	blobToDataUrl: vi.fn(async () => 'data:composite'),
	urlToDataUrl: vi.fn(async () => 'data:current-background'),
	uploadImageBytes: vi.fn(async () => 'https://r2.example/stored.png'),
}))

import { apiGenerate, apiPlan } from '../api/marketingApi'

const OUTPUT_TYPE = { id: 'ig-square', label: 'Square', width: 1080, height: 1080 }

let editor: Editor
let id: TLShapeId

beforeEach(() => {
	vi.clearAllMocks()
	editor = makeEditor([MarketingAssetShapeUtil])
	// toImage can't run headless; the bytes are stubbed downstream anyway.
	editor.toImage = vi.fn(async () => ({ blob: new Blob(), width: 1, height: 1 })) as never
	id = createShapeId()
	editor.createShape<MarketingAssetShape>({
		id,
		type: MARKETING_ASSET_TYPE,
		props: {
			w: 100,
			h: 100,
			outputTypeId: 'ig-square',
			prompt: 'a brief',
			versions: [],
			currentVersion: 0,
			status: 'generating',
			error: '',
			generatingStartedAt: 1000,
			verdict: 'none',
		},
	})
})

const shape = () => editor.getShape<MarketingAssetShape>(id)!

describe('renderFromBrief', () => {
	it('generates a background, plans the text, and commits one idle version', async () => {
		vi.mocked(apiGenerate).mockResolvedValue({ imageUrl: 'data:generated' })
		vi.mocked(apiPlan).mockResolvedValue({
			textLayers: [],
			caption: 'a caption',
			backgroundInstructions: [],
		})

		const committed = await renderFromBrief(editor, id, {
			outputType: OUTPUT_TYPE,
			prompt: 'a brief',
			references: ['extra-ref'],
			captionAngle: 'bold',
		})

		expect(committed).toBe(true)
		// brand references precede the caller's extra references.
		expect(apiGenerate).toHaveBeenCalledWith(
			expect.objectContaining({ referenceImages: ['brand-ref', 'extra-ref'] })
		)
		// the planner sees the freshly generated background and the caption angle.
		expect(apiPlan).toHaveBeenCalledWith(
			expect.objectContaining({ mode: 'create', image: 'data:generated', captionAngle: 'bold' })
		)
		expect(shape().props.status).toBe('idle')
		expect(shape().props.versions).toHaveLength(1)
		expect(getCurrentVersion(shape())).toMatchObject({ caption: 'a caption', instruction: '' })
	})

	it('marks the shape failed and commits nothing when generation throws', async () => {
		vi.mocked(apiGenerate).mockRejectedValue(new Error('model down'))

		const committed = await renderFromBrief(editor, id, {
			outputType: OUTPUT_TYPE,
			prompt: 'a brief',
			references: [],
		})

		expect(committed).toBe(false)
		expect(apiPlan).not.toHaveBeenCalled()
		expect(shape().props.status).toBe('error')
		expect(shape().props.error).toBe('model down')
		expect(shape().props.versions).toHaveLength(0)
	})
})

describe('renderFromAnnotations', () => {
	const current: AssetVersion = {
		assetId: 'asset-old',
		textLayers: [],
		caption: 'old caption',
		instruction: '',
		createdAt: 1,
	}
	const input = {
		outputType: OUTPUT_TYPE,
		prompt: 'a brief',
		currentVersion: current,
		currentSrc: 'https://r2.example/old.png',
		compositeShapeIds: [] as TLShapeId[],
		instructions: ['Change the top: bigger logo.'],
	}

	it('reuses the existing background when the plan returns no edits', async () => {
		vi.mocked(apiPlan).mockResolvedValue({
			textLayers: [],
			caption: 'new caption',
			backgroundInstructions: [],
		})

		const committed = await renderFromAnnotations(editor, id, input)

		expect(committed).toBe(true)
		expect(apiGenerate).not.toHaveBeenCalled()
		expect(apiPlan).toHaveBeenCalledWith(
			expect.objectContaining({ mode: 'revise', annotations: input.instructions })
		)
		expect(getCurrentVersion(shape())).toMatchObject({
			assetId: 'asset-old',
			caption: 'new caption',
			instruction: 'Text updated',
		})
	})

	it('applies each background edit as its own pass and stores a fresh background', async () => {
		vi.mocked(apiPlan).mockResolvedValue({
			textLayers: [],
			caption: 'new caption',
			backgroundInstructions: ['darken sky', 'add logo'],
		})
		vi.mocked(apiGenerate).mockResolvedValue({ imageUrl: 'data:edited' })

		const committed = await renderFromAnnotations(editor, id, input)

		expect(committed).toBe(true)
		expect(apiGenerate).toHaveBeenCalledTimes(2)
		const v = getCurrentVersion(shape())!
		expect(v.assetId).not.toBe('asset-old')
		expect(v.instruction).toBe('darken sky\nadd logo')
	})

	it('caps the edit passes at the maximum, folding overflow into the last step', async () => {
		const ten = Array.from({ length: 10 }, (_, i) => `edit ${i}`)
		vi.mocked(apiPlan).mockResolvedValue({
			textLayers: [],
			caption: 'c',
			backgroundInstructions: ten,
		})
		vi.mocked(apiGenerate).mockResolvedValue({ imageUrl: 'data:edited' })

		await renderFromAnnotations(editor, id, input)

		// MAX_RENDER_STEPS = 8: seven single edits plus one merged final step.
		expect(apiGenerate).toHaveBeenCalledTimes(8)
		expect(getCurrentVersion(shape())!.instruction.split('\n')).toHaveLength(8)
	})

	it('clears the transient render progress once the render settles', async () => {
		vi.mocked(apiPlan).mockResolvedValue({
			textLayers: [],
			caption: 'c',
			backgroundInstructions: ['one edit'],
		})
		vi.mocked(apiGenerate).mockResolvedValue({ imageUrl: 'data:edited' })

		await renderFromAnnotations(editor, id, input)

		expect(getRenderProgress(id)).toBeUndefined()
	})
})
