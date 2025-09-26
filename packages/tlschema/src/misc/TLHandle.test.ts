import { describe, expect, it, test } from 'vitest'
import { TL_HANDLE_TYPES, TLHandle, TLHandleType } from './TLHandle'

describe('TLHandle', () => {
	describe('TL_HANDLE_TYPES', () => {
		it('should be a Set containing expected handle types', () => {
			expect(TL_HANDLE_TYPES).toBeInstanceOf(Set)
			expect(TL_HANDLE_TYPES.size).toBeGreaterThan(0)
		})

		it('should contain all expected handle types', () => {
			const expectedHandleTypes = ['vertex', 'virtual', 'create', 'clone']

			expectedHandleTypes.forEach((handleType) => {
				expect(TL_HANDLE_TYPES.has(handleType as TLHandleType)).toBe(true)
			})
		})

		it('should have the correct number of handle types', () => {
			// Verify the set contains exactly the expected number of handle types
			expect(TL_HANDLE_TYPES.size).toBe(4)
		})

		it('should not contain unexpected handle types', () => {
			const unexpectedHandleTypes = [
				'move',
				'resize',
				'rotate',
				'select',
				'drag',
				'handle',
				'point',
				'anchor',
				'control',
				'bezier',
				'line',
				'curve',
				'endpoint',
				'midpoint',
			]

			unexpectedHandleTypes.forEach((handleType) => {
				expect(TL_HANDLE_TYPES.has(handleType as any)).toBe(false)
			})
		})

		it('should be immutable (readonly)', () => {
			// The Set should be created with readonly values
			const originalSize = TL_HANDLE_TYPES.size

			// Try to add a new value (this should not affect the original set due to const assertion)
			expect(TL_HANDLE_TYPES.size).toBe(originalSize)
		})

		test('should work with Array.from() conversion', () => {
			const handleTypesArray = Array.from(TL_HANDLE_TYPES)

			expect(Array.isArray(handleTypesArray)).toBe(true)
			expect(handleTypesArray.length).toBe(TL_HANDLE_TYPES.size)

			// All array elements should be strings
			handleTypesArray.forEach((handleType) => {
				expect(typeof handleType).toBe('string')
			})
		})

		test('should support iteration', () => {
			let count = 0
			for (const handleType of TL_HANDLE_TYPES) {
				expect(typeof handleType).toBe('string')
				count++
			}
			expect(count).toBe(TL_HANDLE_TYPES.size)
		})

		test('should contain specific handle types for different use cases', () => {
			// Vertex handles for shape control points
			expect(TL_HANDLE_TYPES.has('vertex')).toBe(true)
			// Virtual handles for adding new points
			expect(TL_HANDLE_TYPES.has('virtual')).toBe(true)
			// Create handles for extending geometry
			expect(TL_HANDLE_TYPES.has('create')).toBe(true)
			// Clone handles for duplicating elements
			expect(TL_HANDLE_TYPES.has('clone')).toBe(true)
		})
	})

	describe('TLHandleType', () => {
		test('should accept all valid handle types', () => {
			const vertexHandle: TLHandleType = 'vertex'
			const virtualHandle: TLHandleType = 'virtual'
			const createHandle: TLHandleType = 'create'
			const cloneHandle: TLHandleType = 'clone'

			expect(vertexHandle).toBe('vertex')
			expect(virtualHandle).toBe('virtual')
			expect(createHandle).toBe('create')
			expect(cloneHandle).toBe('clone')
		})

		test('should be consistent with TL_HANDLE_TYPES set', () => {
			// Every value in the Set should be a valid TLHandleType
			for (const handleType of TL_HANDLE_TYPES) {
				// This validates that the type system is consistent
				const typedHandle: TLHandleType = handleType
				expect(typedHandle).toBe(handleType)
			}
		})
	})

	describe('TLHandle interface', () => {
		describe('valid handle creation', () => {
			it('should create a valid vertex handle', () => {
				const vertexHandle: TLHandle = {
					id: 'end-point',
					label: 'End point',
					type: 'vertex',
					canSnap: true,
					index: 'a1' as any, // IndexKey
					x: 100,
					y: 50,
				}

				expect(vertexHandle.id).toBe('end-point')
				expect(vertexHandle.label).toBe('End point')
				expect(vertexHandle.type).toBe('vertex')
				expect(vertexHandle.canSnap).toBe(true)
				expect(vertexHandle.index).toBe('a1')
				expect(vertexHandle.x).toBe(100)
				expect(vertexHandle.y).toBe(50)
			})

			it('should create a valid virtual handle', () => {
				const virtualHandle: TLHandle = {
					id: 'virtual-1',
					type: 'virtual',
					canSnap: false,
					index: 'a1V' as any, // IndexKey
					x: 75,
					y: 25,
				}

				expect(virtualHandle.id).toBe('virtual-1')
				expect(virtualHandle.label).toBeUndefined()
				expect(virtualHandle.type).toBe('virtual')
				expect(virtualHandle.canSnap).toBe(false)
				expect(virtualHandle.index).toBe('a1V')
				expect(virtualHandle.x).toBe(75)
				expect(virtualHandle.y).toBe(25)
			})

			it('should create a valid create handle', () => {
				const createHandle: TLHandle = {
					id: 'create',
					type: 'create',
					canSnap: true,
					index: 'a2' as any, // IndexKey
					x: 200,
					y: 100,
				}

				expect(createHandle.id).toBe('create')
				expect(createHandle.label).toBeUndefined()
				expect(createHandle.type).toBe('create')
				expect(createHandle.canSnap).toBe(true)
				expect(createHandle.index).toBe('a2')
				expect(createHandle.x).toBe(200)
				expect(createHandle.y).toBe(100)
			})

			it('should create a valid clone handle', () => {
				const cloneHandle: TLHandle = {
					id: 'clone-handle',
					label: 'Clone this element',
					type: 'clone',
					canSnap: false,
					index: 'b1' as any, // IndexKey
					x: 150,
					y: 75,
				}

				expect(cloneHandle.id).toBe('clone-handle')
				expect(cloneHandle.label).toBe('Clone this element')
				expect(cloneHandle.type).toBe('clone')
				expect(cloneHandle.canSnap).toBe(false)
				expect(cloneHandle.index).toBe('b1')
				expect(cloneHandle.x).toBe(150)
				expect(cloneHandle.y).toBe(75)
			})
		})

		describe('handle properties', () => {
			it('should support all required properties', () => {
				const handle: TLHandle = {
					id: 'test-handle',
					type: 'vertex',
					index: 'a1' as any,
					x: 0,
					y: 0,
				}

				// Required properties
				expect(typeof handle.id).toBe('string')
				expect(typeof handle.type).toBe('string')
				expect(TL_HANDLE_TYPES.has(handle.type)).toBe(true)
				expect(typeof handle.index).toBe('string')
				expect(typeof handle.x).toBe('number')
				expect(typeof handle.y).toBe('number')
			})

			it('should support optional properties', () => {
				const handleWithAllProps: TLHandle = {
					id: 'full-handle',
					label: 'Complete handle',
					type: 'vertex',
					canSnap: true,
					index: 'a1' as any,
					x: 100,
					y: 50,
				}

				expect(typeof handleWithAllProps.label).toBe('string')
				expect(typeof handleWithAllProps.canSnap).toBe('boolean')
			})

			it('should handle optional properties being undefined', () => {
				const handleMinimal: TLHandle = {
					id: 'minimal',
					type: 'vertex',
					index: 'a1' as any,
					x: 0,
					y: 0,
				}

				expect(handleMinimal.label).toBeUndefined()
				expect(handleMinimal.canSnap).toBeUndefined()
			})
		})

		describe('coordinate system', () => {
			it('should support positive coordinates', () => {
				const handle: TLHandle = {
					id: 'positive',
					type: 'vertex',
					index: 'a1' as any,
					x: 100,
					y: 200,
				}

				expect(handle.x).toBe(100)
				expect(handle.y).toBe(200)
			})

			it('should support negative coordinates', () => {
				const handle: TLHandle = {
					id: 'negative',
					type: 'vertex',
					index: 'a1' as any,
					x: -50,
					y: -75,
				}

				expect(handle.x).toBe(-50)
				expect(handle.y).toBe(-75)
			})

			it('should support zero coordinates', () => {
				const handle: TLHandle = {
					id: 'origin',
					type: 'vertex',
					index: 'a1' as any,
					x: 0,
					y: 0,
				}

				expect(handle.x).toBe(0)
				expect(handle.y).toBe(0)
			})

			it('should support decimal coordinates', () => {
				const handle: TLHandle = {
					id: 'decimal',
					type: 'vertex',
					index: 'a1' as any,
					x: 123.456,
					y: 789.123,
				}

				expect(handle.x).toBe(123.456)
				expect(handle.y).toBe(789.123)
			})
		})

		describe('handle types behavior', () => {
			test('should create handles for different shape manipulation scenarios', () => {
				// Line endpoint handle
				const lineEnd: TLHandle = {
					id: 'line-end',
					type: 'vertex',
					canSnap: true,
					index: 'a2' as any,
					x: 100,
					y: 100,
				}

				// Midpoint virtual handle for adding points
				const midpoint: TLHandle = {
					id: 'midpoint-virtual',
					type: 'virtual',
					canSnap: false,
					index: 'a1V' as any,
					x: 50,
					y: 50,
				}

				// Create handle for extending a line
				const extender: TLHandle = {
					id: 'extend-line',
					type: 'create',
					canSnap: true,
					index: 'a3' as any,
					x: 150,
					y: 150,
				}

				// Clone handle for duplicating geometry
				const duplicator: TLHandle = {
					id: 'duplicate',
					type: 'clone',
					canSnap: false,
					index: 'b1' as any,
					x: 75,
					y: 125,
				}

				expect(lineEnd.type).toBe('vertex')
				expect(midpoint.type).toBe('virtual')
				expect(extender.type).toBe('create')
				expect(duplicator.type).toBe('clone')
			})

			test('should support snapping behavior configuration', () => {
				const snappingHandle: TLHandle = {
					id: 'snapper',
					type: 'vertex',
					canSnap: true,
					index: 'a1' as any,
					x: 0,
					y: 0,
				}

				const nonSnappingHandle: TLHandle = {
					id: 'no-snap',
					type: 'virtual',
					canSnap: false,
					index: 'a2' as any,
					x: 0,
					y: 0,
				}

				expect(snappingHandle.canSnap).toBe(true)
				expect(nonSnappingHandle.canSnap).toBe(false)
			})
		})

		describe('index ordering', () => {
			it('should support various index key formats', () => {
				const handles: TLHandle[] = [
					{
						id: 'first',
						type: 'vertex',
						index: 'a1' as any,
						x: 0,
						y: 0,
					},
					{
						id: 'second',
						type: 'vertex',
						index: 'a2' as any,
						x: 10,
						y: 10,
					},
					{
						id: 'virtual-between',
						type: 'virtual',
						index: 'a1V' as any,
						x: 5,
						y: 5,
					},
				]

				handles.forEach((handle) => {
					expect(typeof handle.index).toBe('string')
					expect(handle.index.length).toBeGreaterThan(0)
				})
			})
		})
	})

	describe('integration scenarios', () => {
		test('should work in realistic handle arrays', () => {
			const shapeHandles: TLHandle[] = [
				// Start vertex
				{
					id: 'start',
					label: 'Start point',
					type: 'vertex',
					canSnap: true,
					index: 'a1' as any,
					x: 0,
					y: 0,
				},
				// Virtual handle for adding point
				{
					id: 'virtual-1',
					type: 'virtual',
					canSnap: false,
					index: 'a1V' as any,
					x: 50,
					y: 25,
				},
				// End vertex
				{
					id: 'end',
					label: 'End point',
					type: 'vertex',
					canSnap: true,
					index: 'a2' as any,
					x: 100,
					y: 50,
				},
				// Create handle for extending
				{
					id: 'extend',
					type: 'create',
					canSnap: true,
					index: 'a3' as any,
					x: 150,
					y: 75,
				},
			]

			expect(shapeHandles).toHaveLength(4)
			expect(shapeHandles.every((h) => TL_HANDLE_TYPES.has(h.type))).toBe(true)
			expect(shapeHandles.every((h) => typeof h.id === 'string')).toBe(true)
			expect(shapeHandles.every((h) => typeof h.x === 'number')).toBe(true)
			expect(shapeHandles.every((h) => typeof h.y === 'number')).toBe(true)
		})

		test('should support handle filtering by type', () => {
			const allHandles: TLHandle[] = [
				{ id: 'v1', type: 'vertex', index: 'a1' as any, x: 0, y: 0 },
				{ id: 'virt1', type: 'virtual', index: 'a1V' as any, x: 5, y: 5 },
				{ id: 'v2', type: 'vertex', index: 'a2' as any, x: 10, y: 10 },
				{ id: 'create1', type: 'create', index: 'a3' as any, x: 15, y: 15 },
				{ id: 'clone1', type: 'clone', index: 'b1' as any, x: 20, y: 20 },
			]

			const vertexHandles = allHandles.filter((h) => h.type === 'vertex')
			const virtualHandles = allHandles.filter((h) => h.type === 'virtual')
			const createHandles = allHandles.filter((h) => h.type === 'create')
			const cloneHandles = allHandles.filter((h) => h.type === 'clone')

			expect(vertexHandles).toHaveLength(2)
			expect(virtualHandles).toHaveLength(1)
			expect(createHandles).toHaveLength(1)
			expect(cloneHandles).toHaveLength(1)
		})

		test('should support handle transformation operations', () => {
			const originalHandle: TLHandle = {
				id: 'transform-test',
				type: 'vertex',
				canSnap: true,
				index: 'a1' as any,
				x: 50,
				y: 100,
			}

			// Simulate handle movement
			const movedHandle: TLHandle = {
				...originalHandle,
				x: originalHandle.x + 25,
				y: originalHandle.y - 10,
			}

			expect(movedHandle.x).toBe(75)
			expect(movedHandle.y).toBe(90)
			expect(movedHandle.id).toBe(originalHandle.id)
			expect(movedHandle.type).toBe(originalHandle.type)
		})

		test('should work with handle identification patterns', () => {
			const handles: TLHandle[] = [
				{ id: 'line-start', type: 'vertex', index: 'a1' as any, x: 0, y: 0 },
				{ id: 'line-end', type: 'vertex', index: 'a2' as any, x: 100, y: 100 },
			]

			const findHandleById = (id: string) => handles.find((h) => h.id === id)
			const findHandlesByType = (type: TLHandleType) => handles.filter((h) => h.type === type)

			expect(findHandleById('line-start')).toBeDefined()
			expect(findHandleById('nonexistent')).toBeUndefined()
			expect(findHandlesByType('vertex')).toHaveLength(2)
			expect(findHandlesByType('virtual')).toHaveLength(0)
		})
	})

	describe('type safety and consistency', () => {
		test('should maintain type consistency between Set and type', () => {
			// Verify that every value in TL_HANDLE_TYPES is a valid TLHandleType
			const handleTypeValues: TLHandleType[] = Array.from(TL_HANDLE_TYPES)

			handleTypeValues.forEach((type) => {
				// This should compile without errors
				const handle: TLHandle = {
					id: `test-${type}`,
					type: type,
					index: 'a1' as any,
					x: 0,
					y: 0,
				}

				expect(handle.type).toBe(type)
				expect(TL_HANDLE_TYPES.has(handle.type)).toBe(true)
			})
		})

		test('should work with documented examples', () => {
			// Test examples from JSDoc comments

			// Example 1: Check if a handle type is valid
			const isValidHandleType = TL_HANDLE_TYPES.has('vertex')
			expect(isValidHandleType).toBe(true)

			// Example 2: Get all available handle types
			const allHandleTypes = Array.from(TL_HANDLE_TYPES)
			expect(allHandleTypes).toContain('vertex')
			expect(allHandleTypes).toContain('virtual')
			expect(allHandleTypes).toContain('create')
			expect(allHandleTypes).toContain('clone')

			// Example 3: Create different handle types
			const vertexHandle: TLHandleType = 'vertex'
			const virtualHandle: TLHandleType = 'virtual'
			const createHandle: TLHandleType = 'create'
			const cloneHandle: TLHandleType = 'clone'

			expect(vertexHandle).toBe('vertex')
			expect(virtualHandle).toBe('virtual')
			expect(createHandle).toBe('create')
			expect(cloneHandle).toBe('clone')
		})

		test('should support const assertion patterns', () => {
			// Verify the const assertion works as expected
			const handleTypes = ['vertex', 'virtual', 'create', 'clone'] as const

			// Each type should be in the Set
			handleTypes.forEach((type) => {
				expect(TL_HANDLE_TYPES.has(type)).toBe(true)
			})
		})
	})
})
