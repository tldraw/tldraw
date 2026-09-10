import { MouseEvent } from 'react'
import { describe, expect, it } from 'vitest'
import { isOpenInNewTabClick } from './comments-list'

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

describe('isOpenInNewTabClick', () => {
	it('treats a plain left click as an in-place select', () => {
		expect(isOpenInNewTabClick(click())).toBe(false)
	})

	it.each(['metaKey', 'ctrlKey', 'shiftKey', 'altKey'] as const)(
		'leaves a %s click to the browser',
		(modifier) => {
			expect(isOpenInNewTabClick(click({ [modifier]: true }))).toBe(true)
		}
	)

	it('leaves non-primary-button clicks to the browser', () => {
		expect(isOpenInNewTabClick(click({ button: 1 }))).toBe(true)
	})
})
