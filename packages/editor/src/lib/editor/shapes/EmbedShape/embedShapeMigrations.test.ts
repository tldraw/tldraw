import { embedShapeMigrations } from './embedShapeMigrations'

describe('Generating original URL from embed URL in GenOriginalUrlInEmbed', () => {
	const { up, down } = embedShapeMigrations.migrators[1]
	test('up works as expected', () => {
		expect(up({ props: { url: 'https://codepen.io/Rplus/embed/PWZYRM' } })).toEqual({
			props: {
				url: 'https://codepen.io/Rplus/pen/PWZYRM',
				tmpOldUrl: 'https://codepen.io/Rplus/embed/PWZYRM',
			},
		})
	})

	test('invalid up works as expected', () => {
		expect(up({ props: { url: 'https://example.com' } })).toEqual({
			props: {
				url: '',
				tmpOldUrl: 'https://example.com',
			},
		})
	})

	test('down works as expected', () => {
		const instance = {
			props: {
				url: 'https://codepen.io/Rplus/pen/PWZYRM',
				tmpOldUrl: 'https://codepen.io/Rplus/embed/PWZYRM',
			},
		}
		expect(down(instance)).toEqual({ props: { url: 'https://codepen.io/Rplus/embed/PWZYRM' } })
	})

	test('invalid down works as expected', () => {
		const instance = {
			props: {
				url: 'https://example.com',
				tmpOldUrl: '',
			},
		}
		expect(down(instance)).toEqual({ props: { url: '' } })
	})
})
