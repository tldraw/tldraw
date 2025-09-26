import { describe, expect, test } from 'vitest'
import { SetValue } from './util-types'

describe('util-types', () => {
	describe('SetValue utility type', () => {
		describe('basic type extraction', () => {
			test('should extract string type from Set<string>', () => {
				type StringSet = Set<string>
				type ExtractedType = SetValue<StringSet>

				// TypeScript compile-time test - these should not cause type errors
				const stringValue: ExtractedType = 'test'
				const anotherStringValue: ExtractedType = 'another'

				// Runtime verification that the values are what we expect
				expect(typeof stringValue).toBe('string')
				expect(typeof anotherStringValue).toBe('string')
			})

			test('should extract number type from Set<number>', () => {
				type NumberSet = Set<number>
				type ExtractedType = SetValue<NumberSet>

				// TypeScript compile-time test
				const numberValue: ExtractedType = 42
				const anotherNumberValue: ExtractedType = 3.14

				// Runtime verification
				expect(typeof numberValue).toBe('number')
				expect(typeof anotherNumberValue).toBe('number')
			})

			test('should extract boolean type from Set<boolean>', () => {
				type BooleanSet = Set<boolean>
				type ExtractedType = SetValue<BooleanSet>

				// TypeScript compile-time test
				const boolValue: ExtractedType = true
				const anotherBoolValue: ExtractedType = false

				// Runtime verification
				expect(typeof boolValue).toBe('boolean')
				expect(typeof anotherBoolValue).toBe('boolean')
			})

			test('should extract object type from Set<object>', () => {
				interface TestObject {
					id: number
					name: string
				}

				type ObjectSet = Set<TestObject>
				type ExtractedType = SetValue<ObjectSet>

				// TypeScript compile-time test
				const objValue: ExtractedType = { id: 1, name: 'test' }
				const anotherObjValue: ExtractedType = { id: 2, name: 'another' }

				// Runtime verification
				expect(typeof objValue).toBe('object')
				expect(objValue.id).toBe(1)
				expect(objValue.name).toBe('test')
				expect(typeof anotherObjValue).toBe('object')
				expect(anotherObjValue.id).toBe(2)
				expect(anotherObjValue.name).toBe('another')
			})
		})

		describe('union type extraction', () => {
			test('should extract union type from Set<string | number>', () => {
				type UnionSet = Set<string | number>
				type ExtractedType = SetValue<UnionSet>

				// TypeScript compile-time test - both should be valid
				const stringValue: ExtractedType = 'test'
				const numberValue: ExtractedType = 42

				// Runtime verification
				expect(typeof stringValue).toBe('string')
				expect(typeof numberValue).toBe('number')
			})

			test('should extract complex union type from Set<string | number | boolean>', () => {
				type ComplexUnionSet = Set<string | number | boolean>
				type ExtractedType = SetValue<ComplexUnionSet>

				// TypeScript compile-time test
				const stringValue: ExtractedType = 'test'
				const numberValue: ExtractedType = 42
				const boolValue: ExtractedType = true

				// Runtime verification
				expect(typeof stringValue).toBe('string')
				expect(typeof numberValue).toBe('number')
				expect(typeof boolValue).toBe('boolean')
			})

			test('should extract union of object types', () => {
				interface TypeA {
					type: 'a'
					valueA: string
				}

				interface TypeB {
					type: 'b'
					valueB: number
				}

				type UnionObjectSet = Set<TypeA | TypeB>
				type ExtractedType = SetValue<UnionObjectSet>

				// TypeScript compile-time test
				const typeAValue: ExtractedType = { type: 'a', valueA: 'test' }
				const typeBValue: ExtractedType = { type: 'b', valueB: 42 }

				// Runtime verification
				expect(typeAValue.type).toBe('a')
				expect((typeAValue as TypeA).valueA).toBe('test')
				expect(typeBValue.type).toBe('b')
				expect((typeBValue as TypeB).valueB).toBe(42)
			})
		})

		describe('literal type extraction', () => {
			test('should extract literal string types from Set', () => {
				type LiteralSet = Set<'red' | 'green' | 'blue'>
				type ExtractedType = SetValue<LiteralSet>

				// TypeScript compile-time test
				const redValue: ExtractedType = 'red'
				const greenValue: ExtractedType = 'green'
				const blueValue: ExtractedType = 'blue'

				// Runtime verification
				expect(redValue).toBe('red')
				expect(greenValue).toBe('green')
				expect(blueValue).toBe('blue')
			})

			test('should extract literal number types from Set', () => {
				type NumberLiteralSet = Set<1 | 2 | 3>
				type ExtractedType = SetValue<NumberLiteralSet>

				// TypeScript compile-time test
				const oneValue: ExtractedType = 1
				const twoValue: ExtractedType = 2
				const threeValue: ExtractedType = 3

				// Runtime verification
				expect(oneValue).toBe(1)
				expect(twoValue).toBe(2)
				expect(threeValue).toBe(3)
			})

			test('should extract mixed literal types', () => {
				type MixedLiteralSet = Set<'active' | 'inactive' | 42 | true>
				type ExtractedType = SetValue<MixedLiteralSet>

				// TypeScript compile-time test
				const stringLiteral: ExtractedType = 'active'
				const numberLiteral: ExtractedType = 42
				const booleanLiteral: ExtractedType = true

				// Runtime verification
				expect(stringLiteral).toBe('active')
				expect(numberLiteral).toBe(42)
				expect(booleanLiteral).toBe(true)
			})
		})

		describe('const assertion compatibility', () => {
			test('should work with const asserted arrays converted to sets', () => {
				const COLORS = new Set(['red', 'green', 'blue'] as const)
				type ColorSet = typeof COLORS
				type Color = SetValue<ColorSet>

				// TypeScript compile-time test
				const redColor: Color = 'red'
				const greenColor: Color = 'green'
				const blueColor: Color = 'blue'

				// Runtime verification
				expect(redColor).toBe('red')
				expect(greenColor).toBe('green')
				expect(blueColor).toBe('blue')
				expect(COLORS.has(redColor)).toBe(true)
				expect(COLORS.has(greenColor)).toBe(true)
				expect(COLORS.has(blueColor)).toBe(true)
			})

			test('should work with const asserted object values', () => {
				const STATUS_SET = new Set(['pending', 'active', 'completed'] as const)
				type StatusSet = typeof STATUS_SET
				type Status = SetValue<StatusSet>

				// TypeScript compile-time test
				const pendingStatus: Status = 'pending'
				const activeStatus: Status = 'active'
				const completedStatus: Status = 'completed'

				// Runtime verification with type guard function
				function isValidStatus(status: string): status is Status {
					return STATUS_SET.has(status as Status)
				}

				expect(isValidStatus(pendingStatus)).toBe(true)
				expect(isValidStatus(activeStatus)).toBe(true)
				expect(isValidStatus(completedStatus)).toBe(true)
				expect(isValidStatus('invalid')).toBe(false)
			})

			test('should work with readonly const assertions', () => {
				const UI_COLORS = new Set(['selection-stroke', 'accent', 'muted'] as const)
				type UIColorSet = typeof UI_COLORS
				type UIColor = SetValue<UIColorSet>

				// TypeScript compile-time test - should match the JSDoc example
				const selectionStroke: UIColor = 'selection-stroke'
				const accent: UIColor = 'accent'
				const muted: UIColor = 'muted'

				// Runtime verification - should match JSDoc example behavior
				function isValidUIColor(color: string): color is UIColor {
					return UI_COLORS.has(color as UIColor)
				}

				expect(isValidUIColor(selectionStroke)).toBe(true)
				expect(isValidUIColor(accent)).toBe(true)
				expect(isValidUIColor(muted)).toBe(true)
				expect(isValidUIColor('invalid')).toBe(false)
			})
		})

		describe('edge cases and complex types', () => {
			test('should handle Set<any> type', () => {
				type AnySet = Set<any>
				type ExtractedType = SetValue<AnySet>

				// TypeScript compile-time test - should accept anything
				const stringValue: ExtractedType = 'test'
				const numberValue: ExtractedType = 42
				const objectValue: ExtractedType = { key: 'value' }
				const arrayValue: ExtractedType = [1, 2, 3]

				// Runtime verification
				expect(typeof stringValue).toBe('string')
				expect(typeof numberValue).toBe('number')
				expect(typeof objectValue).toBe('object')
				expect(Array.isArray(arrayValue)).toBe(true)
			})

			test('should handle Set<unknown> type', () => {
				type UnknownSet = Set<unknown>
				type ExtractedType = SetValue<UnknownSet>

				// TypeScript compile-time test - should be unknown
				const value: ExtractedType = 'test' as unknown

				// Runtime verification - value should exist but type should be unknown
				expect(value).toBeDefined()
			})

			test('should handle Set<never> type', () => {
				type NeverSet = Set<never>
				type ExtractedType = SetValue<NeverSet>

				// TypeScript compile-time test - ExtractedType should be never
				// Cannot create values of type never, but we can verify the type exists
				const checkNeverType = (value: ExtractedType): never => value

				// Runtime verification - function should exist
				expect(typeof checkNeverType).toBe('function')
			})

			test('should handle nested generic types', () => {
				type NestedSet = Set<Array<string>>
				type ExtractedType = SetValue<NestedSet>

				// TypeScript compile-time test
				const stringArray: ExtractedType = ['a', 'b', 'c']
				const emptyArray: ExtractedType = []

				// Runtime verification
				expect(Array.isArray(stringArray)).toBe(true)
				expect(stringArray.length).toBe(3)
				expect(Array.isArray(emptyArray)).toBe(true)
				expect(emptyArray.length).toBe(0)
			})

			test('should handle Set of Sets', () => {
				type SetOfSets = Set<Set<string>>
				type ExtractedType = SetValue<SetOfSets>

				// TypeScript compile-time test
				const innerSet: ExtractedType = new Set(['a', 'b'])
				const anotherInnerSet: ExtractedType = new Set(['x', 'y', 'z'])

				// Runtime verification
				expect(innerSet instanceof Set).toBe(true)
				expect(innerSet.has('a')).toBe(true)
				expect(innerSet.has('b')).toBe(true)
				expect(anotherInnerSet instanceof Set).toBe(true)
				expect(anotherInnerSet.size).toBe(3)
			})

			test('should handle Set of functions', () => {
				type FunctionSet = Set<() => string>
				type ExtractedType = SetValue<FunctionSet>

				// TypeScript compile-time test
				const fn1: ExtractedType = () => 'hello'
				const fn2: ExtractedType = () => 'world'

				// Runtime verification
				expect(typeof fn1).toBe('function')
				expect(typeof fn2).toBe('function')
				expect(fn1()).toBe('hello')
				expect(fn2()).toBe('world')
			})
		})

		describe('practical usage scenarios', () => {
			test('should work in function parameters', () => {
				const VALID_COLORS = new Set(['red', 'green', 'blue'] as const)
				type ColorSet = typeof VALID_COLORS
				type Color = SetValue<ColorSet>

				function processColor(color: Color): string {
					return `Processing color: ${color}`
				}

				// TypeScript compile-time test - should match JSDoc example
				const result1 = processColor('red')
				const result2 = processColor('green')
				const result3 = processColor('blue')

				// Runtime verification
				expect(result1).toBe('Processing color: red')
				expect(result2).toBe('Processing color: green')
				expect(result3).toBe('Processing color: blue')
			})

			test('should work with type guards', () => {
				const STATUSES = new Set(['pending', 'completed', 'failed'] as const)
				type StatusSet = typeof STATUSES
				type Status = SetValue<StatusSet>

				function isStatus(value: unknown): value is Status {
					return typeof value === 'string' && STATUSES.has(value as Status)
				}

				function processStatus(input: unknown): Status | null {
					if (isStatus(input)) {
						return input // TypeScript should know this is Status
					}
					return null
				}

				// Runtime verification
				expect(processStatus('pending')).toBe('pending')
				expect(processStatus('completed')).toBe('completed')
				expect(processStatus('failed')).toBe('failed')
				expect(processStatus('invalid')).toBe(null)
				expect(processStatus(123)).toBe(null)
				expect(processStatus(null)).toBe(null)
			})

			test('should work with validation functions', () => {
				const THEMES = new Set(['light', 'dark', 'auto'] as const)
				type ThemeSet = typeof THEMES
				type Theme = SetValue<ThemeSet>

				function validateTheme(input: string): Theme | null {
					if (THEMES.has(input as Theme)) {
						return input as Theme
					}
					return null
				}

				function setTheme(theme: Theme): void {
					// Implementation would set the theme
					expect(['light', 'dark', 'auto']).toContain(theme)
				}

				// Runtime verification
				const validTheme = validateTheme('light')
				if (validTheme) {
					setTheme(validTheme) // Should not cause type error
				}

				expect(validateTheme('light')).toBe('light')
				expect(validateTheme('dark')).toBe('dark')
				expect(validateTheme('auto')).toBe('auto')
				expect(validateTheme('invalid')).toBe(null)
			})

			test('should work with array operations', () => {
				const PRIORITY_LEVELS = new Set(['low', 'medium', 'high', 'critical'] as const)
				type PrioritySet = typeof PRIORITY_LEVELS
				type Priority = SetValue<PrioritySet>

				// Convert set to array for mapping operations
				const priorityArray: Priority[] = Array.from(PRIORITY_LEVELS)

				function getPriorityWeight(priority: Priority): number {
					const weights: Record<Priority, number> = {
						low: 1,
						medium: 2,
						high: 3,
						critical: 4,
					}
					return weights[priority]
				}

				// Runtime verification
				expect(priorityArray.length).toBe(4)
				expect(priorityArray).toContain('low')
				expect(priorityArray).toContain('medium')
				expect(priorityArray).toContain('high')
				expect(priorityArray).toContain('critical')

				const weights = priorityArray.map(getPriorityWeight)
				expect(weights).toContain(1)
				expect(weights).toContain(2)
				expect(weights).toContain(3)
				expect(weights).toContain(4)
			})
		})

		describe('integration with tldraw patterns', () => {
			test('should work with style enum patterns', () => {
				// Simulate tldraw style property pattern
				const DASH_STYLES = new Set(['solid', 'dashed', 'dotted'] as const)
				type DashStyleSet = typeof DASH_STYLES
				type DashStyle = SetValue<DashStyleSet>

				interface StyleProp<T> {
					id: string
					defaultValue: T
					values: Set<T>
				}

				const dashStyleProp: StyleProp<DashStyle> = {
					id: 'tldraw:dash',
					defaultValue: 'solid',
					values: DASH_STYLES,
				}

				// Runtime verification
				expect(dashStyleProp.defaultValue).toBe('solid')
				expect(dashStyleProp.values.has('solid')).toBe(true)
				expect(dashStyleProp.values.has('dashed')).toBe(true)
				expect(dashStyleProp.values.has('dotted')).toBe(true)
				expect(dashStyleProp.values.size).toBe(3)
			})

			test('should work with color enum patterns', () => {
				// Simulate tldraw color system
				const UI_COLORS = new Set([
					'accent',
					'white',
					'black',
					'selection-stroke',
					'selection-fill',
					'laser',
					'muted-1',
				] as const)
				type UIColorSet = typeof UI_COLORS
				type UIColor = SetValue<UIColorSet>

				function isValidUIColor(color: string): color is UIColor {
					return UI_COLORS.has(color as UIColor)
				}

				interface ColorValidator {
					isValid: (value: unknown) => boolean
					validate: (value: unknown) => UIColor
				}

				const colorValidator: ColorValidator = {
					isValid: (value): value is UIColor => typeof value === 'string' && isValidUIColor(value),
					validate: (value): UIColor => {
						if (typeof value === 'string' && isValidUIColor(value)) {
							return value
						}
						throw new Error(`Invalid UI color: ${value}`)
					},
				}

				// Runtime verification
				expect(colorValidator.isValid('accent')).toBe(true)
				expect(colorValidator.isValid('selection-stroke')).toBe(true)
				expect(colorValidator.isValid('invalid')).toBe(false)
				expect(colorValidator.validate('accent')).toBe('accent')
				expect(() => colorValidator.validate('invalid')).toThrow('Invalid UI color: invalid')
			})

			test('should work with shape type patterns', () => {
				// Simulate tldraw shape type system
				const SHAPE_TYPES = new Set([
					'geo',
					'text',
					'draw',
					'arrow',
					'note',
					'frame',
					'group',
					'image',
					'video',
					'bookmark',
					'embed',
					'highlight',
					'line',
				] as const)
				type ShapeTypeSet = typeof SHAPE_TYPES
				type ShapeType = SetValue<ShapeTypeSet>

				interface BaseShape {
					id: string
					type: ShapeType
					x: number
					y: number
				}

				function createShape(type: ShapeType): BaseShape {
					return {
						id: `shape_${Math.random()}`,
						type,
						x: 0,
						y: 0,
					}
				}

				// Runtime verification
				const geoShape = createShape('geo')
				const textShape = createShape('text')
				const arrowShape = createShape('arrow')

				expect(geoShape.type).toBe('geo')
				expect(textShape.type).toBe('text')
				expect(arrowShape.type).toBe('arrow')
				expect(SHAPE_TYPES.has(geoShape.type)).toBe(true)
				expect(SHAPE_TYPES.has(textShape.type)).toBe(true)
				expect(SHAPE_TYPES.has(arrowShape.type)).toBe(true)
			})
		})

		describe('type system integration', () => {
			test('should preserve type information through generic functions', () => {
				function createSetValueExtractor<T extends Set<any>>(
					set: T
				): (value: unknown) => SetValue<T> | null {
					return (value: unknown): SetValue<T> | null => {
						if (set.has(value)) {
							return value as SetValue<T>
						}
						return null
					}
				}

				const stringSet = new Set(['a', 'b', 'c'])
				const numberSet = new Set([1, 2, 3])

				const stringExtractor = createSetValueExtractor(stringSet)
				const numberExtractor = createSetValueExtractor(numberSet)

				// Runtime verification
				expect(stringExtractor('a')).toBe('a')
				expect(stringExtractor('d')).toBe(null)
				expect(numberExtractor(1)).toBe(1)
				expect(numberExtractor(4)).toBe(null)
			})

			test('should work with conditional types', () => {
				type IsStringSet<T> = T extends Set<string> ? true : false
				type IsNumberSet<T> = T extends Set<number> ? true : false

				type StringSetTest = IsStringSet<Set<string>> // Should be true
				type NumberSetTest = IsNumberSet<Set<number>> // Should be true
				type MixedSetTest = IsStringSet<Set<number>> // Should be false

				// TypeScript compile-time verification through type assertions
				const stringSetResult: StringSetTest = true
				const numberSetResult: NumberSetTest = true
				const mixedSetResult: MixedSetTest = false

				// Runtime verification
				expect(stringSetResult).toBe(true)
				expect(numberSetResult).toBe(true)
				expect(mixedSetResult).toBe(false)
			})

			test('should work with mapped types', () => {
				const SETTINGS = new Set(['theme', 'language', 'timezone'] as const)
				type SettingSet = typeof SETTINGS
				type Setting = SetValue<SettingSet>

				// Create a mapped type using the extracted values
				type SettingValues = {
					[K in Setting]: string
				}

				const settingValues: SettingValues = {
					theme: 'dark',
					language: 'en',
					timezone: 'UTC',
				}

				// Runtime verification
				expect(settingValues.theme).toBe('dark')
				expect(settingValues.language).toBe('en')
				expect(settingValues.timezone).toBe('UTC')
				expect(Object.keys(settingValues)).toEqual(['theme', 'language', 'timezone'])
			})
		})

		describe('compatibility with non-Set types', () => {
			test('should return never for non-Set types', () => {
				// This test verifies the type constraint behavior at compile time
				// SetValue<T> where T does not extend Set<any> should result in never

				// We can't actually test non-Set types at compile time with SetValue
				// because the type constraint prevents it, which is the correct behavior
				function testTypeConstraint() {
					// This would cause a compile error if uncommented:
					// type Result = SetValue<string> // Error: Type 'string' does not satisfy the constraint 'Set<any>'

					// Instead, we test that the constraint exists by using a properly constrained type
					type ConstrainedResult = SetValue<Set<string>>
					const value: ConstrainedResult = 'test'
					return value
				}

				expect(typeof testTypeConstraint).toBe('function')
				expect(testTypeConstraint()).toBe('test')
			})

			test('should handle Set-like interfaces', () => {
				interface SetLike<T> extends Set<T> {
					customMethod(): void
				}

				type CustomSet = SetLike<string>
				type ExtractedType = SetValue<CustomSet>

				// TypeScript compile-time test
				const value: ExtractedType = 'test'

				// Runtime verification
				expect(typeof value).toBe('string')
				expect(value).toBe('test')
			})
		})

		describe('performance and memory considerations', () => {
			test('should not affect runtime performance (type-only operation)', () => {
				const LARGE_SET = new Set(Array.from({ length: 1000 }, (_, i) => `item_${i}`))
				type LargeSet = typeof LARGE_SET
				type Item = SetValue<LargeSet>

				const startTime = performance.now()

				// Type extraction happens at compile-time, so runtime should be minimal
				const item: Item = 'item_500'
				const isValid = LARGE_SET.has(item)

				const endTime = performance.now()
				const duration = endTime - startTime

				// Runtime verification
				expect(isValid).toBe(true)
				expect(duration).toBeLessThan(10) // Should be very fast
			})

			test('should work with deeply nested types without stack overflow', () => {
				type Level1 = Set<string>
				type Level2 = Set<Level1>
				type Level3 = Set<Level2>

				type ExtractedLevel1 = SetValue<Level1>
				type ExtractedLevel2 = SetValue<Level2>
				type ExtractedLevel3 = SetValue<Level3>

				// TypeScript compile-time test
				const level1Value: ExtractedLevel1 = 'test'
				const level2Value: ExtractedLevel2 = new Set(['test'])
				const level3Value: ExtractedLevel3 = new Set([new Set(['test'])])

				// Runtime verification
				expect(typeof level1Value).toBe('string')
				expect(level2Value instanceof Set).toBe(true)
				expect(level3Value instanceof Set).toBe(true)
			})
		})
	})
})
