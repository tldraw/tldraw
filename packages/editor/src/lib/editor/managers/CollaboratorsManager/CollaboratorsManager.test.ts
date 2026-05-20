import { PageRecordType, type TLInstancePresence } from '@tldraw/tlschema'
import { vi } from 'vitest'
import type { Editor } from '../../Editor'
import { CollaboratorsManager } from './CollaboratorsManager'

const currentPageId = PageRecordType.createId('page')

function createPresence(userId: string): TLInstancePresence {
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
		store: {
			query: {
				records: vi.fn(() => ({
					get: () => presences,
				})),
			},
		},
		getInstanceState,
		getCurrentPageId: vi.fn(() => currentPageId),
	} as unknown as Editor

	return { editor, setInterval, getInstanceState, userGetId }
}

describe(CollaboratorsManager, () => {
	const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval').mockImplementation(() => {})

	afterEach(() => {
		clearIntervalSpy.mockClear()
		vi.clearAllMocks()
	})

	afterAll(() => {
		clearIntervalSpy.mockRestore()
	})

	it('starts the visibility clock on the first visible collaborators read', () => {
		const { editor, setInterval } = createEditor()
		const manager = new CollaboratorsManager(editor)

		expect(setInterval).not.toHaveBeenCalled()

		expect(manager.getVisibleCollaborators()).toEqual([])

		expect(setInterval).toHaveBeenCalledTimes(1)
		expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 1000)

		manager.dispose()

		expect(clearIntervalSpy).toHaveBeenCalledWith(123)
	})

	it('can be disposed before the visibility clock starts', () => {
		const { editor, setInterval } = createEditor()
		const manager = new CollaboratorsManager(editor)

		expect(() => manager.dispose()).not.toThrow()

		expect(setInterval).not.toHaveBeenCalled()
		expect(clearIntervalSpy).not.toHaveBeenCalled()
	})

	it('reads instance state once when filtering visible collaborators', () => {
		const { editor, getInstanceState } = createEditor([
			createPresence('user-1'),
			createPresence('user-2'),
		])
		const manager = new CollaboratorsManager(editor)

		expect(manager.getVisibleCollaborators()).toHaveLength(2)

		expect(getInstanceState).toHaveBeenCalledTimes(1)
	})
})
