import {
	AssetUtil,
	DEFAULT_SUPPORT_VIDEO_TYPES,
	DEFAULT_SUPPORTED_IMAGE_TYPES,
	T,
	TLAsset,
	TLAssetId,
} from '@tldraw/editor'
import { TestEditor } from '../test/TestEditor'
import { defaultAssetUtils } from './defaultAssetUtils'
import { notifyIfFileNotAllowed } from './defaultExternalContentHandlers'

// A custom asset type used only in this test. We avoid declaring it via
// `TLGlobalAssetPropsMap` module augmentation because that would leak into
// other files in the same TS project and corrupt the global asset union.
class TestPdfAssetUtil extends AssetUtil<TLAsset> {
	static override type = 'test-pdf' as any
	static override props = {
		name: T.string,
		mimeType: T.string,
	}
	override getDefaultProps() {
		return { name: '', mimeType: '' } as any
	}
	override getSupportedMimeTypes() {
		return ['application/pdf', 'text/csv']
	}
	override async getAssetFromFile(file: File, assetId: TLAssetId) {
		return {
			id: assetId,
			type: 'test-pdf',
			typeName: 'asset',
			props: { name: file.name, mimeType: file.type },
			meta: {},
		} as any
	}
}

function makeOpts(overrides: Partial<Parameters<typeof notifyIfFileNotAllowed>[2]> = {}) {
	const addToast = vi.fn().mockReturnValue('toast-id')
	return {
		addToast,
		opts: {
			toasts: {
				addToast,
				removeToast: vi.fn().mockReturnValue('toast-id'),
				clearToasts: vi.fn(),
				toasts: { get: () => [] } as any,
			},
			msg: ((key: string) => key) as any,
			...overrides,
		},
	}
}

describe('notifyIfFileNotAllowed', () => {
	let editor: TestEditor

	afterEach(() => {
		editor?.dispose()
	})

	it('accepts files whose MIME type is supported by a registered asset util', () => {
		editor = new TestEditor({ assetUtils: defaultAssetUtils })
		const file = new File(['x'], 'a.png', { type: 'image/png' })
		const { opts, addToast } = makeOpts()

		expect(notifyIfFileNotAllowed(editor, file, opts)).toBe(true)
		expect(addToast).not.toHaveBeenCalled()
	})

	it('accepts files supported by a custom AssetUtil even when default MIME lists are forwarded', () => {
		// Regression: <Tldraw> forwards DEFAULT_SUPPORTED_IMAGE_TYPES /
		// DEFAULT_SUPPORT_VIDEO_TYPES into this function. The previous logic
		// short-circuited to checking only those lists when either was provided,
		// which silently rejected custom MIME types (e.g. application/pdf)
		// registered via assetUtils. The check must OR the asset-util branch with
		// the explicit-list branch so custom asset types still work in the
		// default <Tldraw> flow. This test mimics that flow exactly.
		editor = new TestEditor({
			assetUtils: [...defaultAssetUtils, TestPdfAssetUtil] as any,
		})
		const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' })
		const { opts, addToast } = makeOpts()

		expect(
			notifyIfFileNotAllowed(editor, file, {
				...opts,
				acceptedImageMimeTypes: DEFAULT_SUPPORTED_IMAGE_TYPES,
				acceptedVideoMimeTypes: DEFAULT_SUPPORT_VIDEO_TYPES,
			})
		).toBe(true)
		expect(addToast).not.toHaveBeenCalled()
	})

	it('accepts files supported by a custom AssetUtil when no explicit MIME lists are provided', () => {
		editor = new TestEditor({
			assetUtils: [...defaultAssetUtils, TestPdfAssetUtil] as any,
		})
		const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' })
		const { opts, addToast } = makeOpts()

		expect(notifyIfFileNotAllowed(editor, file, opts)).toBe(true)
		expect(addToast).not.toHaveBeenCalled()
	})

	it('rejects files with no matching asset util and no explicit list match', () => {
		editor = new TestEditor({ assetUtils: defaultAssetUtils })
		const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' })
		const { opts, addToast } = makeOpts()

		expect(notifyIfFileNotAllowed(editor, file, opts)).toBe(false)
		expect(addToast).toHaveBeenCalledWith(
			expect.objectContaining({
				title: 'assets.files.type-not-allowed',
				severity: 'error',
			})
		)
	})

	it('falls back to explicit acceptedImageMimeTypes for direct callers', () => {
		// Direct callers of notifyIfFileNotAllowed (e.g. templates) may pass
		// explicit lists without configuring asset utils. In that case the
		// explicit allow-list is honored.
		editor = new TestEditor({ assetUtils: [] })
		const file = new File(['x'], 'a.png', { type: 'image/png' })
		const { opts: optsAllowed, addToast: addToastAllowed } = makeOpts()
		const { opts: optsRejected, addToast: addToastRejected } = makeOpts()

		expect(
			notifyIfFileNotAllowed(editor, file, {
				...optsAllowed,
				acceptedImageMimeTypes: ['image/png'],
			})
		).toBe(true)
		expect(addToastAllowed).not.toHaveBeenCalled()

		expect(
			notifyIfFileNotAllowed(editor, file, {
				...optsRejected,
				acceptedImageMimeTypes: ['image/jpeg'],
			})
		).toBe(false)
		expect(addToastRejected).toHaveBeenCalledWith(
			expect.objectContaining({ title: 'assets.files.type-not-allowed' })
		)
	})

	it('shows an upload-failed toast when a file has no MIME type', () => {
		editor = new TestEditor({ assetUtils: defaultAssetUtils })
		// Force a registered util to claim the empty type so the type-not-allowed
		// branch is skipped and we exercise the no-MIME-type guard below it.
		vi.spyOn(editor, 'getAssetUtilForMimeType').mockReturnValue(editor.getAssetUtil('image') as any)
		const file = new File(['x'], 'noext', { type: '' })
		const { opts, addToast } = makeOpts()

		expect(notifyIfFileNotAllowed(editor, file, opts)).toBe(false)
		expect(addToast).toHaveBeenCalledWith(
			expect.objectContaining({ title: 'assets.files.upload-failed' })
		)
	})

	it('rejects files larger than maxAssetSize', () => {
		editor = new TestEditor({ assetUtils: defaultAssetUtils })
		const file = new File([new Uint8Array(11 * 1024 * 1024)], 'big.png', {
			type: 'image/png',
		})
		const { opts, addToast } = makeOpts()

		expect(notifyIfFileNotAllowed(editor, file, opts)).toBe(false)
		expect(addToast).toHaveBeenCalledWith(
			expect.objectContaining({ title: 'assets.files.size-too-big' })
		)
	})
})
