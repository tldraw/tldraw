import {
	PageRecordType,
	createUserId,
	type TLInstancePresence,
	type TLUserId,
} from '@tldraw/tlschema'
import { vi } from 'vitest'
import { createTLStore } from '../../../config/createTLStore'
import type { Editor } from '../../Editor'
import { CollaboratorsManager } from './CollaboratorsManager'

const currentPageId = PageRecordType.createId('page')

function createPresence(userId: TLUserId): TLInstancePresence {
	return {
		typeName: 'instance_presence',
		id: `instance_presence:${userId}` as TLInstancePresence['id'],
		userId,
		userName: userId,
		lastActivityTimestamp: Date.now(),
		color: '#000000',
		camera: null,
		selectedShapeIds: [],
		currentPageId,
		brush: null,
		scribbles: [],
		screenBounds: null,
		followingUserId: null,
		cursor: null,
		chatMessage: '',
		meta: {},
	}
}

function createEditor(presences: TLInstancePresence[] = []) {
	const setInterval = vi.fn((_fn: () => void, _ms: number) => 123)
	const getInstanceState = vi.fn(() => ({
		followingUserId: null,
		highlightedUserIds: [],
	}))
	const userGetId = vi.fn(() => 'current-user')

	const store = createTLStore()
	store.put(presences)

	const editor = {
		options: {
			collaboratorCheckIntervalMs: 1000,
			collaboratorIdleTimeoutMs: 3000,
			collaboratorInactiveTimeoutMs: 5000,
		},
		timers: {
			setInterval,
		},
		user: {
			getId: userGetId,
			getRecordId: () => createUserId(userGetId()),
		},
		store,
		getInstanceState,
		getCurrentPageId: vi.fn(() => currentPageId),
	} as unknown as Editor

	return { editor, setInterval, getInstanceState, userGetId }
}

describe(CollaboratorsManager, () => {
	afterEach(() => {
		vi.clearAllMocks()
		vi.useRealTimers()
	})

	it('starts the visibility clock on the first visible collaborators read', () => {
		const { editor, setInterval } = createEditor()
		const manager = new CollaboratorsManager(editor)

		expect(setInterval).not.toHaveBeenCalled()

		expect(manager.getVisibleCollaborators()).toEqual([])

		expect(setInterval).toHaveBeenCalledTimes(1)
		expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 1000)
	})

	it('only starts the visibility clock once across repeated reads', () => {
		const { editor, setInterval } = createEditor()
		const manager = new CollaboratorsManager(editor)

		manager.getVisibleCollaborators()
		manager.getVisibleCollaborators()
		manager.getVisibleCollaborators()

		expect(setInterval).toHaveBeenCalledTimes(1)
	})

	it("excludes the local user's own other sessions", () => {
		const ownSession = createPresence(createUserId('current-user'))
		const peer = createPresence(createUserId('peer'))
		const { editor } = createEditor([ownSession, peer])
		const manager = new CollaboratorsManager(editor)

		expect(manager.getCollaborators()).toEqual([peer])
	})

	it('reads instance state once when filtering visible collaborators', () => {
		const { editor, getInstanceState } = createEditor([
			createPresence(createUserId('user-1')),
			createPresence(createUserId('user-2')),
		])
		const manager = new CollaboratorsManager(editor)

		expect(manager.getVisibleCollaborators()).toHaveLength(2)

		expect(getInstanceState).toHaveBeenCalledTimes(1)
	})

	it('hides idle collaborators that are following us', () => {
		const presence = createPresence(createUserId('peer'))
		presence.lastActivityTimestamp = Date.now() - 4000
		presence.followingUserId = createUserId('current-user')
		const { editor } = createEditor([presence])
		const manager = new CollaboratorsManager(editor)

		expect(manager.getVisibleCollaborators()).toEqual([])
	})

	it('shows idle collaborators that are following us when they have a chat message', () => {
		const presence = createPresence(createUserId('peer'))
		presence.lastActivityTimestamp = Date.now() - 4000
		presence.followingUserId = createUserId('current-user')
		presence.chatMessage = 'hi'
		const { editor } = createEditor([presence])
		const manager = new CollaboratorsManager(editor)

		expect(manager.getVisibleCollaborators()).toHaveLength(1)
	})

	it('shows idle collaborators that are not following us', () => {
		const presence = createPresence(createUserId('peer'))
		presence.lastActivityTimestamp = Date.now() - 4000
		const { editor } = createEditor([presence])
		const manager = new CollaboratorsManager(editor)

		expect(manager.getVisibleCollaborators()).toHaveLength(1)
	})

	it('keeps array identity when a presence update leaves the derived lists unchanged', () => {
		const peerHere = createPresence(createUserId('peer-here'))
		const peerElsewhere = createPresence(createUserId('peer-elsewhere'))
		peerElsewhere.currentPageId = PageRecordType.createId('other-page')
		const { editor } = createEditor([peerHere, peerElsewhere])
		const manager = new CollaboratorsManager(editor)

		const onPage = manager.getCollaboratorsOnCurrentPage()
		const visibleOnPage = manager.getVisibleCollaboratorsOnCurrentPage()
		expect(onPage).toEqual([peerHere])

		// The off-page peer sends a presence update: the current-page lists are unaffected, so
		// they keep the exact same array identity and don't invalidate downstream subscribers.
		editor.store.put([{ ...peerElsewhere, chatMessage: 'hello from another page' }])
		expect(manager.getCollaboratorsOnCurrentPage()).toBe(onPage)
		expect(manager.getVisibleCollaboratorsOnCurrentPage()).toBe(visibleOnPage)
	})

	it('keeps array identity across a visibility-clock tick that changes nothing', () => {
		vi.useFakeTimers()
		const peer = createPresence(createUserId('peer'))
		const { editor, setInterval, getInstanceState } = createEditor([peer])
		const manager = new CollaboratorsManager(editor)

		const visible = manager.getVisibleCollaborators()
		const visibleOnPage = manager.getVisibleCollaboratorsOnCurrentPage()
		expect(visible).toEqual([peer])
		expect(getInstanceState).toHaveBeenCalledTimes(1)

		// The clock ticks on a fixed interval whether or not anything changed. Advance far enough
		// to move the clock atom, but not far enough to change anyone's activity state.
		const tick = setInterval.mock.calls[0][0]
		vi.advanceTimersByTime(1000)
		tick()

		// The tick really did invalidate the query — it re-evaluates and re-reads instance state —
		// but the result is element-wise identical, so it keeps the previous array's identity. An
		// idle room therefore doesn't re-render the cursor layer once per interval.
		const revisited = manager.getVisibleCollaborators()
		expect(getInstanceState).toHaveBeenCalledTimes(2)
		expect(revisited).toBe(visible)
		expect(manager.getVisibleCollaboratorsOnCurrentPage()).toBe(visibleOnPage)
	})

	it('shows newly-joined collaborators that have not recorded any activity yet', () => {
		// A peer who has joined but not moved their pointer broadcasts the default
		// `lastActivityTimestamp` of 0. They should still be treated as active so
		// they appear in the people menu / face pile. See issue #9017.
		const zero = createPresence(createUserId('zero'))
		zero.lastActivityTimestamp = 0
		const nullish = createPresence(createUserId('nullish'))
		nullish.lastActivityTimestamp = null
		const { editor } = createEditor([zero, nullish])
		const manager = new CollaboratorsManager(editor)

		expect(manager.getVisibleCollaborators()).toHaveLength(2)
	})
})
