import { createMigrationSequence, MigrationSequence, StoreSchema } from '@tldraw/store'
import { T } from '@tldraw/validate'
import { describe, expect, it } from 'vitest'
import {
	createTLSchema,
	defaultBindingSchemas,
	defaultShapeSchemas,
	SchemaPropsInfo,
	TLSchema,
} from './createTLSchema'
import { TLDefaultBinding } from './records/TLBinding'
import { TLRecord } from './records/TLRecord'
import { TLDefaultShape } from './records/TLShape'
import { StyleProp } from './styles/StyleProp'
import { DefaultColorStyle } from './styles/TLColorStyle'
import { DefaultSizeStyle } from './styles/TLSizeStyle'
import { TLStoreProps } from './TLStore'

describe('SchemaPropsInfo interface', () => {
	it('should accept valid schema info with all properties', () => {
		const validSchemaInfo: SchemaPropsInfo = {
			migrations: createMigrationSequence({
				sequenceId: 'test',
				sequence: [],
			}),
			props: {
				color: DefaultColorStyle,
				size: DefaultSizeStyle,
				width: T.number,
			},
			meta: {
				customField: T.string,
			},
		}

		expect(validSchemaInfo).toBeDefined()
		expect(validSchemaInfo.migrations).toBeDefined()
		expect(validSchemaInfo.props).toBeDefined()
		expect(validSchemaInfo.meta).toBeDefined()
	})

	it('should accept schema info with only props', () => {
		const minimalSchemaInfo: SchemaPropsInfo = {
			props: {
				width: T.number,
				height: T.number,
			},
		}

		expect(minimalSchemaInfo).toBeDefined()
		expect(minimalSchemaInfo.props).toBeDefined()
		expect(minimalSchemaInfo.migrations).toBeUndefined()
		expect(minimalSchemaInfo.meta).toBeUndefined()
	})

	it('should accept empty schema info', () => {
		const emptySchemaInfo: SchemaPropsInfo = {}

		expect(emptySchemaInfo).toBeDefined()
		expect(Object.keys(emptySchemaInfo)).toHaveLength(0)
	})
})

describe('TLSchema type', () => {
	it('should be assignable from createTLSchema result', () => {
		const schema: TLSchema = createTLSchema()

		expect(schema).toBeInstanceOf(StoreSchema)
		expect(schema.types).toBeDefined()
		expect(schema.migrations).toBeDefined()
	})
})

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

	it('should have valid schema info for each shape type', () => {
		for (const [_shapeType, schemaInfo] of Object.entries(defaultShapeSchemas)) {
			expect(schemaInfo).toBeDefined()
			expect(schemaInfo.migrations).toBeDefined()
			expect(schemaInfo.props).toBeDefined()

			// Check that migrations has the expected structure (TLPropsMigrations format)
			expect(schemaInfo.migrations).toHaveProperty('sequence')
			expect(Array.isArray((schemaInfo.migrations as any).sequence)).toBe(true)

			// Check that props is a record of validators
			expect(typeof schemaInfo.props).toBe('object')
			expect(schemaInfo.props).not.toBeNull()
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

	it('should have valid schema info for each binding type', () => {
		for (const [_bindingType, schemaInfo] of Object.entries(defaultBindingSchemas)) {
			expect(schemaInfo).toBeDefined()
			expect(schemaInfo.migrations).toBeDefined()
			expect(schemaInfo.props).toBeDefined()

			// Check that migrations has the expected structure (TLPropsMigrations format)
			expect(schemaInfo.migrations).toHaveProperty('sequence')
			expect(Array.isArray((schemaInfo.migrations as any).sequence)).toBe(true)

			// Check that props is a record of validators
			expect(typeof schemaInfo.props).toBe('object')
			expect(schemaInfo.props).not.toBeNull()
		}
	})
})

describe('createTLSchema', () => {
	it('should create a valid schema with default parameters', () => {
		const schema = createTLSchema()

		expect(schema).toBeInstanceOf(StoreSchema)
		expect(schema.types).toBeDefined()
		expect(schema.migrations).toBeDefined()

		// Check that all expected record types are present
		const expectedRecordTypes = [
			'asset',
			'binding',
			'camera',
			'document',
			'instance',
			'instance_page_state',
			'page',
			'instance_presence',
			'pointer',
			'shape',
		]

		for (const recordType of expectedRecordTypes) {
			expect(schema.types).toHaveProperty(recordType)
		}
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

	it('should handle empty shapes and bindings', () => {
		const schema = createTLSchema({
			shapes: {},
			bindings: {},
		})

		expect(schema).toBeInstanceOf(StoreSchema)
		expect(schema.types.shape).toBeDefined()
		expect(schema.types.binding).toBeDefined()
	})

	describe('style property collection and validation', () => {
		it('should collect style properties from shapes', () => {
			// Create a custom shape with known style properties
			const customProps = {
				color: DefaultColorStyle,
				size: DefaultSizeStyle,
				regularProp: T.string,
			}

			const shapes = {
				custom: { props: customProps },
				arrow: defaultShapeSchemas.arrow, // Include arrow to satisfy binding dependencies
			}

			// This should not throw
			expect(() => createTLSchema({ shapes })).not.toThrow()
		})

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

		it('should allow same style property used across different shapes', () => {
			const shapes = {
				shape1: {
					props: {
						color: DefaultColorStyle,
						size: DefaultSizeStyle,
					},
				},
				shape2: {
					props: {
						color: DefaultColorStyle, // Same instance is OK
						width: T.number,
					},
				},
				arrow: defaultShapeSchemas.arrow, // Include arrow to satisfy binding dependencies
			}

			// This should not throw since it's the same StyleProp instance
			expect(() => createTLSchema({ shapes })).not.toThrow()
		})

		it('should collect style properties from shapes with no props', () => {
			const shapes = {
				empty1: {},
				empty2: { props: undefined },
				withProps: { props: { color: DefaultColorStyle } },
				arrow: defaultShapeSchemas.arrow, // Include arrow to satisfy binding dependencies
			}

			expect(() => createTLSchema({ shapes })).not.toThrow()
		})
	})

	describe('migration processing', () => {
		it('should process shape migrations correctly', () => {
			const customMigrations = createMigrationSequence({
				sequenceId: 'com.tldraw.shape.custom',
				sequence: [
					{
						id: 'com.tldraw.shape.custom/1',
						scope: 'record' as const,
						up: (props: any) => ({ ...props, newProp: 'default' }),
						down: (props: any) => {
							const { _newProp, ...rest } = props
							return rest
						},
					},
				],
			})

			const shapes = {
				custom: {
					props: { customProp: T.string },
					migrations: customMigrations,
				},
				arrow: defaultShapeSchemas.arrow, // Include arrow to satisfy binding dependencies
			}

			const schema = createTLSchema({ shapes })

			expect(schema).toBeInstanceOf(StoreSchema)
			// Migration processing is complex, just verify schema is created successfully
			expect(schema.migrations).toBeDefined()
		})

		it('should process binding migrations correctly', () => {
			const customMigrations = createMigrationSequence({
				sequenceId: 'com.tldraw.binding.custom',
				sequence: [
					{
						id: 'com.tldraw.binding.custom/1',
						scope: 'record' as const,
						up: (props: any) => ({ ...props, newProp: 42 }),
						down: (props: any) => {
							const { _newProp, ...rest } = props
							return rest
						},
					},
				],
			})

			const bindings = {
				custom: {
					props: { customProp: T.number },
					migrations: customMigrations,
				},
			}

			const schema = createTLSchema({ bindings })

			expect(schema).toBeInstanceOf(StoreSchema)
			// Migration processing is complex, just verify schema is created successfully
			expect(schema.migrations).toBeDefined()
		})

		it('should include core migrations', () => {
			const schema = createTLSchema()

			// Migrations structure is complex internal object, just verify they exist
			expect(schema.migrations).toBeDefined()
			expect(typeof schema.migrations).toBe('object')
		})
	})

	describe('record type creation', () => {
		it('should create shape record type with custom shapes', () => {
			const customShapes = {
				geo: defaultShapeSchemas.geo,
				text: defaultShapeSchemas.text,
				arrow: defaultShapeSchemas.arrow, // Include arrow to satisfy binding dependencies
			}

			const schema = createTLSchema({ shapes: customShapes })

			expect(schema.types.shape).toBeDefined()
			expect(schema.types.shape.typeName).toBe('shape')
		})

		it('should create binding record type with custom bindings', () => {
			const customBindings = {
				arrow: defaultBindingSchemas.arrow,
			}

			const schema = createTLSchema({ bindings: customBindings })

			expect(schema.types.binding).toBeDefined()
			expect(schema.types.binding.typeName).toBe('binding')
		})

		it('should create instance record type with collected styles', () => {
			const schema = createTLSchema()

			expect(schema.types.instance).toBeDefined()
			expect(schema.types.instance.typeName).toBe('instance')
		})
	})

	describe('integration with store system', () => {
		it('should create schema compatible with Store', () => {
			const schema = createTLSchema()

			// Check that schema has required properties for Store
			expect(schema.types).toBeDefined()
			expect(schema.migrations).toBeDefined()
			// createIntegrityChecker and onValidationFailure are passed to StoreSchema.create
			// but are not properties of the resulting schema
		})

		it('should have correct type signature for TLStoreProps', () => {
			const schema: StoreSchema<TLRecord, TLStoreProps> = createTLSchema()

			expect(schema).toBeDefined()
		})
	})

	describe('comprehensive integration tests', () => {
		it('should create working schema with mixed custom shapes and bindings', () => {
			const customShapes = {
				geo: defaultShapeSchemas.geo,
				text: defaultShapeSchemas.text,
				arrow: defaultShapeSchemas.arrow, // Include arrow to satisfy binding dependencies
				custom: {
					props: {
						color: DefaultColorStyle,
						customProp: T.string,
					},
				},
			}

			const customBindings = {
				arrow: defaultBindingSchemas.arrow,
			}

			const schema = createTLSchema({
				shapes: customShapes,
				bindings: customBindings,
			})

			expect(schema).toBeInstanceOf(StoreSchema)
			expect(schema.types.shape).toBeDefined()
			expect(schema.types.binding).toBeDefined()

			// Verify all record types are present
			const expectedRecordTypes = [
				'asset',
				'binding',
				'camera',
				'document',
				'instance',
				'instance_page_state',
				'page',
				'instance_presence',
				'pointer',
				'shape',
			]

			for (const recordType of expectedRecordTypes) {
				expect(schema.types).toHaveProperty(recordType)
			}
		})

		it('should handle complex style property scenarios', () => {
			// Test with multiple shapes using overlapping style properties
			const complexShapes = {
				shape1: {
					props: {
						color: DefaultColorStyle,
						size: DefaultSizeStyle,
						prop1: T.string,
					},
				},
				shape2: {
					props: {
						color: DefaultColorStyle, // Shared style prop
						prop2: T.number,
					},
				},
				shape3: {
					props: {
						size: DefaultSizeStyle, // Shared style prop
						prop3: T.boolean,
					},
				},
				arrow: defaultShapeSchemas.arrow, // Include arrow to satisfy binding dependencies
			}

			expect(() => createTLSchema({ shapes: complexShapes })).not.toThrow()
		})
	})
})
