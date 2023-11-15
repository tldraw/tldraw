import { containBoxSize } from '../lib/utils/assets/assets'

describe('containBoxSize', () => {
	it('should not increase size of asset', () => {
		const size1 = { w: 100, h: 100 }
		const size2 = { w: 100, h: 100 }
		const size3 = { w: 100, h: 100 }
		const result1 = containBoxSize(size1, { w: 200, h: 200 })
		const result2 = containBoxSize(size2, { w: 200, h: 200 })
		const result3 = containBoxSize(size3, { w: 200, h: 200 })

		expect(result1).toEqual(size1)
		expect(result2).toEqual(size2)
		expect(result3).toEqual(size3)
	})

	it('should contain when size is bigger than container', () => {
		const size1 = { w: 1000, h: 1000 }
		const result1 = containBoxSize(size1, { w: 500, h: 500 })
		expect(result1).toEqual({ w: 500, h: 500 })

		const size2 = { w: 200, h: 1000 }
		const result2 = containBoxSize(size2, { w: 500, h: 500 })
		expect(result2).toEqual({ w: 100, h: 500 })

		const size3 = { w: 1000, h: 200 }
		const result3 = containBoxSize(size3, { w: 500, h: 500 })
		expect(result3).toEqual({ w: 500, h: 100 })

		const size4 = { w: 200, h: 1000 }
		const result4 = containBoxSize(size4, { w: 150, h: 4000 })
		expect(result4).toEqual({ w: 150, h: 750 })

		const size5 = { w: 1000, h: 200 }
		const result5 = containBoxSize(size5, { w: 4000, h: 150 })
		expect(result5).toEqual({ w: 750, h: 150 })
	})
})
