import { getNearestScrollableContainer } from './useScreenBounds'

describe('getNearestScrollableContainer', () => {
	it('finds a horizontally scrollable parent', () => {
		const scrollContainer = document.createElement('div')
		const child = document.createElement('div')
		scrollContainer.style.overflowX = 'auto'
		scrollContainer.style.overflowY = 'hidden'
		Object.defineProperties(scrollContainer, {
			clientWidth: { value: 100 },
			scrollWidth: { value: 200 },
			clientHeight: { value: 100 },
			scrollHeight: { value: 100 },
		})
		scrollContainer.appendChild(child)
		document.body.appendChild(scrollContainer)

		expect(getNearestScrollableContainer(child)).toBe(scrollContainer)

		scrollContainer.remove()
	})
})
