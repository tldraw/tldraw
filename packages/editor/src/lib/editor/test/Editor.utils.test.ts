import {
	AssetUtil,
	BindingUtil,
	Geometry2d,
	RecordProps,
	Rectangle2d,
	ShapeUtil,
	T,
	TLArrowBinding,
	TLImageAsset,
	TLShape,
	TLUserPreferences,
	arrowBindingProps,
	atom,
	createBindingId,
	createShapeId,
	createTLCurrentUser,
	createTLStore,
} from '../../..'
import { Editor } from '../Editor'

const MY_CUSTOM_SHAPE_TYPE = 'my-custom-shape'

declare module '@tldraw/tlschema' {
	export interface TLGlobalShapePropsMap {
		[MY_CUSTOM_SHAPE_TYPE]: { w: number; h: number; text: string | undefined; isFilled: boolean }
	}
}

type TestBox = TLShape<typeof MY_CUSTOM_SHAPE_TYPE>

class TestBoxUtil extends ShapeUtil<TestBox> {
	static override type = MY_CUSTOM_SHAPE_TYPE
	static override props: RecordProps<TestBox> = {
		w: T.number,
		h: T.number,
		text: T.string.optional(),
		isFilled: T.boolean,
	}
	static override handledAssetTypes = ['image', 'video']
	getDefaultProps(): TestBox['props'] {
		return { w: 100, h: 100, text: '', isFilled: false }
	}
	getGeometry(shape: TestBox): Geometry2d {
		return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true })
	}
	getIndicatorPath() {
		return undefined
	}
	component() {}
}

// Reuse the schema's built-in arrow binding type so the editor package's binding union stays untouched.
class ArrowBindingUtil extends BindingUtil<TLArrowBinding> {
	static override type = 'arrow' as const
	static override props = arrowBindingProps
	getDefaultProps(): Partial<TLArrowBinding['props']> {
		return {}
	}
}

class ImageAssetUtil extends AssetUtil<TLImageAsset> {
	static override type = 'image' as const
	getDefaultProps(): TLImageAsset['props'] {
		return { w: 0, h: 0, name: '', isAnimated: false, mimeType: null, src: null }
	}
	override getSupportedMimeTypes() {
		return ['image/png', 'image/jpeg']
	}
}

class BookmarkAssetUtil extends AssetUtil {
	static override type = 'bookmark' as const
	getDefaultProps() {
		return { title: '', description: '', image: '', favicon: '', src: null }
	}
}

function createIsolatedUser() {
	const userPreferences = atom<TLUserPreferences>('prefs', { id: 'me' })
	return createTLCurrentUser({
		userPreferences,
		setUserPreferences: (prefs) => userPreferences.set(prefs),
	})
}

let editor: Editor

beforeEach(() => {
	editor = new Editor({
		shapeUtils: [TestBoxUtil],
		bindingUtils: [ArrowBindingUtil],
		assetUtils: [ImageAssetUtil, BookmarkAssetUtil],
		tools: [],
		store: createTLStore({
			shapeUtils: [TestBoxUtil],
			bindingUtils: [ArrowBindingUtil],
			assetUtils: [ImageAssetUtil, BookmarkAssetUtil],
		}),
		getContainer: () => document.body,
		user: createIsolatedUser(),
	})
})

afterEach(() => {
	editor.dispose()
})

describe('shape utils', () => {
	it('hasShapeUtil accepts a type, a shape, or a partial', () => {
		const id = createShapeId('box')
		editor.createShape({ id, type: MY_CUSTOM_SHAPE_TYPE })
		expect(editor.hasShapeUtil(MY_CUSTOM_SHAPE_TYPE)).toBe(true)
		expect(editor.hasShapeUtil(editor.getShape(id)!)).toBe(true)
		expect(editor.hasShapeUtil({ id, type: MY_CUSTOM_SHAPE_TYPE })).toBe(true)
		expect(editor.hasShapeUtil('group')).toBe(true)
	})

	it('hasShapeUtil is false for unknown types and inherited object keys', () => {
		expect(editor.hasShapeUtil('nope' as TLShape['type'])).toBe(false)
		expect(editor.hasShapeUtil('toString' as TLShape['type'])).toBe(false)
		expect(
			editor.hasShapeUtil({ id: createShapeId('x'), type: 'constructor' } as unknown as TLShape)
		).toBe(false)
	})

	it('getShapeUtil returns the registered util and throws for unknown types', () => {
		expect(editor.getShapeUtil(MY_CUSTOM_SHAPE_TYPE)).toBeInstanceOf(TestBoxUtil)
		expect(editor.getShapeUtil({ id: createShapeId('x'), type: MY_CUSTOM_SHAPE_TYPE })).toBe(
			editor.getShapeUtil(MY_CUSTOM_SHAPE_TYPE)
		)
		expect(() => editor.getShapeUtil('nope' as TLShape['type'])).toThrow(
			'No shape util found for type "nope"'
		)
	})

	it('getShapeUtilForAssetType maps handled asset types to the util', () => {
		const util = editor.getShapeUtil(MY_CUSTOM_SHAPE_TYPE)
		expect(editor.getShapeUtilForAssetType('image')).toBe(util)
		expect(editor.getShapeUtilForAssetType('video')).toBe(util)
		expect(editor.getShapeUtilForAssetType('bookmark')).toBeUndefined()
		expect(editor.getShapeUtilForAssetType('toString')).toBeUndefined()
	})
})

describe('binding utils', () => {
	it('getBindingUtil accepts a type or a binding', () => {
		const util = editor.getBindingUtil('arrow')
		expect(util).toBeInstanceOf(ArrowBindingUtil)

		const binding = {
			id: createBindingId('b'),
			type: 'arrow',
			fromId: createShapeId('a'),
			toId: createShapeId('b'),
			props: {},
			meta: {},
			typeName: 'binding',
		} as unknown as TLArrowBinding
		expect(editor.getBindingUtil(binding)).toBe(util)
	})

	it('getBindingUtil throws for unknown types', () => {
		expect(() => editor.getBindingUtil('nope' as 'arrow')).toThrow(
			'No binding util found for type "nope"'
		)
		expect(() => editor.getBindingUtil('toString' as 'arrow')).toThrow()
	})
})

describe('asset utils', () => {
	it('getAssetUtil accepts a type or an asset-like object', () => {
		const util = editor.getAssetUtil('image')
		expect(util).toBeInstanceOf(ImageAssetUtil)
		expect(editor.getAssetUtil({ type: 'image' })).toBe(util)
		expect(editor.getAssetUtil('bookmark')).toBeInstanceOf(BookmarkAssetUtil)
	})

	it('getAssetUtil throws for unknown types', () => {
		expect(() => editor.getAssetUtil('video')).toThrow('No asset util found for type "video"')
	})

	it('hasAssetUtil reports registered types only', () => {
		expect(editor.hasAssetUtil('image')).toBe(true)
		expect(editor.hasAssetUtil({ type: 'bookmark' })).toBe(true)
		expect(editor.hasAssetUtil('video')).toBe(false)
		expect(editor.hasAssetUtil('toString')).toBe(false)
	})

	it('getAssetUtilForMimeType finds the util that accepts the mime type', () => {
		expect(editor.getAssetUtilForMimeType('image/png')).toBeInstanceOf(ImageAssetUtil)
		expect(editor.getAssetUtilForMimeType('image/jpeg')).toBeInstanceOf(ImageAssetUtil)
		expect(editor.getAssetUtilForMimeType('image/gif')).toBeNull()
		expect(editor.getAssetUtilForMimeType('text/html')).toBeNull()
	})

	it('has no asset utils when none are registered', () => {
		editor.dispose()
		editor = new Editor({
			shapeUtils: [TestBoxUtil],
			bindingUtils: [],
			tools: [],
			store: createTLStore({ shapeUtils: [TestBoxUtil], bindingUtils: [] }),
			getContainer: () => document.body,
			user: createIsolatedUser(),
		})
		expect(editor.assetUtils).toEqual({})
		expect(editor.hasAssetUtil('image')).toBe(false)
		expect(editor.getAssetUtilForMimeType('image/png')).toBeNull()
	})
})
