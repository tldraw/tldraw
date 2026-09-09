import { InstancePresenceRecordType, createShapeId, createUserId } from '@tldraw/editor'
import { TestEditor } from './TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
	editor.user.updateUserPreferences({ animationSpeed: 1 })
})

describe('pointer held still while the camera animates', () => {
	it('does not start a drag', () => {
		editor.pointerDown(100, 100)
		editor.setCamera({ x: 500, y: 500, z: 1 }, { animation: { duration: 200 } })
		editor.forceTick(5)

		expect(editor.getCamera()).not.toMatchObject({ x: 0, y: 0 })
		expect(editor.inputs.getIsDragging()).toBe(false)
	})

	it('still treats the interaction as a click on a shape', () => {
		const id = createShapeId()
		editor.createShape({ id, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100, fill: 'solid' } })

		editor.pointerDown(50, 50)
		editor.setCamera({ x: 500, y: 500, z: 1 }, { animation: { duration: 200 } })
		editor.forceTick(5)
		editor.pointerUp()

		expect(editor.getSelectedShapeIds()).toEqual([id])
		expect(editor.getShape(id)).toMatchObject({ x: 0, y: 0 })
		expect(editor.getPath()).toBe('select.idle')
	})

	it('still starts a drag once the pointer itself moves past the threshold', () => {
		editor.pointerDown(100, 100)
		editor.setCamera({ x: 500, y: 500, z: 1 }, { animation: { duration: 200 } })
		editor.forceTick(5)
		expect(editor.inputs.getIsDragging()).toBe(false)

		editor.pointerMove(110, 110)
		expect(editor.inputs.getIsDragging()).toBe(true)
	})

	it('measures a later drag from where the pointer actually is, not from before the camera moved', () => {
		const id = createShapeId()
		editor.createShape({ id, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100, fill: 'solid' } })

		editor.pointerDown(50, 50)
		editor.setCamera({ x: 500, y: 500, z: 1 }, { animation: { duration: 200 } })
		editor.forceTick(20)
		editor.pointerMove(70, 50).pointerUp()

		expect(editor.getShape(id)).toMatchObject({ x: 20, y: 0 })
	})
})

describe('pointer held still while the camera moves for other reasons', () => {
	it('does not start a drag when following a user', () => {
		const leaderId = createUserId('leader')
		editor.store.put([
			InstancePresenceRecordType.create({
				id: InstancePresenceRecordType.createId(leaderId),
				userId: leaderId,
				userName: leaderId,
				currentPageId: editor.getCurrentPageId(),
				followingUserId: null,
				camera: { x: 500, y: 500, z: 1 },
				screenBounds: { x: 0, y: 0, w: 1080, h: 720 },
				lastActivityTimestamp: Date.now(),
			}),
		])

		editor.pointerDown(100, 100)
		editor.startFollowingUser(leaderId)
		editor.forceTick(20)

		expect(editor.getCamera()).not.toMatchObject({ x: 0, y: 0 })
		expect(editor.inputs.getIsDragging()).toBe(false)
	})

	it('does not start a drag while the camera slides after a fling', () => {
		editor.slideCamera({ speed: 5, direction: { x: 1, y: 1 }, friction: 0.01 })
		editor.pointerDown(100, 100)
		editor.forceTick(20)

		expect(editor.getCamera()).not.toMatchObject({ x: 0, y: 0 })
		expect(editor.inputs.getIsDragging()).toBe(false)
	})

	it('does not start a drag on an immediate camera jump', () => {
		editor.pointerDown(100, 100)
		editor.setCamera({ x: 500, y: 500, z: 1 }, { immediate: true })

		expect(editor.getCamera()).toMatchObject({ x: 500, y: 500 })
		expect(editor.inputs.getIsDragging()).toBe(false)
	})
})

describe('pointer held still while the user scrolls the wheel', () => {
	it('starts a drag once the camera has moved past the threshold', () => {
		editor.pointerDown(100, 100)
		editor.wheel(2, 2)
		expect(editor.inputs.getIsDragging()).toBe(false)
		editor.wheel(10, 10)
		expect(editor.inputs.getIsDragging()).toBe(true)
	})
})
