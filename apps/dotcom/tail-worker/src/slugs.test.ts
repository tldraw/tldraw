import { describe, expect, it } from 'vitest'
import { redactConsoleArgsSlug, redactRoomNotFoundSlug } from './slugs'

// Same fake as apps/dotcom/sync-worker/src/routes/tla/screenshotTestHelpers.ts: a legible
// `do(<name>)` shows up in an assertion rather than an opaque hash.
function fakeNamespace() {
	return { idFromName: (name: string) => ({ toString: () => `do(${name})` }) } as any
}

describe('redactRoomNotFoundSlug', () => {
	it('replaces the slug in a bare "Room not found" message', () => {
		const result = redactRoomNotFoundSlug('Room not found: my-secret-slug', fakeNamespace())

		expect(result).toBe('Room not found: do(/r/my-secret-slug)')
	})

	it('replaces the slug inside a larger stack trace', () => {
		const stack =
			'RoomNotFoundError: Room not found: my-secret-slug\n    at loadFromDb (foo.ts:10:1)'

		const result = redactRoomNotFoundSlug(stack, fakeNamespace())

		expect(result).toBe(
			'RoomNotFoundError: Room not found: do(/r/my-secret-slug)\n    at loadFromDb (foo.ts:10:1)'
		)
	})

	it('replaces every occurrence', () => {
		const text = 'Room not found: a and again Room not found: b'

		expect(redactRoomNotFoundSlug(text, fakeNamespace())).toBe(
			'Room not found: do(/r/a) and again Room not found: do(/r/b)'
		)
	})

	it('leaves text with no matching shape untouched', () => {
		const text = 'x is not a function'

		expect(redactRoomNotFoundSlug(text, fakeNamespace())).toBe(text)
	})

	it('falls back to a redaction marker rather than the plaintext slug when the binding is missing', () => {
		const result = redactRoomNotFoundSlug('Room not found: my-secret-slug', undefined)

		expect(result).toBe('Room not found: <slug>')
	})

	it('falls back to a redaction marker rather than the plaintext slug when idFromName throws', () => {
		const throwingNamespace = {
			idFromName: () => {
				throw new Error('boom')
			},
		} as any

		const result = redactRoomNotFoundSlug('Room not found: my-secret-slug', throwingNamespace)

		expect(result).toBe('Room not found: <slug>')
	})
})

describe('redactConsoleArgsSlug', () => {
	it('converts the slug argument for "failed to retrieve document"', () => {
		const args = ['failed to retrieve document', 'my-secret-slug', new Error('db down')]

		const result = redactConsoleArgsSlug(args, fakeNamespace())

		expect(result[0]).toBe('failed to retrieve document')
		expect(result[1]).toBe('do(/r/my-secret-slug)')
		expect(result[2]).toBe(args[2])
	})

	it('converts the slug argument for "failed to fetch doc"', () => {
		const args = ['failed to fetch doc', 'my-secret-slug', new Error('timeout')]

		const result = redactConsoleArgsSlug(args, fakeNamespace())

		expect(result[1]).toBe('do(/r/my-secret-slug)')
	})

	it('leaves an unrelated console call untouched', () => {
		const args = ['some other log', 'not-a-slug-position']

		expect(redactConsoleArgsSlug(args, fakeNamespace())).toEqual(args)
	})

	it('falls back to a redaction marker rather than the plaintext slug when the binding is missing', () => {
		const args = ['failed to retrieve document', 'my-secret-slug', new Error('db down')]

		const result = redactConsoleArgsSlug(args, undefined)

		expect(result[1]).toBe('<slug>')
	})

	it('falls back to a redaction marker rather than the plaintext slug when idFromName throws', () => {
		const throwingNamespace = {
			idFromName: () => {
				throw new Error('boom')
			},
		} as any
		const args = ['failed to fetch doc', 'my-secret-slug', new Error('timeout')]

		const result = redactConsoleArgsSlug(args, throwingNamespace)

		expect(result[1]).toBe('<slug>')
	})
})
