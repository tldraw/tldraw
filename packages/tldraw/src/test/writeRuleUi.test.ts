import {
	atom,
	computed,
	createShapeId,
	TLRecordChange,
	TLShape,
	TLRecord,
	TLWriteRule,
	TLWriteRuleSession,
} from '@tldraw/editor'
import { canDeletePage, canUpdatePage } from '../lib/ui/components/PageMenu/edit-pages-shared'
import { fakeLicense } from './fakeLicense'
import { TestEditor } from './TestEditor'

let editor: TestEditor
const session: TLWriteRuleSession = {
	sessionId: 's',
	userId: 'alice',
	meta: undefined,
	access: { document: 'write', objects: 'write' },
	permissions: ['edit'],
}
const box = createShapeId('box')
const update = (): TLRecordChange<TLShape> => {
	const shape = editor.getShape(box)!
	return { type: 'update', prev: shape, next: shape }
}

function setup(rule: TLWriteRule = () => null, getSession?: () => TLWriteRuleSession | null) {
	editor = new TestEditor(
		{ isChangePermitted: 'write-rule' },
		{
			authorize: { rule, ...(getSession ? { getSession } : {}) },
		}
	)
	fakeLicense(editor)
	editor.store.mergeRemoteChanges(() => editor.createShape({ id: box, type: 'geo' }))
	return editor
}

afterEach(() => {
	editor?.dispose()
	vi.restoreAllMocks()
})

it('opts into the configured rule without writes, history or refusal events', () => {
	const rule = vi.fn<TLWriteRule>(({ changes }) =>
		changes[0].type === 'delete' ? { reason: 'keep it' } : null
	)
	setup(rule, () => session)
	rule.mockClear()
	const refused = vi.fn()
	editor.on('refused', refused)
	const records = editor.store.allRecords()
	const history = { undo: editor.getCanUndo(), redo: editor.getCanRedo() }
	const change = update()
	expect(editor.isChangePermitted(change)).toBe(true)
	const args = rule.mock.calls[0][0]
	expect(args.session).toBe(session)
	expect(args.changes).toEqual([change])
	expect(args.before(box)).toBe(change.prev)
	expect(args.after(box)).toBe(change.prev)
	expect(editor.isChangePermitted({ type: 'delete', prev: change.prev!, next: null })).toBe(false)
	expect(editor.store.allRecords()).toEqual(records)
	expect({ undo: editor.getCanUndo(), redo: editor.getCanRedo() }).toEqual(history)
	expect(refused).not.toHaveBeenCalled()
})

it('tracks session grants and records read by the rule', () => {
	const grants = atom<readonly string[]>('grants', ['edit'])
	setup(
		({ session, before }) =>
			session.permissions?.includes('edit') &&
			(before(editor.getCurrentPageId()) as TLRecord)?.meta.editable !== false
				? null
				: { reason: 'no' },
		() => ({ ...session, permissions: grants.get() })
	)
	const answer = computed('answer', () => editor.isChangePermitted(update()))
	expect(answer.get()).toBe(true)
	grants.set([])
	expect(answer.get()).toBe(false)
	grants.set(['edit'])
	expect(answer.get()).toBe(true)
	editor.store.mergeRemoteChanges(() =>
		editor.updatePage({ id: editor.getCurrentPageId(), meta: { editable: false } })
	)
	expect(answer.get()).toBe(false)
})

it('uses the default session for local rules without getSession', () => {
	const rule = vi.fn<TLWriteRule>(() => null)
	setup(rule)
	expect(editor.isChangePermitted(update())).toBe(true)
	expect(rule.mock.calls.at(-1)![0].session).toEqual({
		sessionId: 'local',
		userId: null,
		meta: undefined,
		access: { document: 'write', objects: 'write' },
		permissions: null,
	})
})

it('denies missing sessions and follows their arrival', () => {
	const current = atom<TLWriteRuleSession | null>('session', null)
	const rule = vi.fn<TLWriteRule>(() => null)
	setup(rule, () => current.get())
	rule.mockClear()
	const answer = computed('answer', () => editor.isChangePermitted(update()))
	expect(answer.get()).toBe(false)
	expect(rule).not.toHaveBeenCalled()
	current.set(session)
	expect(answer.get()).toBe(true)
})

it('denies without a rule and catches a throwing rule', () => {
	editor = new TestEditor({ isChangePermitted: 'write-rule' })
	fakeLicense(editor)
	editor.createShape({ id: box, type: 'geo' })
	expect(editor.isChangePermitted(update())).toBe(false)
	editor.dispose()
	const log = vi.spyOn(console, 'error').mockImplementation(() => {})
	setup(() => {
		throw new Error('broken rule')
	})
	expect(editor.isChangePermitted(update())).toBe(false)
	expect(log).toHaveBeenCalled()
})

it('checks access, readonly and locks before the rule', () => {
	const current = atom('session', session)
	const rule = vi.fn<TLWriteRule>(() => null)
	setup(rule, () => current.get())
	rule.mockClear()
	current.set({ ...session, access: { document: 'read', objects: 'write' } })
	expect(editor.isChangePermitted(update())).toBe(false)
	expect(rule).not.toHaveBeenCalled()
	current.set(session)
	editor.store.mergeRemoteChanges(() =>
		editor.updateShape({ id: box, type: 'geo', isLocked: true })
	)
	expect(editor.isChangePermitted(update())).toBe(false)
	expect(rule).not.toHaveBeenCalled()
	editor.store.mergeRemoteChanges(() =>
		editor.updateShape({ id: box, type: 'geo', isLocked: false })
	)
	editor.updateInstanceState({ isReadonly: true })
	expect(editor.isChangePermitted(update())).toBe(false)
	expect(rule).not.toHaveBeenCalled()
})

it('uses object access for object-lane records', () => {
	editor = new TestEditor(
		{ isChangePermitted: 'write-rule' },
		{
			authorize: {
				rule: () => null,
				objectTypes: ['shape'],
				getSession: () => ({ ...session, access: { document: 'write', objects: 'read' } }),
			},
		}
	)
	fakeLicense(editor)
	editor.store.mergeRemoteChanges(() => editor.createShape({ id: box, type: 'geo' }))
	expect(editor.isChangePermitted(update())).toBe(false)
})

it('keeps callback overrides available for compound rules', () => {
	setup(() => ({ reason: 'needs the whole operation' }))
	expect(editor.isChangePermitted(update())).toBe(false)
	editor._setHostPermissions({ isChangePermitted: () => true })
	expect(editor.isChangePermitted(update())).toBe(true)
	editor.updateShape({ id: box, type: 'geo', x: 100 })
	expect(editor.getShape(box)!.x).toBe(0)
})

it('passes explicit page targets and defaults to the current page reactively', () => {
	editor = new TestEditor()
	fakeLicense(editor)
	const first = editor.getCurrentPageId()
	editor.createPage({ name: 'Second' })
	const second = editor.getPages().find((p) => p.id !== first)!
	editor._setHostPermissions({
		isPermitted: (_permission, instance, { pageId }) => {
			expect(instance).toBe(editor)
			return pageId === first
		},
	})
	const answer = computed('answer', () => editor.isPermitted('tl:page:update'))
	expect(answer.get()).toBe(true)
	expect(canUpdatePage(editor, second)).toBe(false)
	expect(canDeletePage(editor, second)).toBe(false)
	editor.setCurrentPage(second.id)
	expect(answer.get()).toBe(false)
	expect(editor.isPermitted('tl:page:update', { pageId: first })).toBe(true)
})
