import { testSchemaV1 } from './testSchema.v1'

describe('parseId', () => {
	it('should return the part after the colon', () => {
		expect(testSchemaV1.types.user.parseId('user:123' as any)).toBe('123')
		expect(testSchemaV1.types.shape.parseId('shape:xyz' as any)).toBe('xyz')
	})
	it('should throw if the typename does not match', () => {
		expect(() => testSchemaV1.types.user.parseId('shape:123' as any)).toThrow()
		expect(() => testSchemaV1.types.shape.parseId('user:xyz' as any)).toThrow()
	})
})

describe('createId', () => {
	it('should prepend the typename and a colon', () => {
		expect(testSchemaV1.types.user.createId('123')).toBe('user:123')
		expect(testSchemaV1.types.shape.createId('xyz')).toBe('shape:xyz')
	})
})
