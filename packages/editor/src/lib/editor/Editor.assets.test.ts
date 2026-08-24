import { vi } from 'vitest'
import {
	AssetRecordType,
	Geometry2d,
	RecordProps,
	Rectangle2d,
	ShapeUtil,
	T,
	TLAssetId,
	TLImageAsset,
	TLShape,
	TLUserPreferences,
	atom,
	createTLCurrentUser,
	createTLStore,
} from '../..'
import { Editor } from './Editor'

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

function createIsolatedUser() {
	const userPreferences = atom<TLUserPreferences>('prefs', { id: 'me' })
	return createTLCurrentUser({
		userPreferences,
		setUserPreferences: (prefs) => userPreferences.set(prefs),
	})
}

function imageAsset(id: TLAssetId, name = 'image.png'): TLImageAsset {
	return AssetRecordType.create({
		id,
		type: 'image',
		props: {
			w: 100,
			h: 50,
			name,
			isAnimated: false,
			mimeType: 'image/png',
			src: 'https://example.com/image.png',
		},
	}) as TLImageAsset
}

const ids = {
	a: AssetRecordType.createId('a'),
	b: AssetRecordType.createId('b'),
}

const remove = vi.fn(async () => {})

let editor: Editor

beforeEach(() => {
	remove.mockClear()
	editor = new Editor({
		shapeUtils: [TestBoxUtil],
		bindingUtils: [],
		tools: [],
		store: createTLStore({
			shapeUtils: [TestBoxUtil],
			bindingUtils: [],
			assets: { upload: async () => ({ src: '' }), remove },
		}),
		getContainer: () => document.body,
		user: createIsolatedUser(),
	})
})

afterEach(() => {
	editor.dispose()
})

describe('createAssets and getAsset', () => {
	it('creates assets that can be looked up by id or record', () => {
		const asset = imageAsset(ids.a)
		expect(editor.createAssets([asset])).toBe(editor)
		expect(editor.getAsset(ids.a)).toEqual(asset)
		expect(editor.getAsset(asset)).toEqual(asset)
		expect(editor.getAssets()).toEqual([asset])
	})

	it('getAsset is undefined for unknown ids', () => {
		expect(editor.getAsset(ids.a)).toBeUndefined()
		expect(editor.getAssets()).toEqual([])
	})

	it('ignores empty input and readonly mode', () => {
		editor.createAssets([])
		expect(editor.getAssets()).toEqual([])

		editor.updateInstanceState({ isReadonly: true })
		editor.createAssets([imageAsset(ids.a)])
		expect(editor.getAssets()).toEqual([])
	})

	it('is not recorded in history', () => {
		editor.createAssets([imageAsset(ids.a)])
		expect(editor.getCanUndo()).toBe(false)
		editor.undo()
		expect(editor.getAsset(ids.a)).toBeDefined()
	})

	it('getAssets is reactive', () => {
		let count = -1
		const stop = editor.store.listen(() => {
			count = editor.getAssets().length
		})
		try {
			editor.createAssets([imageAsset(ids.a), imageAsset(ids.b)])
			expect(count).toBe(2)
		} finally {
			stop()
		}
	})
})

describe('updateAssets', () => {
	beforeEach(() => {
		editor.createAssets([imageAsset(ids.a), imageAsset(ids.b, 'b.png')])
	})

	it('merges partials into existing assets', () => {
		expect(
			editor.updateAssets([
				{ id: ids.a, type: 'image', props: { ...imageAsset(ids.a).props, name: 'renamed.png' } },
				{ id: ids.b, type: 'image', meta: { tag: 'x' } },
			])
		).toBe(editor)
		expect(editor.getAsset<TLImageAsset>(ids.a)?.props.name).toBe('renamed.png')
		expect(editor.getAsset(ids.b)).toMatchObject({ meta: { tag: 'x' }, props: { name: 'b.png' } })
	})

	it('ignores empty input and readonly mode', () => {
		editor.updateAssets([])
		editor.updateInstanceState({ isReadonly: true })
		editor.updateAssets([{ id: ids.a, type: 'image', meta: { tag: 'x' } }])
		expect(editor.getAsset(ids.a)?.meta).toEqual({})
	})

	it('is not recorded in history', () => {
		editor.updateAssets([{ id: ids.a, type: 'image', meta: { tag: 'x' } }])
		expect(editor.getCanUndo()).toBe(false)
	})
})

describe('deleteAssets', () => {
	beforeEach(() => {
		editor.createAssets([imageAsset(ids.a), imageAsset(ids.b)])
	})

	it('removes assets by id and notifies the asset store', () => {
		expect(editor.deleteAssets([ids.a])).toBe(editor)
		expect(editor.getAsset(ids.a)).toBeUndefined()
		expect(editor.getAssets().map((a) => a.id)).toEqual([ids.b])
		expect(remove).toHaveBeenCalledWith([ids.a])
	})

	it('removes assets by record', () => {
		editor.deleteAssets([editor.getAsset(ids.a)!, editor.getAsset(ids.b)!])
		expect(editor.getAssets()).toEqual([])
		expect(remove).toHaveBeenCalledWith([ids.a, ids.b])
	})

	it('ignores empty input and readonly mode', () => {
		editor.deleteAssets([])
		editor.updateInstanceState({ isReadonly: true })
		editor.deleteAssets([ids.a])
		expect(editor.getAssets()).toHaveLength(2)
		expect(remove).not.toHaveBeenCalled()
	})

	it('is not recorded in history', () => {
		editor.deleteAssets([ids.a])
		expect(editor.getCanUndo()).toBe(false)
		editor.undo()
		expect(editor.getAsset(ids.a)).toBeUndefined()
	})
})
