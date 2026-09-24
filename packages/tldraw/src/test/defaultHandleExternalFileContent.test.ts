import { MediaHelpers, TLImageShape } from '@tldraw/editor'
import { vi } from 'vitest'
import { defaultAssetUtils } from '../lib/defaultAssetUtils'
import {
	defaultHandleExternalFileContent,
	getAssetInfo,
} from '../lib/defaultExternalContentHandlers'
import { TestEditor } from './TestEditor'

let editor: TestEditor
let addToast: ReturnType<typeof vi.fn>

function makeOptions() {
	addToast = vi.fn()
	return {
		toasts: { addToast } as any,
		msg: ((key: string) => key) as any,
	}
}

beforeEach(() => {
	editor = new TestEditor({ assetUtils: defaultAssetUtils })
	vi.spyOn(MediaHelpers, 'isAnimated').mockResolvedValue(false)
	// Stand in for the upload stage so only the decode stage is under test.
	vi.spyOn(editor, 'getAssetForExternalContent').mockImplementation(async (info) => {
		if (info.type !== 'file') return undefined
		const asset = await getAssetInfo(editor, info.file)
		if (!asset) return undefined
		return { ...asset, props: { ...asset.props, src: 'data:ok' } } as any
	})
})

afterEach(() => {
	editor?.dispose()
	vi.restoreAllMocks()
})

describe('defaultHandleExternalFileContent', () => {
	it('skips an undecodable image with a toast and still places the others', async () => {
		const goodFile = new File(['good'], 'good.png', { type: 'image/png' })
		const badFile = new File(['not really a png'], 'bad.png', { type: 'image/png' })

		vi.spyOn(MediaHelpers, 'getImageSize').mockImplementation(async (file) => {
			if (file === badFile) throw new Error('Could not load image')
			return { w: 100, h: 50, pixelRatio: 1 }
		})
		vi.spyOn(console, 'error').mockImplementation(() => {})

		await defaultHandleExternalFileContent(
			editor,
			{ point: { x: 0, y: 0 }, files: [badFile, goodFile] },
			makeOptions()
		)

		expect(addToast).toHaveBeenCalledTimes(1)
		expect(addToast).toHaveBeenCalledWith({
			title: 'assets.files.upload-failed',
			severity: 'error',
		})

		const images = editor.getCurrentPageShapes().filter((s) => s.type === 'image')
		expect(images).toHaveLength(1)
		const asset = editor.getAsset((images[0] as TLImageShape).props.assetId!)
		expect(asset?.props).toMatchObject({ name: 'good.png', w: 100, h: 50 })
	})

	it('shows a toast and creates nothing when the only file is undecodable', async () => {
		const badFile = new File(['not really a png'], 'bad.png', { type: 'image/png' })
		vi.spyOn(MediaHelpers, 'getImageSize').mockRejectedValue(new Error('Could not load image'))
		vi.spyOn(console, 'error').mockImplementation(() => {})

		await defaultHandleExternalFileContent(
			editor,
			{ point: { x: 0, y: 0 }, files: [badFile] },
			makeOptions()
		)

		expect(addToast).toHaveBeenCalledTimes(1)
		expect(addToast).toHaveBeenCalledWith({
			title: 'assets.files.upload-failed',
			severity: 'error',
		})
		expect(editor.getCurrentPageShapes()).toHaveLength(0)
		expect(editor.getAssets()).toHaveLength(0)
	})
})
