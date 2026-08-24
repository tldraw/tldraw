import { vi } from 'vitest'
import {
	Box,
	Geometry2d,
	InstancePresenceRecordType,
	PageRecordType,
	RecordProps,
	Rectangle2d,
	ShapeUtil,
	T,
	TLInstancePresence,
	TLShape,
	TLUser,
	TLUserId,
	TLUserPreferences,
	UserRecordType,
	atom,
	createTLCurrentUser,
	createTLStore,
	createUserId,
} from '../..'
import { Editor, TLEditorOptions } from './Editor'

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
	override getReferencedUserIds(shape: TestBox) {
		return typeof shape.meta.editedBy === 'string' ? [shape.meta.editedBy] : []
	}
	getIndicatorPath() {
		return undefined
	}
	component() {}
}

function createIsolatedUser() {
	const userPreferences = atom<TLUserPreferences>('prefs', { id: 'me', animationSpeed: 0 })
	return createTLCurrentUser({
		userPreferences,
		setUserPreferences: (prefs) => userPreferences.set(prefs),
	})
}

const currentUser = atom<TLUser | null>('current user', null)

function createEditor(opts: Partial<TLEditorOptions> = {}) {
	return new Editor({
		shapeUtils: [TestBoxUtil],
		bindingUtils: [],
		tools: [],
		store: createTLStore({
			shapeUtils: [TestBoxUtil],
			bindingUtils: [],
			users: { currentUser },
		}),
		getContainer: () => document.body,
		user: createIsolatedUser(),
		...opts,
	})
}

const me = createUserId('me')
const alice = createUserId('alice')
const bob = createUserId('bob')
const page2Id = PageRecordType.createId('page2')

let editor: Editor

function presence(userId: TLUserId, partial: Partial<TLInstancePresence> = {}) {
	return InstancePresenceRecordType.create({
		id: InstancePresenceRecordType.createId(userId),
		userId,
		userName: userId,
		currentPageId: editor.getCurrentPageId(),
		camera: { x: 0, y: 0, z: 1 },
		screenBounds: { x: 0, y: 0, w: 1080, h: 720 },
		lastActivityTimestamp: Date.now(),
		...partial,
	})
}

beforeEach(() => {
	vi.useFakeTimers()
	currentUser.set(null)
	editor = createEditor()
})

afterEach(() => {
	editor.dispose()
	vi.useRealTimers()
})

describe('collaborators', () => {
	it('excludes the current user and keeps the latest record per user', () => {
		editor.store.put([
			presence(me),
			presence(alice, { lastActivityTimestamp: 10 }),
			presence(alice, {
				id: InstancePresenceRecordType.createId('alice-2'),
				lastActivityTimestamp: 20,
				userName: 'alice-newer',
			}),
			presence(bob),
		])
		expect(editor.getCollaborators().map((c) => [c.userId, c.userName])).toEqual([
			[alice, 'alice-newer'],
			[bob, bob],
		])
	})

	it('filters collaborators by the current page', () => {
		editor.createPage({ id: page2Id, name: 'Page 2' })
		editor.store.put([presence(alice), presence(bob, { currentPageId: page2Id })])
		expect(editor.getCollaboratorsOnCurrentPage().map((c) => c.userId)).toEqual([alice])
		editor.setCurrentPage(page2Id)
		expect(editor.getCollaboratorsOnCurrentPage().map((c) => c.userId)).toEqual([bob])
	})

	it('hides inactive collaborators unless followed or highlighted', () => {
		const { collaboratorInactiveTimeoutMs } = editor.options
		const stale = Date.now() - collaboratorInactiveTimeoutMs - 1
		editor.store.put([presence(alice, { lastActivityTimestamp: stale }), presence(bob)])
		expect(editor.getVisibleCollaborators().map((c) => c.userId)).toEqual([bob])

		editor.updateInstanceState({ highlightedUserIds: [alice] })
		expect(editor.getVisibleCollaborators().map((c) => c.userId)).toEqual([alice, bob])

		editor.updateInstanceState({ highlightedUserIds: [], followingUserId: alice })
		expect(editor.getVisibleCollaborators().map((c) => c.userId)).toEqual([alice, bob])

		editor.updateInstanceState({ followingUserId: null })
		expect(editor.getVisibleCollaborators().map((c) => c.userId)).toEqual([bob])
	})

	it('hides idle followers of the current user unless they are chatting', () => {
		const { collaboratorIdleTimeoutMs } = editor.options
		const idle = Date.now() - collaboratorIdleTimeoutMs - 1
		editor.store.put([
			presence(alice, { lastActivityTimestamp: idle, followingUserId: me }),
			presence(bob, { lastActivityTimestamp: idle }),
		])
		expect(editor.getVisibleCollaborators().map((c) => c.userId)).toEqual([bob])

		editor.store.put([
			presence(alice, { lastActivityTimestamp: idle, followingUserId: me, chatMessage: 'hi' }),
		])
		expect(editor.getVisibleCollaborators().map((c) => c.userId)).toEqual([alice, bob])
	})

	it('treats a missing activity timestamp as active', () => {
		editor.store.put([presence(alice, { lastActivityTimestamp: null })])
		expect(editor.getVisibleCollaborators().map((c) => c.userId)).toEqual([alice])
	})
})

describe('startFollowingUser', () => {
	it('locks the camera onto the leader viewport when animation is disabled', () => {
		editor.store.put([presence(alice, { camera: { x: -100, y: -50, z: 2 } })])
		expect(editor.startFollowingUser(alice)).toBe(editor)
		expect(editor.getInstanceState().followingUserId).toBe(alice)
		expect(editor.getCamera()).toMatchObject({ x: -100, y: -50, z: 2 })
	})

	it('fits the leader viewport inside a differently shaped screen', () => {
		// leader viewport is 1080x720 page units; ours is twice as wide, so we zoom out to fit the
		// height and center on their viewport
		editor.updateInstanceState({ screenBounds: { x: 0, y: 0, w: 2160, h: 720 } })
		editor.store.put([presence(alice, { camera: { x: 0, y: 0, z: 1 } })])
		editor.startFollowingUser(alice)
		const camera = editor.getCamera()
		expect(camera.z).toBeCloseTo(1)
		expect(camera.x).toBeCloseTo(540)
		expect(camera.y).toBeCloseTo(0)
		expect(editor.getViewportPageBounds()).toEqual(new Box(-540, 0, 2160, 720))
	})

	it('tracks camera updates from the leader while locked on', () => {
		editor.store.put([presence(alice)])
		editor.startFollowingUser(alice)
		editor.store.put([presence(alice, { camera: { x: -300, y: -200, z: 0.5 } })])
		expect(editor.getCamera()).toMatchObject({ x: -300, y: -200, z: 0.5 })
	})

	it('does nothing when the user has no presence', () => {
		editor.startFollowingUser(alice)
		expect(editor.getInstanceState().followingUserId).toBeNull()
	})

	it('does nothing when the leader has no camera or screen bounds yet', () => {
		editor.store.put([presence(alice, { camera: null, screenBounds: null })])
		const before = editor.getCamera()
		editor.startFollowingUser(alice)
		expect(editor.getInstanceState().followingUserId).toBe(alice)
		expect(editor.getCamera()).toEqual(before)
	})

	it('follows the leader of the leader', () => {
		editor.store.put([
			presence(alice, { followingUserId: bob }),
			presence(bob, { camera: { x: -10, y: -20, z: 1 } }),
		])
		editor.startFollowingUser(alice)
		expect(editor.getCamera()).toMatchObject({ x: -10, y: -20, z: 1 })
	})

	it('does not loop when leaders follow each other', () => {
		editor.store.put([
			presence(alice, { followingUserId: bob, camera: { x: -1, y: -1, z: 1 } }),
			presence(bob, { followingUserId: alice, camera: { x: -2, y: -2, z: 1 } }),
		])
		editor.startFollowingUser(alice)
		expect(editor.getCamera()).toMatchObject({ x: -2, y: -2, z: 1 })
	})

	it('follows the leader onto another page', () => {
		editor.createPage({ id: page2Id, name: 'Page 2' })
		editor.store.put([presence(alice)])
		editor.startFollowingUser(alice)
		editor.store.put([presence(alice, { currentPageId: page2Id })])
		expect(editor.getCurrentPageId()).toBe(page2Id)
		expect(editor.getInstanceState().followingUserId).toBe(alice)
	})

	it('stops following when the leader disappears', () => {
		editor.store.put([presence(alice)])
		editor.startFollowingUser(alice)
		editor.store.remove([InstancePresenceRecordType.createId(alice)])
		expect(editor.getInstanceState().followingUserId).toBeNull()
	})

	it('stops following the previous leader when following a new one', () => {
		editor.store.put([presence(alice), presence(bob, { camera: { x: -5, y: -5, z: 1 } })])
		editor.startFollowingUser(alice)
		editor.startFollowingUser(bob)
		expect(editor.getInstanceState().followingUserId).toBe(bob)
		expect(editor.getCamera()).toMatchObject({ x: -5, y: -5, z: 1 })
	})

	it('stopFollowingUser commits the followed camera and emits stop-following', () => {
		editor.store.put([presence(alice, { camera: { x: -100, y: -50, z: 2 } })])
		editor.startFollowingUser(alice)
		const onStop = vi.fn()
		editor.on('stop-following', onStop)

		expect(editor.stopFollowingUser()).toBe(editor)
		expect(editor.getInstanceState().followingUserId).toBeNull()
		expect(onStop).toHaveBeenCalledTimes(1)
		expect(editor.getCamera()).toMatchObject({ x: -100, y: -50, z: 2 })

		// no longer derived from the leader
		editor.store.put([presence(alice, { camera: { x: 0, y: 0, z: 1 } })])
		expect(editor.getCamera()).toMatchObject({ x: -100, y: -50, z: 2 })
	})

	it('stops following when the user changes page', () => {
		editor.createPage({ id: page2Id, name: 'Page 2' })
		editor.store.put([presence(alice)])
		editor.startFollowingUser(alice)
		editor.setCurrentPage(page2Id)
		expect(editor.getInstanceState().followingUserId).toBeNull()
	})
})

describe('zoomToUser', () => {
	it('centers on the user cursor and highlights them temporarily', () => {
		editor.store.put([
			presence(alice, { cursor: { x: 1000, y: 500, type: 'default', rotation: 0 } }),
		])
		expect(editor.zoomToUser(alice)).toBe(editor)

		const viewport = editor.getViewportPageBounds()
		expect(viewport.center.x).toBeCloseTo(1000)
		expect(viewport.center.y).toBeCloseTo(500)
		expect(editor.getInstanceState().highlightedUserIds).toEqual([alice])

		vi.advanceTimersByTime(editor.options.collaboratorIdleTimeoutMs)
		expect(editor.getInstanceState().highlightedUserIds).toEqual([])
	})

	it('does nothing for unknown users or users without a cursor', () => {
		editor.store.put([presence(alice, { cursor: null })])
		const before = editor.getCamera()
		editor.zoomToUser(alice)
		editor.zoomToUser(bob)
		expect(editor.getCamera()).toEqual(before)
		expect(editor.getInstanceState().highlightedUserIds).toEqual([])
	})

	it('switches to the user page and stops following', () => {
		editor.createPage({ id: page2Id, name: 'Page 2' })
		editor.store.put([
			presence(alice),
			presence(bob, {
				currentPageId: page2Id,
				cursor: { x: 300, y: 300, type: 'default', rotation: 0 },
			}),
		])
		editor.startFollowingUser(alice)
		editor.zoomToUser(bob)
		expect(editor.getInstanceState().followingUserId).toBeNull()
		expect(editor.getCurrentPageId()).toBe(page2Id)
		expect(editor.getViewportPageBounds().center.x).toBeCloseTo(300)
		expect(editor.getViewportPageBounds().center.y).toBeCloseTo(300)
	})
})

describe('attribution', () => {
	const aliceUser: TLUser = {
		id: alice,
		typeName: 'user',
		name: 'Alice',
		color: '#123456',
		imageUrl: '',
		meta: {},
	}

	it('getAttributionUserId returns null without a current user', () => {
		expect(editor.getAttributionUserId()).toBeNull()
	})

	it('getAttributionUserId returns the raw id and ensures a user record', () => {
		currentUser.set(aliceUser)
		expect(editor.getAttributionUserId()).toBe('alice')
		expect(editor.store.get(alice)).toEqual(aliceUser)
	})

	it('keeps the user record in sync with the current user', () => {
		currentUser.set(aliceUser)
		currentUser.set({ ...aliceUser, name: 'Alice B' })
		expect(editor.store.get(alice)?.name).toBe('Alice B')
	})

	it('resolves display names from the user store first', () => {
		currentUser.set(aliceUser)
		expect(editor.getAttributionDisplayName('alice')).toBe('Alice')
		expect(editor.getAttributionUser('alice')).toEqual(aliceUser)
	})

	it('falls back to user records in the store', () => {
		const bobUser = UserRecordType.create({ id: bob, name: 'Bob', color: '#000', imageUrl: '' })
		editor.store.put([bobUser])
		expect(editor.getAttributionDisplayName('bob')).toBe('Bob')
		expect(editor.getAttributionUser('bob')).toEqual(bobUser)
	})

	it('returns null for unknown or null ids', () => {
		expect(editor.getAttributionDisplayName(null)).toBeNull()
		expect(editor.getAttributionDisplayName('nobody')).toBeNull()
		expect(editor.getAttributionUser(null)).toBeNull()
		expect(editor.getAttributionUser('nobody')).toBeNull()
	})

	it('collects referenced user ids from shape utils', () => {
		editor.createShapes([
			{ type: MY_CUSTOM_SHAPE_TYPE, meta: { editedBy: 'alice' } },
			{ type: MY_CUSTOM_SHAPE_TYPE, meta: { editedBy: 'bob' } },
			{ type: MY_CUSTOM_SHAPE_TYPE, meta: { editedBy: 'alice' } },
			{ type: MY_CUSTOM_SHAPE_TYPE },
		])
		expect(editor._getReferencedUserIds(editor.getCurrentPageShapes())).toEqual(
			new Set(['alice', 'bob'])
		)
		expect(editor._getReferencedUserIds([])).toEqual(new Set())
	})
})

describe('page to screen conversions', () => {
	beforeEach(() => {
		editor.updateInstanceState({ screenBounds: { x: 10, y: 20, w: 1080, h: 720 } })
		editor.setCamera({ x: 100, y: 50, z: 2 })
	})

	it('pageToViewport applies the camera only', () => {
		expect(editor.pageToViewport({ x: 0, y: 0 })).toMatchObject({ x: 200, y: 100, z: 0.5 })
		expect(editor.pageToViewport({ x: -100, y: -50, z: 3 })).toMatchObject({ x: 0, y: 0, z: 3 })
	})

	it('pageToScreen also offsets by the screen bounds', () => {
		expect(editor.pageToScreen({ x: 0, y: 0 })).toMatchObject({ x: 210, y: 120, z: 0.5 })
		expect(editor.pageToScreen({ x: -100, y: -50 })).toMatchObject({ x: 10, y: 20 })
		expect(editor.screenToPage(editor.pageToScreen({ x: 33, y: 44 }))).toMatchObject({
			x: 33,
			y: 44,
		})
	})
})

describe('getInitialZoom', () => {
	function constrain(initialZoom: any, bounds: { w: number; h: number }) {
		editor.setCameraOptions({
			constraints: {
				bounds: { x: 0, y: 0, ...bounds },
				padding: { x: 0, y: 0 },
				origin: { x: 0.5, y: 0.5 },
				initialZoom,
				baseZoom: 'default',
				behavior: 'contain',
			},
		})
	}

	it('is 1 without constraints or with the default fit', () => {
		expect(editor.getInitialZoom()).toBe(1)
		constrain('default', { w: 100, h: 100 })
		expect(editor.getInitialZoom()).toBe(1)
	})

	it('fits the constrained bounds to the 1080x720 viewport', () => {
		constrain('fit-x', { w: 540, h: 720 })
		expect(editor.getInitialZoom()).toBe(2)
		constrain('fit-y', { w: 540, h: 720 })
		expect(editor.getInitialZoom()).toBe(1)
		constrain('fit-min', { w: 540, h: 720 })
		expect(editor.getInitialZoom()).toBe(2)
		constrain('fit-max', { w: 540, h: 720 })
		expect(editor.getInitialZoom()).toBe(1)
	})

	it('caps the -100 variants at 100%', () => {
		constrain('fit-x-100', { w: 540, h: 720 })
		expect(editor.getInitialZoom()).toBe(1)
		constrain('fit-x-100', { w: 2160, h: 720 })
		expect(editor.getInitialZoom()).toBe(0.5)
		constrain('fit-min-100', { w: 2160, h: 720 })
		expect(editor.getInitialZoom()).toBe(1)
		constrain('fit-max-100', { w: 2160, h: 720 })
		expect(editor.getInitialZoom()).toBe(0.5)
		constrain('fit-y-100', { w: 2160, h: 1440 })
		expect(editor.getInitialZoom()).toBe(0.5)
	})

	it('clamps padding to half the viewport', () => {
		editor.setCameraOptions({
			constraints: {
				bounds: { x: 0, y: 0, w: 100, h: 100 },
				padding: { x: 10000, y: 10000 },
				origin: { x: 0.5, y: 0.5 },
				initialZoom: 'fit-x',
				baseZoom: 'default',
				behavior: 'contain',
			},
		})
		expect(editor.getInitialZoom()).toBe(0)
	})
})
