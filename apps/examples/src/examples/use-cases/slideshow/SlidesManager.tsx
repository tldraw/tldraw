import { createContext, ReactNode, useContext, useState } from 'react'
import { atom, computed, structuredClone, uniqueId } from 'tldraw'

export const SLIDE_SIZE = { x: 0, y: 0, w: 1600, h: 900 }
export const SLIDE_MARGIN = 100

interface Slide {
	id: string
	index: number
	name: string
}

class SlidesManager {
	private _slides = atom<Slide[]>('slide', [
		{
			id: '1',
			index: 0,
			name: 'Slide 1',
		},
		{
			id: '2',
			index: 1,
			name: 'Slide 2',
		},
		{
			id: '3',
			index: 2,
			name: 'Slide 3',
		},
	])

	@computed getCurrentSlides() {
		return this._slides.get().sort((a, b) => (a.index < b.index ? -1 : 1))
	}

	private _currentSlideId = atom('currentSlide', '1')

	@computed getCurrentSlideId() {
		return this._currentSlideId.get()
	}

	@computed getCurrentSlide() {
		return this._slides.get().find((slide) => slide.id === this.getCurrentSlideId())!
	}

	setCurrentSlide(id: string) {
		this._currentSlideId.set(id)
	}

	moveBy(delta: number) {
		const slides = this.getCurrentSlides()
		const currentIndex = slides.findIndex((slide) => slide.id === this.getCurrentSlideId())
		const next = slides[currentIndex + delta]
		if (!next) return
		this._currentSlideId.set(next.id)
	}

	nextSlide() {
		this.moveBy(1)
	}

	prevSlide() {
		this.moveBy(-1)
	}

	newSlide(index: number) {
		const slides = structuredClone(this.getCurrentSlides())

		let bumping = false
		for (const slide of slides) {
			if (slide.index === index) {
				bumping = true
			}
			if (bumping) {
				slide.index++
			}
		}

		const newSlide = {
			id: uniqueId(),
			index,
			name: `Slide ${slides.length + 1}`,
		}

		this._slides.set([...slides, newSlide])

		return newSlide
	}
}

const slidesContext = createContext({} as SlidesManager)

export const SlidesProvider = ({ children }: { children: ReactNode }) => {
	const [slideManager] = useState(() => new SlidesManager())
	return <slidesContext.Provider value={slideManager}>{children}</slidesContext.Provider>
}

export function useSlides() {
	return useContext(slidesContext)
}
