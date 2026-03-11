import {
	TLGeoShape,
	TLIdentityProvider,
	TLNoteShape,
	createShapeId,
	getTldrawMetaFromShapeMeta,
	tldrawShapeMetaKey,
	toRichText,
} from '@tldraw/editor'
import { TestEditor } from './TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

afterEach(() => {
	editor?.dispose()
})

const ids = {
	box1: createShapeId('box1'),
	note1: createShapeId('note1'),
}

describe('shape attribution (meta.__tldraw)', () => {
	it('sets createdBy and updatedBy as { id, name } on createShapes', () => {
		const userId = editor.user.getId()
		const userName = editor.user.getName()
		editor.createShapes([{ id: ids.box1, type: 'geo', x: 0, y: 0 }])
		const shape = editor.getShape<TLGeoShape>(ids.box1)!
		const tlmeta = getTldrawMetaFromShapeMeta(shape.meta)
		expect(tlmeta.createdBy).toEqual({ id: userId, name: userName })
		expect(tlmeta.updatedBy).toEqual({ id: userId, name: userName })
		expect(tlmeta.createdAt).toBeGreaterThan(0)
		expect(tlmeta.updatedAt).toBeGreaterThan(0)
	})

	it('updates updatedBy but preserves createdBy on updateShapes', () => {
		editor.createShapes([{ id: ids.box1, type: 'geo', x: 0, y: 0 }])
		const created = editor.getShape<TLGeoShape>(ids.box1)!

		editor.updateShape({ id: ids.box1, type: 'geo', x: 50 })
		const updated = editor.getShape<TLGeoShape>(ids.box1)!
		const createdTlmeta = getTldrawMetaFromShapeMeta(created.meta)
		const updatedTlmeta = getTldrawMetaFromShapeMeta(updated.meta)

		expect(updatedTlmeta.createdBy).toEqual(createdTlmeta.createdBy)
		expect(updatedTlmeta.createdAt).toBe(createdTlmeta.createdAt)
		expect(updatedTlmeta.updatedBy).toEqual({
			id: editor.user.getId(),
			name: editor.user.getName(),
		})
		expect(updatedTlmeta.updatedAt).toBeGreaterThanOrEqual(createdTlmeta.updatedAt!)
	})

	it('preserves explicit meta.__tldraw in partial on create', () => {
		const customTlmeta = {
			createdBy: { id: 'custom-user', name: 'Custom' },
			updatedBy: { id: 'custom-user', name: 'Custom' },
			createdAt: 1000,
			updatedAt: 1000,
		}
		editor.createShapes([
			{
				id: ids.box1,
				type: 'geo',
				x: 0,
				y: 0,
				meta: { [tldrawShapeMetaKey]: customTlmeta },
			},
		])
		const shape = editor.getShape<TLGeoShape>(ids.box1)!
		expect(getTldrawMetaFromShapeMeta(shape.meta)).toEqual(customTlmeta)
	})

	it('ignores explicit meta.__tldraw in partial on update', () => {
		editor.createShapes([{ id: ids.box1, type: 'geo', x: 0, y: 0 }])
		const created = editor.getShape<TLGeoShape>(ids.box1)!
		const customTlmeta = {
			createdBy: { id: 'someone-else', name: 'Someone' },
			updatedBy: { id: 'someone-else', name: 'Someone' },
			createdAt: 2000,
			updatedAt: 2000,
		}
		editor.updateShape({
			id: ids.box1,
			type: 'geo',
			x: 50,
			meta: { [tldrawShapeMetaKey]: customTlmeta },
		})
		const shape = editor.getShape<TLGeoShape>(ids.box1)!
		const createdTlmeta = getTldrawMetaFromShapeMeta(created.meta)
		const shapeTlmeta = getTldrawMetaFromShapeMeta(shape.meta)
		expect(shapeTlmeta.createdBy).toEqual(createdTlmeta.createdBy)
		expect(shapeTlmeta.createdAt).toBe(createdTlmeta.createdAt)
		expect(shapeTlmeta.updatedBy).toEqual({
			id: editor.user.getId(),
			name: editor.user.getName(),
		})
		expect(shapeTlmeta.updatedAt).toBeGreaterThanOrEqual(createdTlmeta.updatedAt!)
	})
})

describe('getAttributionDisplayName', () => {
	it('returns current user name for own userId (string)', () => {
		const userId = editor.user.getId()
		const name = editor.getAttributionDisplayName(userId)
		expect(name).toBe(editor.user.getName())
	})

	it('returns null for unknown userId (string)', () => {
		const name = editor.getAttributionDisplayName('unknown-user-123')
		expect(name).toBeNull()
	})

	it('resolves live name from TLAttributionUser object', () => {
		const userId = editor.user.getId()
		const name = editor.getAttributionDisplayName({ id: userId, name: 'stale-name' })
		expect(name).toBe(editor.user.getName())
	})

	it('falls back to stored name when resolveUser returns null', () => {
		const name = editor.getAttributionDisplayName({ id: 'unknown-user', name: 'Stored Name' })
		expect(name).toBe('Stored Name')
	})

	it('returns null for null input', () => {
		expect(editor.getAttributionDisplayName(null)).toBeNull()
	})
})

describe('note shape textLastEditedBy', () => {
	it('sets textLastEditedBy as { id, name } when richText changes', () => {
		editor.createShapes([
			{
				id: ids.note1,
				type: 'note',
				x: 0,
				y: 0,
			},
		])

		const userId = editor.user.getId()
		const userName = editor.user.getName()

		editor.updateShape<TLNoteShape>({
			id: ids.note1,
			type: 'note',
			props: { richText: toRichText('Hello') },
		})

		const note = editor.getShape<TLNoteShape>(ids.note1)!
		expect(note.props.textLastEditedBy).toEqual({ id: userId, name: userName })
	})

	it('does not set textLastEditedBy when only position changes', () => {
		editor.createShapes([
			{
				id: ids.note1,
				type: 'note',
				x: 0,
				y: 0,
			},
		])

		editor.updateShape({ id: ids.note1, type: 'note', x: 100 })

		const note = editor.getShape<TLNoteShape>(ids.note1)!
		expect(note.props.textLastEditedBy).toBeNull()
	})

	it('does not set textLastEditedBy when color changes', () => {
		editor.createShapes([
			{
				id: ids.note1,
				type: 'note',
				x: 0,
				y: 0,
			},
		])

		editor.updateShape<TLNoteShape>({
			id: ids.note1,
			type: 'note',
			props: { color: 'red' },
		})

		const note = editor.getShape<TLNoteShape>(ids.note1)!
		expect(note.props.textLastEditedBy).toBeNull()
	})
})

describe('TLIdentityProvider', () => {
	it('uses custom identity provider for attribution', () => {
		const customIdentity: TLIdentityProvider = {
			getCurrentUser: () => ({ id: 'auth-user-42', name: 'Alice' }),
			resolveUser: (userId) => (userId === 'auth-user-42' ? { id: userId, name: 'Alice' } : null),
		}
		const customEditor = new TestEditor({ identity: customIdentity })

		customEditor.createShapes([{ id: ids.box1, type: 'geo', x: 0, y: 0 }])
		const shape = customEditor.getShape<TLGeoShape>(ids.box1)!

		const tlmeta = getTldrawMetaFromShapeMeta(shape.meta)
		expect(tlmeta.createdBy).toEqual({ id: 'auth-user-42', name: 'Alice' })
		expect(tlmeta.updatedBy).toEqual({ id: 'auth-user-42', name: 'Alice' })
		customEditor.dispose()
	})

	it('uses custom identity provider for display name resolution', () => {
		const customIdentity: TLIdentityProvider = {
			getCurrentUser: () => ({ id: 'user-1', name: 'Alice' }),
			resolveUser: (userId) => {
				if (userId === 'user-1') return { id: userId, name: 'Alice' }
				if (userId === 'user-2') return { id: userId, name: 'Bob' }
				return null
			},
		}
		const customEditor = new TestEditor({ identity: customIdentity })

		expect(customEditor.getAttributionDisplayName('user-1')).toBe('Alice')
		expect(customEditor.getAttributionDisplayName('user-2')).toBe('Bob')
		expect(customEditor.getAttributionDisplayName('user-unknown')).toBeNull()
		customEditor.dispose()
	})

	it('falls back to default identity when none provided', () => {
		const userId = editor.user.getId()
		const userName = editor.user.getName()
		expect(editor.getAttributionUserId()).toBe(userId)
		expect(editor.getAttributionUser()).toEqual({ id: userId, name: userName })
		expect(editor.getAttributionDisplayName(userId)).toBe(userName)
	})

	it('exposes identity provider on editor', () => {
		const customIdentity: TLIdentityProvider = {
			getCurrentUser: () => ({ id: 'test', name: 'Test' }),
			resolveUser: () => null,
		}
		const customEditor = new TestEditor({ identity: customIdentity })

		expect(customEditor.getIdentity()).toBe(customIdentity)
		expect(customEditor.getIdentity().getCurrentUser()).toEqual({ id: 'test', name: 'Test' })
		customEditor.dispose()
	})

	it('default identity resolves current user via preferences', () => {
		const user = editor.getIdentity().getCurrentUser()
		expect(user).not.toBeNull()
		expect(user!.id).toBe(editor.user.getId())
		expect(user!.name).toBe(editor.user.getName())
	})
})
