import { createContext, ReactNode, useContext, useState } from 'react'
import { atom, computed, getIndexAbove, IndexKey, sortByIndex, ZERO_INDEX_KEY } from 'tldraw'

export const SLIDE_SIZE = { x: 0, y: 0, w: 1600, h: 900 }
export const SLIDE_MARGIN = 100

type Slide = {
	id: string
	index: IndexKey
	name: string
}

let index = ZERO_INDEX_KEY
const getNextIndex = () => {
	index = getIndexAbove(index)
	return index
}

class SlidesManager {
	private _slides = atom<Slide[]>('slide', [
		{
			id: '1',
			index: getNextIndex(),
			name: 'Slide 1',
		},
		{
			id: '2',
			index: getNextIndex(),
			name: 'Slide 2',
		},
		{
			id: '3',
			index: getNextIndex(),
			name: 'Slide 3',
		},
	])

	@computed getCurrentSlides() {
		return this._slides.get().sort(sortByIndex)
	}

	private _currentSlideId = atom('currentSlide', '1')

	@computed getCurrentSlideId() {
		return this._currentSlideId.get()
	}

	@computed getCurrentSlide() {
		return this._slides.get().find((slide) => slide.id === this.getCurrentSlideId())!
	}

	@computed getCurrentSlideIndex() {
		const slides = this.getCurrentSlides()
		return slides.indexOf(this.getCurrentSlide())
	}

	setCurrentSlide(id: string) {
		this._currentSlideId.set(id)
	}

	move(delta: number) {
		const slides = this.getCurrentSlides()
		const currentIndex = slides.findIndex((slide) => slide.id === this.getCurrentSlideId())
		const next = slides[currentIndex + delta]
		if (!next) return
		this._currentSlideId.set(next.id)
	}

	next() {
		this.move(1)
	}

	prev() {
		this.move(-1)
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
