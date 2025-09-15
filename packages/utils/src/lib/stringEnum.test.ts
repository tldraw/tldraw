import { describe, expect, it } from 'vitest'
import { stringEnum } from './stringEnum'

describe('stringEnum', () => {
	describe('basic functionality', () => {
		it('should create object with string keys mapping to themselves', () => {
			const result = stringEnum('red', 'green', 'blue')

			expect(result).toEqual({
				red: 'red',
				green: 'green',
				blue: 'blue',
			})
		})

		it('should handle single value', () => {
			const result = stringEnum('single')

			expect(result).toEqual({
				single: 'single',
			})
		})

		it('should handle multiple values', () => {
			const result = stringEnum('first', 'second', 'third', 'fourth', 'fifth')

			expect(result).toEqual({
				first: 'first',
				second: 'second',
				third: 'third',
				fourth: 'fourth',
				fifth: 'fifth',
			})
		})

		it('should maintain property order', () => {
			const result = stringEnum('z', 'a', 'm', 'b')
			const keys = Object.keys(result)

			expect(keys).toEqual(['z', 'a', 'm', 'b'])
		})

		it('should be usable as object keys', () => {
			const Colors = stringEnum('red', 'green', 'blue')

			const colorMap = {
				[Colors.red]: '#ff0000',
				[Colors.green]: '#00ff00',
				[Colors.blue]: '#0000ff',
			}

			expect(colorMap[Colors.red]).toBe('#ff0000')
			expect(colorMap[Colors.green]).toBe('#00ff00')
			expect(colorMap[Colors.blue]).toBe('#0000ff')
		})
	})

	describe('edge cases', () => {
		it('should handle empty input', () => {
			const result = stringEnum()

			expect(result).toEqual({})
		})

		it('should handle empty strings', () => {
			const result = stringEnum('', 'non-empty')

			expect(result).toEqual({
				'': '',
				'non-empty': 'non-empty',
			})
		})

		it('should handle strings with spaces', () => {
			const result = stringEnum('hello world', 'space test')

			expect(result).toEqual({
				'hello world': 'hello world',
				'space test': 'space test',
			})
		})

		it('should handle special characters', () => {
			const result = stringEnum('special-chars', 'with_underscore', 'with.dot', 'with@symbol')

			expect(result).toEqual({
				'special-chars': 'special-chars',
				with_underscore: 'with_underscore',
				'with.dot': 'with.dot',
				'with@symbol': 'with@symbol',
			})
		})

		it('should handle unicode characters', () => {
			const result = stringEnum('café', '🎨', '特殊字符', 'emoji-🚀-test')

			expect(result).toEqual({
				café: 'café',
				'🎨': '🎨',
				特殊字符: '特殊字符',
				'emoji-🚀-test': 'emoji-🚀-test',
			})
		})

		it('should handle numbers as strings', () => {
			const result = stringEnum('123', '456', '0')

			expect(result).toEqual({
				'123': '123',
				'456': '456',
				'0': '0',
			})
		})

		it('should handle duplicate values by overwriting', () => {
			const result = stringEnum('duplicate', 'unique', 'duplicate')

			// Should contain the key once, with last occurrence winning
			expect(result).toEqual({
				duplicate: 'duplicate',
				unique: 'unique',
			})
			expect(Object.keys(result)).toHaveLength(2)
		})

		it('should handle very long strings', () => {
			const longString = 'a'.repeat(1000)
			const result = stringEnum(longString, 'short')

			expect(result[longString]).toBe(longString)
			expect(result.short).toBe('short')
		})

		it('should handle strings that look like object property names', () => {
			const result = stringEnum('constructor', 'prototype', 'toString', '__proto__')

			expect(result.constructor).toBe('constructor')
			expect(result.prototype).toBe('prototype')
			expect(result.toString).toBe('toString')

			// __proto__ is special - it doesn't create an own property but sets the prototype
			// This is expected JavaScript behavior, not a bug in stringEnum
			expect(Object.prototype.hasOwnProperty.call(result, '__proto__')).toBe(false)
			expect(Object.getOwnPropertyNames(result)).toEqual(['constructor', 'prototype', 'toString'])
		})
	})

	describe('object properties', () => {
		it('should create enumerable properties', () => {
			const result = stringEnum('a', 'b', 'c')

			expect(Object.keys(result)).toEqual(['a', 'b', 'c'])
			expect(Object.values(result)).toEqual(['a', 'b', 'c'])
			expect(Object.entries(result)).toEqual([
				['a', 'a'],
				['b', 'b'],
				['c', 'c'],
			])
		})

		it('should allow property access via bracket notation', () => {
			const result = stringEnum('test', 'value')

			expect(result['test']).toBe('test')
			expect(result['value']).toBe('value')
			expect((result as any)['nonexistent']).toBeUndefined()
		})

		it('should allow property access via dot notation', () => {
			const result = stringEnum('test', 'value')

			expect(result.test).toBe('test')
			expect(result.value).toBe('value')
			// @ts-expect-error - Testing runtime behavior
			expect(result.nonexistent).toBeUndefined()
		})

		it('should support iteration', () => {
			const result = stringEnum('x', 'y', 'z')
			const entries: [string, string][] = []

			for (const [key, value] of Object.entries(result)) {
				entries.push([key, value])
			}

			expect(entries).toEqual([
				['x', 'x'],
				['y', 'y'],
				['z', 'z'],
			])
		})

		it('should support spreading', () => {
			const result = stringEnum('a', 'b')
			const spread = { ...result, c: 'c' }

			expect(spread).toEqual({
				a: 'a',
				b: 'b',
				c: 'c',
			})
		})
	})

	describe('type safety behavior', () => {
		it('should preserve type information in returned object', () => {
			const Colors = stringEnum('red', 'green', 'blue')

			// These tests verify runtime behavior that supports TypeScript type safety
			expect(typeof Colors.red).toBe('string')
			expect(typeof Colors.green).toBe('string')
			expect(typeof Colors.blue).toBe('string')

			// Verify the values are exactly what we expect
			expect(Colors.red).toBe('red')
			expect(Colors.green).toBe('green')
			expect(Colors.blue).toBe('blue')
		})

		it('should work with typeof checks', () => {
			const Actions = stringEnum('create', 'update', 'delete')

			function isValidAction(action: string): action is keyof typeof Actions {
				return action in Actions
			}

			expect(isValidAction('create')).toBe(true)
			expect(isValidAction('update')).toBe(true)
			expect(isValidAction('delete')).toBe(true)
			expect(isValidAction('invalid')).toBe(false)
		})

		it('should work in switch statements', () => {
			const Status = stringEnum('pending', 'success', 'error')

			function getStatusMessage(status: keyof typeof Status): string {
				switch (status) {
					case Status.pending:
						return 'Processing...'
					case Status.success:
						return 'Complete!'
					case Status.error:
						return 'Failed!'
					default:
						return 'Unknown'
				}
			}

			expect(getStatusMessage('pending')).toBe('Processing...')
			expect(getStatusMessage('success')).toBe('Complete!')
			expect(getStatusMessage('error')).toBe('Failed!')
		})

		it('should work as object keys in mappings', () => {
			const Priority = stringEnum('low', 'medium', 'high')

			const priorityColors = {
				[Priority.low]: 'green',
				[Priority.medium]: 'yellow',
				[Priority.high]: 'red',
			} as const

			expect(priorityColors[Priority.low]).toBe('green')
			expect(priorityColors[Priority.medium]).toBe('yellow')
			expect(priorityColors[Priority.high]).toBe('red')
		})
	})

	describe('performance considerations', () => {
		it('should handle large number of values efficiently', () => {
			const values = Array.from({ length: 1000 }, (_, i) => `item${i}`)
			const result = stringEnum(...values)

			expect(Object.keys(result)).toHaveLength(1000)
			expect(result.item0).toBe('item0')
			expect(result.item999).toBe('item999')
		})

		it('should create new object each time', () => {
			const result1 = stringEnum('a', 'b')
			const result2 = stringEnum('a', 'b')

			expect(result1).toEqual(result2)
			expect(result1).not.toBe(result2) // Different object references
		})

		it('should not modify input values', () => {
			const originalValues = ['test', 'values'] as const
			const valuesCopy = [...originalValues]

			stringEnum(...originalValues)

			expect(originalValues).toEqual(valuesCopy)
		})
	})

	describe('real-world usage patterns', () => {
		it('should work for common enum patterns', () => {
			// HTTP methods
			const HttpMethod = stringEnum('GET', 'POST', 'PUT', 'DELETE', 'PATCH')
			expect(HttpMethod.GET).toBe('GET')
			expect(HttpMethod.POST).toBe('POST')

			// Event types
			const EventType = stringEnum('click', 'hover', 'focus', 'blur')
			expect(EventType.click).toBe('click')
			expect(EventType.hover).toBe('hover')

			// File extensions
			const FileExtension = stringEnum('txt', 'json', 'md', 'ts', 'js')
			expect(FileExtension.txt).toBe('txt')
			expect(FileExtension.json).toBe('json')
		})

		it('should work with configuration objects', () => {
			const Theme = stringEnum('light', 'dark', 'auto')
			const LogLevel = stringEnum('debug', 'info', 'warn', 'error')

			const config = {
				theme: Theme.light,
				logLevel: LogLevel.info,
			}

			expect(config.theme).toBe('light')
			expect(config.logLevel).toBe('info')
		})

		it('should work with function parameters', () => {
			const Direction = stringEnum('up', 'down', 'left', 'right')

			function move(direction: keyof typeof Direction): string {
				return `Moving ${Direction[direction]}`
			}

			expect(move('up')).toBe('Moving up')
			expect(move('down')).toBe('Moving down')
			expect(move('left')).toBe('Moving left')
			expect(move('right')).toBe('Moving right')
		})

		it('should work with array filtering', () => {
			const Status = stringEnum('active', 'inactive', 'pending')
			const items = [
				{ name: 'Item 1', status: Status.active },
				{ name: 'Item 2', status: Status.inactive },
				{ name: 'Item 3', status: Status.pending },
				{ name: 'Item 4', status: Status.active },
			]

			const activeItems = items.filter((item) => item.status === Status.active)
			expect(activeItems).toHaveLength(2)
			expect(activeItems[0].name).toBe('Item 1')
			expect(activeItems[1].name).toBe('Item 4')
		})
	})
})
