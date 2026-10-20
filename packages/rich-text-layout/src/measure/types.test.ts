import { describe, expect, it } from 'vitest'
import { parseFontString } from './types'

describe('parseFontString', () => {
	it('reads style, weight, size and family list', () => {
		expect(parseFontString("italic 600 16px 'IBM Plex Sans', sans-serif")).toEqual({
			style: 'italic',
			weight: '600',
			size: 16,
			family: "'IBM Plex Sans', sans-serif",
		})
		expect(parseFontString('bold 24px Arial')).toMatchObject({
			weight: 'bold',
			size: 24,
			family: 'Arial',
		})
		expect(parseFontString('10px sans-serif')).toMatchObject({
			weight: 'normal',
			style: 'normal',
			size: 10,
		})
	})
})
