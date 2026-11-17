import { atom, computed, createShapeId, TLShape } from '@tldraw/editor'
import { isPermitted } from '@tldraw/permissions'
import { fakeLicense } from './fakeLicense'
import { TestEditor } from './TestEditor'

const box = createShapeId('box')
const child = createShapeId('child')

function setup(options: ConstructorParameters<typeof TestEditor>[0] = {}, storeOptions = {}) {
	const editor = new TestEditor(options, storeOptions)
	fakeLicense(editor)
	editor.createShapes([{ id: box, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } }])
	return editor
}
const update = (shape: TLShape) => ({ type: 'update' as const, prev: shape, next: shape })

describe('isChangePermitted', () => {
	it('allows everything when the host gives no answer', () => {
		const editor = setup()
		const shape = editor.getShape(box)!
		expect(editor.isChangePermitted(update(shape))).toBe(true)
		expect(editor.isChangePermitted({ type: 'delete', prev: shape, next: null })).toBe(true)
	})

	it("asks the host's isChangePermitted, with the change", () => {
		const editor = setup({ isChangePermitted: (change) => change.type !== 'delete' })
		const shape = editor.getShape(box)!
		expect(editor.isChangePermitted(update(shape))).toBe(true)
		expect(editor.isChangePermitted({ type: 'delete', prev: shape, next: null })).toBe(false)
	})

	it("doesn't probe the store's write rule", () => {
		// a rule judges whole operations; asked about one record it would answer the wrong question
		const rule = vi.fn(() => ({ reason: 'no' }))
		const editor = setup(
			{},
			{
				authorize: {
					rule,
					getSession: () => ({
						sessionId: 's',
						userId: null,
						meta: undefined,
						access: { document: 'write', objects: 'write' },
						permissions: null,
					}),
				},
			}
		)
		rule.mockClear()
		const frame = { ...editor.getShape(box)!, type: 'frame' } as TLShape
		expect(editor.isChangePermitted({ type: 'delete', prev: frame, next: null })).toBe(true)
		expect(rule).not.toHaveBeenCalled()
	})

	it('readonly and locks win over the host', () => {
		const editor = setup({ isChangePermitted: () => true })
		editor.createShapes([{ id: child, type: 'geo', parentId: box }])
		editor.toggleLock([box])
		expect(editor.isChangePermitted(update(editor.getShape(box)!))).toBe(false)
		// a locked ancestor counts, like it does for updateShapes
		expect(editor.isChangePermitted(update(editor.getShape(child)!))).toBe(false)
		editor.toggleLock([box])

		editor.updateInstanceState({ isReadonly: true })
		expect(editor.isChangePermitted(update(editor.getShape(box)!))).toBe(false)
	})

	it('follows reactive state the host reads', () => {
		const allowed = atom('allowed', true)
		const editor = setup({ isChangePermitted: () => allowed.get() })
		const answer = computed('answer', () => editor.isChangePermitted(update(editor.getShape(box)!)))
		expect(answer.get()).toBe(true)
		allowed.set(false)
		expect(answer.get()).toBe(false)
	})

	it("doesn't stop editor methods: they try, and the write rule decides", () => {
		const editor = setup({ isChangePermitted: () => false })
		editor.updateShapes([{ id: box, type: 'geo', x: 50 }])
		expect(editor.getShape(box)!.x).toBe(50)
		editor.deleteShapes([box])
		expect(editor.getShape(box)).toBeUndefined()
	})

	it("doesn't gate selection", () => {
		const editor = setup({ isChangePermitted: () => false, isPermitted: () => false })
		editor.selectNone()
		editor.pointerDown(50, 50).pointerUp(50, 50)
		expect(editor.getSelectedShapeIds()).toEqual([box])
		editor.selectNone()
		editor.select(box)
		expect(editor.getSelectedShapeIds()).toEqual([box])
	})
})

describe('isPermitted', () => {
	it('holds every permission when the host gives no answer', () => {
		const editor = setup()
		expect(editor.isPermitted('tl:page:create')).toBe(true)
	})

	it("asks the host's isPermitted, reactively", () => {
		const granted = atom('granted', ['tl:shape:create'])
		const editor = setup({ isPermitted: (permission) => isPermitted(granted.get(), permission) })
		const answer = computed('answer', () => editor.isPermitted('tl:page:create'))
		expect(answer.get()).toBe(false)
		granted.set(['tl:page:create'])
		expect(answer.get()).toBe(true)
	})

	it('is false for every canvas permission on a readonly document', () => {
		const editor = setup({ isPermitted: () => true })
		editor.updateInstanceState({ isReadonly: true })
		expect(editor.isPermitted('tl:shape:create')).toBe(false)
	})
})

describe('getPermissions', () => {
	it('is null without a session', () => {
		expect(setup().getPermissions()).toBeNull()
	})

	it("follows the sync session's permissions", () => {
		const permissions = atom<readonly string[]>('permissions', ['tl:shape:*'])
		const editor = setup({}, { collaboration: { status: null, permissions } })
		const seen = computed('seen', () => editor.getPermissions())
		expect(seen.get()).toEqual(['tl:shape:*'])
		permissions.set(['tl:*'])
		expect(seen.get()).toEqual(['tl:*'])
	})

	it('reads the local session without sync', () => {
		const editor = setup(
			{},
			{
				authorize: {
					rule: () => null,
					getSession: () => ({
						sessionId: 'local',
						userId: 'alice',
						meta: undefined,
						access: { document: 'write', objects: 'write' },
						permissions: ['tl:page:*'],
					}),
				},
			}
		)
		expect(editor.getPermissions()).toEqual(['tl:page:*'])
	})
})

describe('permissions without host callbacks', () => {
	const newPage = (editor: TestEditor) => ({
		type: 'create' as const,
		prev: null,
		next: { ...editor.getCurrentPage(), id: 'page:new' as any },
	})
	const withPermissions = (list: readonly string[] | null, options = {}) =>
		setup(options, {
			collaboration: { status: null, permissions: atom('permissions', list) },
		})

	it('follow the session list when there is one', () => {
		const editor = withPermissions(['tl:shape:*'])
		expect(editor.isPermitted('tl:shape:create')).toBe(true)
		expect(editor.isPermitted('tl:page:create')).toBe(false)
		expect(editor.isChangePermitted(newPage(editor))).toBe(false)
		expect(editor.isChangePermitted(update(editor.getShape(box)!))).toBe(true)
	})

	it('allow everything when permissions are not in use', () => {
		const editor = withPermissions(null)
		expect(editor.isPermitted('tl:page:create')).toBe(true)
		expect(editor.isChangePermitted(newPage(editor))).toBe(true)
	})

	it('allow nothing when the list is empty', () => {
		const editor = withPermissions([])
		expect(editor.isPermitted('tl:shape:create')).toBe(false)
		expect(editor.isChangePermitted(update(editor.getShape(box)!))).toBe(false)
	})

	it("are only narrowed by the host's own callbacks, never widened", () => {
		const none = withPermissions([], { isPermitted: () => true, isChangePermitted: () => true })
		expect(none.isPermitted('tl:page:create')).toBe(false)
		expect(none.isChangePermitted(newPage(none))).toBe(false)
		const all = withPermissions(['tl:*'], {
			isPermitted: (action: string) => action !== 'tl:page:create',
			isChangePermitted: () => false,
		})
		expect(all.isPermitted('tl:page:create')).toBe(false)
		expect(all.isPermitted('tl:page:delete')).toBe(true)
		expect(all.isChangePermitted(newPage(all))).toBe(false)
	})

	it("answer the app's own names, and readonly only turns off the tl: ones", () => {
		const editor = withPermissions(['tl:shape:*', 'classroom:manage'])
		expect(editor.isPermitted('classroom:manage')).toBe(true)
		expect(editor.isPermitted('classroom:grade')).toBe(false)
		editor.updateInstanceState({ isReadonly: true })
		expect(editor.isPermitted('classroom:manage')).toBe(true)
		expect(editor.isPermitted('tl:shape:create:geo')).toBe(false)
	})
})

describe('isPermitted at a place', () => {
	const frame = createShapeId('frame')
	const inFrame = createShapeId('inFrame')

	function withGrants(list: readonly string[]) {
		const editor = setup({}, { collaboration: { status: null, permissions: atom('p', list) } })
		const pageA = editor.getCurrentPageId()
		editor.createShapes([
			{ id: frame, type: 'frame', x: 200, y: 0, props: { w: 200, h: 200 } },
			{ id: inFrame, type: 'geo', parentId: frame, x: 10, y: 10 },
		])
		editor.createPage({ name: 'B' })
		const pageB = editor.getPages()[1].id
		return { editor, pageA, pageB }
	}

	it('walks a shape up through its parents to its page', () => {
		const { editor, pageA, pageB } = withGrants([`tl:shape:update@${frame}`])
		expect(editor.isPermitted('tl:shape:update:geo', inFrame)).toBe(true)
		expect(editor.isPermitted('tl:shape:update:geo', box)).toBe(false)
		expect(editor.isPermitted('tl:shape:update:geo', pageA)).toBe(false)
		expect(editor.isPermitted('tl:shape:update:geo', pageB)).toBe(false)
	})

	it('defaults to the current page, where a grant on one of its shapes counts', () => {
		const { editor, pageB } = withGrants([`tl:shape:create@${frame}`])
		expect(editor.isPermitted('tl:shape:create:geo')).toBe(true)
		editor.setCurrentPage(pageB)
		expect(editor.isPermitted('tl:shape:create:geo')).toBe(false)
	})

	it('passes the place to the host callback', () => {
		const places: string[] = []
		const editor = setup({
			isPermitted: (_action, _editor, place) => (places.push(place), true),
		})
		editor.isPermitted('tl:shape:update:geo', box)
		editor.isPermitted('tl:page:create')
		expect(places).toEqual([box, editor.getCurrentPageId()])
	})
})
