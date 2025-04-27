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
