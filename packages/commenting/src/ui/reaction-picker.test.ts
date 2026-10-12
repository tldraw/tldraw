import { MouseEvent } from 'react'
import { describe, expect, it } from 'vitest'
import { isMultiSelectPick } from './reaction-picker'

function click(overrides: Partial<MouseEvent> = {}): MouseEvent {
	return {
		metaKey: false,
		ctrlKey: false,
		shiftKey: false,
		altKey: false,
		button: 0,
		...overrides,
	} as MouseEvent
}

describe('isMultiSelectPick', () => {
	it('keeps the palette open on a shift pick', () => {
		expect(isMultiSelectPick(click({ shiftKey: true }))).toBe(true)
	})

	it('closes on a plain pick', () => {
		expect(isMultiSelectPick(click())).toBe(false)
	})

	// custom palettes may call onSelect without an event; that must keep today's close-on-pick
	it('closes when no event is given', () => {
		expect(isMultiSelectPick(undefined)).toBe(false)
	})

	it.each(['metaKey', 'ctrlKey', 'altKey'] as const)(
		'does not treat a %s pick as multi-select',
		(modifier) => {
			expect(isMultiSelectPick(click({ [modifier]: true }))).toBe(false)
		}
	)
})
