import { atom, react } from '@tldraw/state'
import { TLShape, TLShapeId } from '@tldraw/tlschema'
import { Editor } from '../../Editor'
import { AllowManager } from './AllowManager'

function setupManager() {
	const isReadonly = atom('isReadonly', false)
	const cameraOptions = atom('cameraOptions', { isLocked: false })
	const parentOf = new Map<TLShapeId, TLShape>()
	const getShapeParent = (shape: TLShape) => parentOf.get(shape.id)
	const isShapeOrAncestorLocked = (shape?: TLShape): boolean => {
		if (!shape) return false
		if (shape.isLocked) return true
		return isShapeOrAncestorLocked(getShapeParent(shape))
	}
	const editor = {
		getIsReadonly: () => isReadonly.get(),
		getCameraOptions: () => cameraOptions.get(),
		getShapeParent,
		isShapeOrAncestorLocked,
	} as unknown as Editor
	return { allow: new AllowManager(editor), isReadonly, cameraOptions, parentOf }
}

function makeShape(id: string, isLocked = false) {
	return { id: id as TLShapeId, isLocked } as TLShape
}

const shape = makeShape('shape:a')

/** Run `fn` reactively and return a getter for the latest value plus how many times it ran. */
function track<T>(fn: () => T) {
	let value: T
	let runs = 0
	const stop = react('track', () => {
		value = fn()
		runs++
	})
	return {
		get value() {
			return value
		},
		get runs() {
			return runs
		},
		stop,
	}
}

describe('built-in allowables', () => {
	it('gates changeDocument on readonly', () => {
		const { allow, isReadonly } = setupManager()
		expect(allow.changeDocument.can()).toBe(true)
		isReadonly.set(true)
		expect(allow.changeDocument.can()).toBe(false)
	})

	it('gates moveCamera on the camera lock', () => {
		const { allow, cameraOptions } = setupManager()
		expect(allow.moveCamera.can()).toBe(true)
		cameraOptions.set({ isLocked: true })
		expect(allow.moveCamera.can()).toBe(false)
	})

	it('denies changeShape when the shape itself is locked', () => {
		const { allow } = setupManager()
		expect(allow.changeShape.can(shape)).toBe(true)
		expect(allow.changeShape.can(makeShape('shape:a', true))).toBe(false)
		expect(allow.changeShape.check(makeShape('shape:a', true)).failures).toEqual([
			{ ruleId: 'not-self-locked', message: 'The shape is locked' },
		])
	})

	it('denies changeShape when an ancestor is locked, as a separate concern', () => {
		const { allow, parentOf } = setupManager()
		const parent = makeShape('shape:parent', true)
		const child = makeShape('shape:child')
		parentOf.set(child.id, parent)

		expect(allow.changeShape.check(child).failures).toEqual([
			{ ruleId: 'no-locked-ancestor', message: 'An ancestor of the shape is locked' },
		])
		expect(allow.changeShape.can(child)).toBe(false)
	})

	it('selectShape denies a self-locked shape but ignores locked ancestors', () => {
		const { allow, parentOf } = setupManager()
		expect(allow.selectShape.can(shape)).toBe(true)
		expect(allow.selectShape.can(makeShape('shape:a', true))).toBe(false)

		// With a locked ancestor but unlocked self, selectShape allows (it shares
		// only the self-lock rule with changeShape, which also denies on ancestors).
		const parent = makeShape('shape:parent', true)
		const child = makeShape('shape:child')
		parentOf.set(child.id, parent)
		expect(allow.selectShape.can(child)).toBe(true)
		expect(allow.changeShape.can(child)).toBe(false)
	})

	it('exposes a distinct allowable per selection-driven action, all sharing the self-lock rule', () => {
		const { allow } = setupManager()
		const actions = [
			allow.selectShape,
			allow.deleteShape,
			allow.duplicateShape,
			allow.groupShape,
			allow.ungroupShape,
		]
		// each is its own allowable...
		expect(new Set(actions.map((a) => a.id)).size).toBe(actions.length)
		// ...but they share the same self-lock concern
		for (const action of actions) {
			expect(action.can(shape)).toBe(true)
			expect(action.can(makeShape('shape:a', true))).toBe(false)
		}
	})

	it('reports the denying rule id and message via check', () => {
		const { allow, isReadonly } = setupManager()
		expect(allow.changeDocument.check()).toEqual({ ok: true, failures: [] })
		isReadonly.set(true)
		expect(allow.changeDocument.check()).toEqual({
			ok: false,
			failures: [{ ruleId: 'not-readonly', message: 'The editor is in readonly mode' }],
		})
	})
})

describe('reactivity', () => {
	it('recomputes can() when the underlying signal changes', () => {
		const { allow, isReadonly } = setupManager()
		const tracked = track(() => allow.changeDocument.can())

		expect(tracked.runs).toBe(1)
		expect(tracked.value).toBe(true)

		isReadonly.set(true)
		expect(tracked.runs).toBe(2)
		expect(tracked.value).toBe(false)

		tracked.stop()
	})

	it('recomputes when a rule is added or removed', () => {
		const { allow } = setupManager()
		const tracked = track(() => allow.changeDocument.can())
		expect(tracked.value).toBe(true)

		allow.changeDocument.setRule({
			id: 'always-deny',
			message: 'nope',
			test: () => false,
		})
		expect(tracked.value).toBe(false)

		allow.changeDocument.removeRule('always-deny')
		expect(tracked.value).toBe(true)

		tracked.stop()
	})

	it('_canWithoutCapture does not capture in the surrounding reactive context', () => {
		const { allow, cameraOptions } = setupManager()
		const tracked = track(() => allow.moveCamera._canWithoutCapture())

		expect(tracked.runs).toBe(1)
		expect(tracked.value).toBe(true)

		// the reaction does not re-run, but the value is still current when read
		cameraOptions.set({ isLocked: true })
		expect(tracked.runs).toBe(1)
		expect(allow.moveCamera._canWithoutCapture()).toBe(false)

		tracked.stop()
	})

	it('getResult returns a stable computed for a contextless allowable', () => {
		const { allow, isReadonly } = setupManager()
		const result = allow.changeDocument.getResult()
		expect(allow.changeDocument.getResult()).toBe(result)

		expect(result.get().ok).toBe(true)
		isReadonly.set(true)
		expect(result.get().ok).toBe(false)
	})
})

describe('register and edit rules', () => {
	it('checks a context-bearing allowable against the passed ctx', () => {
		const { allow } = setupManager()
		const canEditShape = allow.register<{ locked: boolean }>('canEditShape', [
			{ id: 'not-locked', message: 'Shape is locked', test: (ctx) => !ctx.locked },
		])

		expect(canEditShape.can({ locked: false })).toBe(true)
		expect(canEditShape.can({ locked: true })).toBe(false)
		expect(canEditShape.check({ locked: true }).failures).toEqual([
			{ ruleId: 'not-locked', message: 'Shape is locked' },
		])
	})

	it('collects every failing rule, in order', () => {
		const { allow } = setupManager()
		const a = allow.register('multi', [
			{ id: 'a', message: 'first', test: () => false },
			{ id: 'b', message: 'second', test: () => true },
			{ id: 'c', message: 'third', test: () => false },
		])
		expect(a.check().failures.map((f) => f.message)).toEqual(['first', 'third'])
	})

	it('setRule replaces a rule that shares its id', () => {
		const { allow } = setupManager()
		const a = allow.register('a', [{ id: 'r', message: 'v1', test: () => false }])
		expect(a.check().failures.map((f) => f.message)).toEqual(['v1'])

		a.setRule({ id: 'r', message: 'v2', test: () => false })
		expect(a.check().failures.map((f) => f.message)).toEqual(['v2'])
		expect(a.rules.get()).toHaveLength(1)
	})

	it('an unregistered allowable keeps working, and its id is freed', () => {
		const { allow } = setupManager()
		const a = allow.register('temp', [])
		allow.unregister(a)
		expect(a.can()).toBe(true)
		expect(() => allow.register('temp', [])).not.toThrow()
	})

	it('throws when registering an id that is already in use', () => {
		const { allow } = setupManager()
		allow.register('custom', [])
		expect(() => allow.register('custom', [])).toThrow()
		// built-in ids are taken too
		expect(() => allow.register('changeDocument', [])).toThrow()
	})

	it('throws when unregistering a built-in allowable', () => {
		const { allow } = setupManager()
		expect(() => allow.unregister(allow.changeDocument)).toThrow()
		expect(() => allow.unregister(allow.changeShape)).toThrow()
		// the built-in still works afterwards
		expect(allow.changeDocument.can()).toBe(true)
	})
})

describe('types', () => {
	it('requires a context only for context-bearing allowables', () => {
		const { allow } = setupManager()
		const withCtx = allow.register<{ x: number }>('withCtx', [])

		// @ts-expect-error - changeDocument is contextless, so no ctx may be passed
		allow.changeDocument.can({})
		// @ts-expect-error - withCtx requires a ctx argument
		withCtx.can()
		// @ts-expect-error - getResult is only available on contextless allowables
		withCtx.getResult()

		expect(allow.changeDocument.can()).toBe(true)
		expect(withCtx.can({ x: 1 })).toBe(true)
	})
})
