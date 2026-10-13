import { act } from '@testing-library/react'
import { createShapeId, Editor } from '@tldraw/editor'
import { useEffect } from 'react'
import { vi } from 'vitest'
import { Tldraw } from '../../lib/Tldraw'
import { isActionRunnable } from '../../lib/ui/context/action-state'
import {
	gateActions,
	TLUiActionItem,
	TLUiActionsContextType,
	useActions,
} from '../../lib/ui/context/actions'
import { TLUiOverrides } from '../../lib/ui/overrides'
import { TestEditor } from '../TestEditor'
import { renderTldrawComponentWithEditor } from '../testutils/renderTldrawComponent'

function ActionCapturer({ onCapture }: { onCapture(actions: TLUiActionsContextType): void }) {
	const actions = useActions()
	useEffect(() => {
		onCapture(actions)
	}, [actions, onCapture])
	return null
}

const customOnSelect = vi.fn()

function withCustom(extra?: TLUiOverrides['actions']): TLUiOverrides {
	return {
		actions(editor, actions, helpers) {
			actions['custom'] = { id: 'custom', label: 'action.group', onSelect: customOnSelect }
			return extra ? extra(editor, actions, helpers) : actions
		},
	}
}

async function setup(overrides: TLUiOverrides = withCustom()) {
	let captured: TLUiActionsContextType = {}
	const onUiEvent = vi.fn()
	const { editor } = await renderTldrawComponentWithEditor(
		(onMount) => (
			<Tldraw onMount={onMount} overrides={overrides} onUiEvent={onUiEvent}>
				<ActionCapturer onCapture={(a) => (captured = a)} />
			</Tldraw>
		),
		{ waitForPatterns: false }
	)
	// A state where most actions would run: shapes selected in the select tool.
	act(() => {
		editor.createShapes([
			{ id: createShapeId('a'), type: 'geo', x: 0, y: 0 },
			{ id: createShapeId('b'), type: 'geo', x: 200, y: 0 },
			{ id: createShapeId('c'), type: 'geo', x: 400, y: 0 },
		])
		editor.selectAll()
	})
	customOnSelect.mockClear()
	return { editor, actions: () => captured, onUiEvent }
}

function watch(editor: Editor, onUiEvent: ReturnType<typeof vi.fn>) {
	let changes = 0
	const stop = editor.store.listen(() => changes++)
	const marks = vi.spyOn(editor, 'markHistoryStoppingPoint')
	onUiEvent.mockClear()
	customOnSelect.mockClear()
	return {
		expectNothingRan(id: string) {
			stop()
			expect({
				id,
				changes,
				marks: marks.mock.calls.length,
				events: onUiEvent.mock.calls.length,
				custom: customOnSelect.mock.calls.length,
			}).toEqual({ id, changes: 0, marks: 0, events: 0, custom: 0 })
			marks.mockRestore()
		},
	}
}

describe('isActionRunnable', () => {
	let editor: TestEditor
	beforeEach(() => {
		editor = new TestEditor()
	})
	const action = (partial: Partial<TLUiActionItem> = {}): TLUiActionItem => ({
		id: 'test',
		label: 'action.group',
		onSelect() {},
		...partial,
	})

	it('allows an action with no predicates and blocks a missing one', () => {
		expect(isActionRunnable(editor, action())).toBe(true)
		expect(isActionRunnable(editor, undefined)).toBe(false)
	})

	it('blocks when isAvailable or isEnabled returns false', () => {
		expect(isActionRunnable(editor, action({ isAvailable: () => false }))).toBe(false)
		expect(isActionRunnable(editor, action({ isEnabled: () => false }))).toBe(false)
	})

	it('blocks non-readonlyOk actions in readonly mode', () => {
		editor.updateInstanceState({ isReadonly: true })
		expect(isActionRunnable(editor, action())).toBe(false)
		expect(isActionRunnable(editor, action({ readonlyOk: true }))).toBe(true)
	})

	it.each(['isAvailable', 'isEnabled'] as const)(
		'blocks and reports once when %s throws',
		(predicate) => {
			const error = vi.spyOn(console, 'error').mockImplementation(() => {})
			const throwing = action({
				id: `throws-${predicate}`,
				[predicate]: () => {
					throw new Error('boom')
				},
			})
			expect(isActionRunnable(editor, throwing)).toBe(false)
			expect(isActionRunnable(editor, throwing)).toBe(false)
			expect(error).toHaveBeenCalledTimes(1)
			error.mockRestore()
		}
	)

	it('ignores isChecked, even when it throws', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})
		const checked = action({
			isChecked: () => {
				throw new Error('boom')
			},
		})
		expect(isActionRunnable(editor, checked)).toBe(true)
		expect(error).not.toHaveBeenCalled()
		error.mockRestore()
	})
})

describe('gateActions', () => {
	it('returns new objects and leaves the input untouched', () => {
		const editor = new TestEditor()
		const raw = vi.fn()
		const constant: TLUiActionItem = { id: 'c', label: 'action.group', onSelect: raw }
		const gated = gateActions(editor, { c: constant })
		gateActions(editor, { c: constant })
		// Mutating the input is what would stack wrappers across memo reruns.
		expect(constant.onSelect).toBe(raw)
		expect(gated.c).not.toBe(constant)
	})

	it('ignores an unrelated `this` and uses its own predicates for a spread copy', () => {
		const editor = new TestEditor()
		const raw = vi.fn()
		const gated = gateActions(editor, {
			c: { id: 'c', label: 'action.group', isEnabled: () => false, onSelect: raw },
		})
		gated.c.onSelect.call({ id: 'x' } as any, 'unknown')
		expect(raw).not.toHaveBeenCalled()

		const copy = { ...gated.c, isEnabled: () => true }
		copy.onSelect('unknown')
		expect(raw).toHaveBeenCalledTimes(1)
	})
})

describe('every action gates itself', () => {
	// Importing TestEditor installs fake timers, which stall rendering a real <Tldraw />.
	beforeEach(() => {
		vi.useRealTimers()
	})
	afterEach(() => {
		vi.useFakeTimers()
	})

	it('blocks every action called as a method on a disabled spread copy', async () => {
		const { editor, actions, onUiEvent } = await setup()
		expect(Object.keys(actions()).length).toBeGreaterThan(50)
		for (const [id, action] of Object.entries(actions())) {
			const w = watch(editor, onUiEvent)
			const disabled = { ...action, isEnabled: () => false }
			await act(async () => {
				await disabled.onSelect('unknown')
			})
			w.expectNothingRan(id)
		}
	})

	it('blocks every action called unbound after an id-keyed override disables it', async () => {
		const { editor, actions, onUiEvent } = await setup(
			withCustom((_editor, actions) => {
				for (const id of Object.keys(actions)) {
					actions[id] = { ...actions[id], isEnabled: () => false }
				}
				return actions
			})
		)
		expect(Object.keys(actions()).length).toBeGreaterThan(50)
		for (const [id, action] of Object.entries(actions())) {
			const w = watch(editor, onUiEvent)
			const { onSelect } = action
			await act(async () => {
				await onSelect('unknown')
			})
			w.expectNothingRan(id)
		}
	})

	it('still runs an enabled action', async () => {
		const { editor, actions } = await setup()
		act(() => editor.selectNone())
		act(() => {
			actions()['select-all'].onSelect('unknown')
			actions()['custom'].onSelect('unknown')
		})
		expect(editor.getSelectedShapeIds()).toHaveLength(3)
		expect(customOnSelect).toHaveBeenCalledWith('unknown')
	})

	it('blocks non-readonlyOk actions in readonly mode but runs readonlyOk ones', async () => {
		const { editor, actions, onUiEvent } = await setup()
		act(() => editor.updateInstanceState({ isReadonly: true }))
		const w = watch(editor, onUiEvent)
		act(() => {
			actions()['delete'].onSelect('unknown')
			actions()['custom'].onSelect('unknown')
		})
		w.expectNothingRan('delete and custom')
		act(() => {
			actions()['zoom-in'].onSelect('unknown')
		})
		expect(onUiEvent).toHaveBeenCalled()
	})

	it('returns the promise from an async action', async () => {
		const { actions } = await setup(
			withCustom((_editor, actions) => {
				actions['async'] = { id: 'async', label: 'action.group', onSelect: async () => {} }
				return actions
			})
		)
		const result = actions()['async'].onSelect('unknown')
		expect(result).toBeInstanceOf(Promise)
		await result
	})

	it('treats a throwing predicate as disabled on a direct call', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})
		const { editor, actions, onUiEvent } = await setup()
		const w = watch(editor, onUiEvent)
		const throwing = {
			...actions()['delete'],
			id: 'delete-throws',
			isEnabled: () => {
				throw new Error('boom')
			},
		}
		expect(() => throwing.onSelect('unknown')).not.toThrow()
		w.expectNothingRan('delete-throws')
		error.mockRestore()
	})
})
