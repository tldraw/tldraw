import { Editor, EditorManager } from '@tldraw/editor'
import {
	createCanvasMeasureContext,
	installMeasureContext,
	releaseMeasureContext,
	MeasureContext,
} from '@tldraw/rich-text-layout'
import { createTldrawTextMeasurer, TldrawTextMeasurer } from './createTldrawTextMeasurer'
import { tipTapDefaultExtensions } from './richText'

/**
 * The layout capability required by native SVG export, independent of shape measurement.
 * @public
 */
export type TLNativeTextExportMeasurer = Pick<TldrawTextMeasurer, 'layoutRichText'>

const managers = new WeakMap<Editor, NativeTextExportManager>()

function getManager(editor: Editor) {
	if (editor.isDisposed) throw new Error('Cannot configure text export on a disposed editor')
	const existing = managers.get(editor)
	if (existing) return existing
	const manager = new NativeTextExportManager(editor)
	managers.set(editor, manager)
	editor.disposables.add(() => {
		manager.dispose()
		managers.delete(editor)
	})
	return manager
}

/**
 * Supply the layout provider for native SVG text export. The caller owns the provider and its
 * fonts; export does not dispose it. The provider must handle any custom rich text extensions.
 * Returns a function that removes this registration.
 * @public
 */
export function setNativeTextExportMeasurer(
	editor: Editor,
	measurer: TLNativeTextExportMeasurer
): () => void {
	const manager = getManager(editor)
	return manager.setProvider(measurer)
}

/** @internal */
export function getExportTextMeasurer(editor: Editor): Promise<TLNativeTextExportMeasurer | null> {
	return getManager(editor).getMeasurer()
}

class NativeTextExportManager extends EditorManager {
	private provider: { measurer: TLNativeTextExportMeasurer } | undefined
	private pending: Promise<TLNativeTextExportMeasurer> | undefined
	private context: MeasureContext | undefined
	private disposed = false
	constructor(editor: Editor) {
		super(editor)
		const fonts = editor.getContainerDocument().fonts
		const invalidate = () => this.reset()
		fonts?.addEventListener?.('loading', invalidate)
		fonts?.addEventListener?.('loadingdone', invalidate)
		fonts?.addEventListener?.('loadingerror', invalidate)
		this.register(() => {
			this.disposed = true
			fonts?.removeEventListener?.('loading', invalidate)
			fonts?.removeEventListener?.('loadingdone', invalidate)
			fonts?.removeEventListener?.('loadingerror', invalidate)
			this.reset()
			this.provider = undefined
		})
	}
	private reset() {
		if (this.context) releaseMeasureContext(this.context)
		this.context = undefined
		this.pending = undefined
	}
	setProvider(measurer: TLNativeTextExportMeasurer) {
		this.reset()
		const registration = { measurer }
		this.provider = registration
		return () => {
			if (this.provider === registration) this.provider = undefined
		}
	}
	getMeasurer(): Promise<TLNativeTextExportMeasurer | null> {
		if (this.disposed) return Promise.reject(new Error('Text export manager is disposed'))
		if (this.provider) return Promise.resolve(this.provider.measurer)
		const extensions = this.editor.getTextOptions().tipTapConfig?.extensions
		// Node classification cannot reproduce custom extensions' HTML and CSS.
		if (extensions && extensions !== tipTapDefaultExtensions) return Promise.resolve(null)
		if (this.pending) return this.pending
		const pending = this.createMeasurer().catch((error) => {
			if (this.pending === pending) this.reset()
			throw error
		})
		this.pending = pending
		return pending
	}
	private async createMeasurer() {
		const canvas = this.editor.getContainerDocument().createElement('canvas')
		const ctx = canvas.getContext('2d')
		if (!ctx)
			throw new Error('Native text export needs a 2D canvas context or an explicit layout provider')
		const context = createCanvasMeasureContext(ctx)
		this.context = context
		await installMeasureContext(context)
		if (this.disposed || this.context !== context) {
			releaseMeasureContext(context)
			throw new Error('Native text export was invalidated while initializing')
		}
		return createTldrawTextMeasurer({
			measureContext: context,
			extensions: this.editor.getTextOptions().tipTapConfig?.extensions,
		})
	}
}
