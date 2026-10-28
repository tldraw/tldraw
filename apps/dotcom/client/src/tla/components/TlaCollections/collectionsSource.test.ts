import { describe, expect, it } from 'vitest'
import { createCollectionsSource } from './collectionsSource'

describe('createCollectionsSource', () => {
	it('starts with the sample collections', () => {
		expect(
			createCollectionsSource()
				.getCollections()
				.map((c) => c.name)
		).toEqual(['Wireframes', 'Icons'])
	})
})
