import { PageRecordType, createShapeId } from '@tldraw/tlschema'
import { Box } from '../primitives/Box'
import { TLDeepLink, createDeepLinkString, parseDeepLinkString } from './deepLinks'

const testCases: Array<{
	deepLink: TLDeepLink
	expected: string
	name: string
}> = [
	{
		name: 'no shapes',
		deepLink: {
			type: 'shapes',
			shapeIds: [],
		},
		expected: 's',
	},
	{
		name: 'one shape',
		deepLink: {
			type: 'shapes',
			shapeIds: [createShapeId('abc')],
		},
		expected: 'sabc',
	},
	{
		name: 'two shapes',
		deepLink: {
			type: 'shapes',
			shapeIds: [createShapeId('abc'), createShapeId('def')],
		},
		expected: 'sabc.def',
	},
	{
		name: 'three shapes',
		deepLink: {
			type: 'shapes',
			shapeIds: [createShapeId('abc'), createShapeId('def'), createShapeId('ghi')],
		},
		expected: 'sabc.def.ghi',
	},
	{
		name: 'page',
		deepLink: {
			type: 'page',
			pageId: PageRecordType.createId('abc'),
		},
		expected: 'pabc',
	},
	{
		name: 'viewport alone',
		deepLink: {
			type: 'viewport',
			bounds: new Box(-1, 2, 3, 4),
		},
		expected: 'v-1.2.3.4',
	},
	{
		name: 'viewport with page',
		deepLink: {
			type: 'viewport',
			bounds: new Box(1, -2, 3, 4),
			pageId: PageRecordType.createId('abc'),
		},
		expected: 'v1.-2.3.4.abc',
	},
]

test.each(testCases)('works with $name', ({ deepLink, expected }) => {
	expect(createDeepLinkString(deepLink)).toBe(expected)
	expect(parseDeepLinkString(expected)).toEqual(deepLink)
})

describe('parseDeepLinkString', () => {
	it('throws on a viewport link with non-numeric bounds', () => {
		expect(() => parseDeepLinkString('vabc.def.ghi.jkl')).toThrow('Invalid deep link string')
	})

	it('throws on a viewport link with missing bounds', () => {
		expect(() => parseDeepLinkString('v1.2')).toThrow('Invalid deep link string')
		expect(() => parseDeepLinkString('v')).toThrow('Invalid deep link string')
	})

	it('throws on a viewport link with no area', () => {
		expect(() => parseDeepLinkString('v0.0.0.0')).toThrow('Invalid deep link string')
		expect(() => parseDeepLinkString('v100.100.0.200')).toThrow('Invalid deep link string')
		expect(() => parseDeepLinkString('v100.100.200.0')).toThrow('Invalid deep link string')
		expect(() => parseDeepLinkString('v100.100.-200.-100')).toThrow('Invalid deep link string')
	})

	it('accepts a viewport link positioned at the origin', () => {
		expect(parseDeepLinkString('v0.0.200.100')).toEqual({
			type: 'viewport',
			bounds: new Box(0, 0, 200, 100),
			pageId: undefined,
		})
	})

	it('throws on an unknown link type', () => {
		expect(() => parseDeepLinkString('xabc')).toThrow('Invalid deep link string')
	})
})
