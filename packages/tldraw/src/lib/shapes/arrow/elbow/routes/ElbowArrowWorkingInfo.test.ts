import { ElbowArrowTransform } from './ElbowArrowWorkingInfo'

describe('ElbowArrowTransform', () => {
	describe('dbg', () => {
		it.each([
			['Identity'],
			['Rotate90'],
			['Rotate180'],
			['Rotate270'],
			['FlipX'],
			['FlipY'],
		] as const)('%s', (a) => {
			expect(ElbowArrowTransform.dbg(ElbowArrowTransform[a])).toEqual(a)
		})
	})

	describe('Transform', () => {
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
				ElbowArrowTransform.dbg(
					ElbowArrowTransform.transform(ElbowArrowTransform[a], ElbowArrowTransform[b])
				)
			).toEqual(ElbowArrowTransform.dbg(ElbowArrowTransform[expected]))
		})
	})
})
