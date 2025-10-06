import { createMigrationSequence, MigrationSequence, StoreSchema } from '@tldraw/store'
import { T } from '@tldraw/validate'
import { describe, expect, it } from 'vitest'
import { createTLSchema, defaultBindingSchemas, defaultShapeSchemas } from './createTLSchema'
import { TLDefaultBinding } from './records/TLBinding'
import { TLDefaultShape } from './records/TLShape'
import { StyleProp } from './styles/StyleProp'
import { DefaultColorStyle } from './styles/TLColorStyle'

describe('defaultShapeSchemas', () => {
	const expectedShapeTypes: Array<TLDefaultShape['type']> = [
		'arrow',
		'bookmark',
		'draw',
		'embed',
		'frame',
		'geo',
		'group',
		'highlight',
		'image',
		'line',
		'note',
		'text',
		'video',
	]

	it('should contain all default shape types', () => {
		const actualShapeTypes = Object.keys(defaultShapeSchemas)

		expect(actualShapeTypes).toHaveLength(expectedShapeTypes.length)

		for (const shapeType of expectedShapeTypes) {
			expect(actualShapeTypes).toContain(shapeType)
		}
	})

	it('should contain style properties in shape props', () => {
		// Test a few known shapes that should have style properties
		const geoProps = defaultShapeSchemas.geo.props
		const arrowProps = defaultShapeSchemas.arrow.props

		// Check that some props are StyleProp instances
		let hasStyleProp = false
		for (const prop of Object.values(geoProps || {})) {
			if (prop instanceof StyleProp) {
				hasStyleProp = true
				break
			}
		}
		expect(hasStyleProp).toBe(true)

		// Check arrow props too
		hasStyleProp = false
		for (const prop of Object.values(arrowProps || {})) {
			if (prop instanceof StyleProp) {
				hasStyleProp = true
				break
			}
		}
		expect(hasStyleProp).toBe(true)
	})
})

describe('defaultBindingSchemas', () => {
	const expectedBindingTypes: Array<TLDefaultBinding['type']> = ['arrow']

	it('should contain all default binding types', () => {
		const actualBindingTypes = Object.keys(defaultBindingSchemas)

		expect(actualBindingTypes).toHaveLength(expectedBindingTypes.length)

		for (const bindingType of expectedBindingTypes) {
			expect(actualBindingTypes).toContain(bindingType)
		}
	})
})

describe('createTLSchema', () => {
	it('should create a valid schema with default parameters', () => {
		const schema = createTLSchema()

		expect(schema).toBeInstanceOf(StoreSchema)
		expect(schema.types).toBeDefined()
		expect(schema.migrations).toBeDefined()
	})

	it('should create schema with custom shapes', () => {
		const customShapeProps = {
			customProp: T.string,
			color: DefaultColorStyle,
		}

		const customShapes = {
			...defaultShapeSchemas,
			custom: {
				props: customShapeProps,
				migrations: createMigrationSequence({
					sequenceId: 'com.tldraw.shape.custom', // Use the expected format
					sequence: [],
				}),
			},
		}

		const schema = createTLSchema({ shapes: customShapes })

		expect(schema).toBeInstanceOf(StoreSchema)
		expect(schema.types.shape).toBeDefined()
	})

	it('should create schema with custom bindings', () => {
		const customBindingProps = {
			customProp: T.number,
		}

		const customBindings = {
			...defaultBindingSchemas,
			custom: {
				props: customBindingProps,
				migrations: createMigrationSequence({
					sequenceId: 'com.tldraw.binding.custom', // Use the expected format
					sequence: [],
				}),
			},
		}

		const schema = createTLSchema({ bindings: customBindings })

		expect(schema).toBeInstanceOf(StoreSchema)
		expect(schema.types.binding).toBeDefined()
	})

	it('should create schema with additional migrations', () => {
		const additionalMigrations: MigrationSequence[] = [
			createMigrationSequence({
				sequenceId: 'com.test.additional',
				sequence: [],
			}),
		]

		const schema = createTLSchema({ migrations: additionalMigrations })

		expect(schema).toBeInstanceOf(StoreSchema)
		expect(schema.migrations).toBeDefined()
	})

	it('should create schema with only specific shapes', () => {
		const minimalShapes = {
			geo: defaultShapeSchemas.geo,
			text: defaultShapeSchemas.text,
			arrow: defaultShapeSchemas.arrow, // Include arrow to satisfy binding dependencies
		}

		const schema = createTLSchema({ shapes: minimalShapes })

		expect(schema).toBeInstanceOf(StoreSchema)
		expect(schema.types.shape).toBeDefined()
	})

	describe('style property collection and validation', () => {
		it('should throw error for duplicate style property IDs', () => {
			// Create a duplicate style property with same ID as DefaultColorStyle
			const duplicateColorStyle = StyleProp.defineEnum('tldraw:color', {
				defaultValue: 'black',
				values: ['black', 'white'],
			})

			const conflictingShapes = {
				shape1: {
					props: { color: DefaultColorStyle },
				},
				shape2: {
					props: { color: duplicateColorStyle },
				},
			}

			expect(() => createTLSchema({ shapes: conflictingShapes })).toThrow(
				'Multiple StyleProp instances with the same id: tldraw:color'
			)
		})
	})
})
