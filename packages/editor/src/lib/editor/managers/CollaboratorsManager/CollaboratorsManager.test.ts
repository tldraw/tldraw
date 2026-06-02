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
	const setInterval = vi.fn(() => 123)
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
		},
		// Use a real store so the collaborators query runs against the real query
		// engine rather than a hand-rolled reimplementation of its matchers.
		store,
		getInstanceState,
		getCurrentPageId: vi.fn(() => currentPageId),
	} as unknown as Editor

	return { editor, setInterval, getInstanceState, userGetId }
}

describe(CollaboratorsManager, () => {
	afterEach(() => {
		vi.clearAllMocks()
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
		// `user.getId()` returns the unprefixed preferences id ('current-user'), while
		// a presence record's `userId` is the prefixed `TLUserId`. The local user's own
		// other sessions push presence under that prefixed id and must be filtered out.
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
})
