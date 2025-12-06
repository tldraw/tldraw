import {
	debugElbowArrowTransform,
	ElbowArrowTransform,
	transformElbowArrowTransform,
} from './ElbowArrowWorkingInfo'

describe('ElbowArrowTransform', () => {
	describe('debugElbowArrowTransform', () => {
		it.each([
			['Identity'],
			['Rotate90'],
			['Rotate180'],
			['Rotate270'],
			['FlipX'],
			['FlipY'],
		] as const)('%s', (a) => {
			expect(debugElbowArrowTransform(ElbowArrowTransform[a])).toEqual(a)
		})
	})

	describe('transformElbowArrowTransform', () => {
		it.each([
			['Identity', 'Identity', 'Identity'],

			['Rotate90', 'Identity', 'Rotate90'],
			['Rotate180', 'Identity', 'Rotate180'],
			['Rotate270', 'Identity', 'Rotate270'],
			['FlipX', 'Identity', 'FlipX'],
			['FlipY', 'Identity', 'FlipY'],

			['Identity', 'Rotate90', 'Rotate90'],
			['Identity', 'Rotate180', 'Rotate180'],
			['Identity', 'Rotate270', 'Rotate270'],
			['Identity', 'FlipX', 'FlipX'],
			['Identity', 'FlipY', 'FlipY'],
		] as const)(`%s + %s = %s`, (a, b, expected) => {
			expect(
				debugElbowArrowTransform(
					transformElbowArrowTransform(ElbowArrowTransform[a], ElbowArrowTransform[b])
				)
			).toEqual(debugElbowArrowTransform(ElbowArrowTransform[expected]))
		})
	})
})
