import { testSchemaV1 } from './testSchema.v1'

describe('parseId', () => {
	it('should return the part after the colon', () => {
		expect(testSchemaV1.types.user.parseId('user:123')).toBe('123')
		expect(testSchemaV1.types.shape.parseId('shape:xyz')).toBe('xyz')
	})
	it('should throw if the typename does not match', () => {
		expect(() => testSchemaV1.types.user.parseId('shape:123')).toThrow()
		expect(() => testSchemaV1.types.shape.parseId('user:xyz')).toThrow()
	})
})
