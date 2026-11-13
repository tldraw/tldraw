import { getScrollableAncestors } from './useScreenBounds'

describe('getScrollableAncestors', () => {
	it('finds nested horizontal and vertical scrolling ancestors', () => {
		const verticalContainer = document.createElement('div')
		verticalContainer.style.overflowX = 'hidden'
		verticalContainer.style.overflowY = 'auto'
		Object.defineProperties(verticalContainer, {
			clientWidth: { value: 100 },
			scrollWidth: { value: 100 },
			clientHeight: { value: 100 },
			scrollHeight: { value: 200 },
		})

		const horizontalContainer = document.createElement('div')
		horizontalContainer.style.overflowX = 'auto'
		horizontalContainer.style.overflowY = 'hidden'
		Object.defineProperties(horizontalContainer, {
			clientWidth: { value: 100 },
			scrollWidth: { value: 200 },
			clientHeight: { value: 100 },
			scrollHeight: { value: 100 },
		})

		const child = document.createElement('div')
		horizontalContainer.appendChild(child)
		verticalContainer.appendChild(horizontalContainer)
		document.body.appendChild(verticalContainer)

		expect(getScrollableAncestors(child)).toEqual([
			horizontalContainer,
			verticalContainer,
			document,
		])

		verticalContainer.remove()
	})
})
