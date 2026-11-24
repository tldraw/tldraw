import { describe, expect, it } from 'vitest'
import { ThumbnailRenderJob, thumbnailSnapshotBodyFor } from './thumbnailRenderJob'

function makeJob(overrides: Partial<ThumbnailRenderJob> = {}): ThumbnailRenderJob {
	return {
		camera: 'content',
		x: 0,
		y: 0,
		z: 1,
		width: 1200,
		height: 630,
		theme: 'dark',
		...overrides,
	}
}

function makeSnapshot(states: object[]) {
	return {
		documents: states.map((state) => ({ state, lastChangedClock: 0 })),
		schema: { schemaVersion: 2, sequences: {} },
		clock: 0,
	} as any
}

describe('thumbnailSnapshotBodyFor', () => {
	it('returns the records and render params for a job', () => {
		const body = thumbnailSnapshotBodyFor(
			makeSnapshot([{ id: 'shape:1', typeName: 'shape' }]),
			makeJob()
		)

		expect(body).toEqual({
			error: false,
			records: [{ id: 'shape:1', typeName: 'shape' }],
			schema: { schemaVersion: 2, sequences: {} },
			renderParams: {
				camera: 'content',
				// Echoed even though `content` makes the render page ignore them, so a job that omits
				// `camera` has a viewport to fall back on without a second shape of payload.
				x: 0,
				y: 0,
				z: 1,
				width: 1200,
				height: 630,
				theme: 'dark',
			},
		})
	})

	it('passes the target pageId through to the render params', () => {
		const body = thumbnailSnapshotBodyFor(
			makeSnapshot([
				{ id: 'page:abc', typeName: 'page', name: 'A', index: 'a1' },
				{ id: 'shape:1', typeName: 'shape', parentId: 'page:abc' },
			]),
			makeJob({ pageId: 'page:abc' })
		)

		expect(body).toMatchObject({ renderParams: { camera: 'content', pageId: 'page:abc' } })
	})

	it('sends only the records the targeted page draws', () => {
		const body = thumbnailSnapshotBodyFor(
			makeSnapshot([
				{ id: 'document:document', typeName: 'document' },
				{ id: 'page:a', typeName: 'page' },
				{ id: 'page:b', typeName: 'page' },
				{
					id: 'shape:onA',
					typeName: 'shape',
					parentId: 'page:a',
					props: { assetId: 'asset:pic' },
				},
				{ id: 'shape:onB', typeName: 'shape', parentId: 'page:b', props: {} },
				{ id: 'asset:pic', typeName: 'asset', type: 'image' },
				{ id: 'asset:elsewhere', typeName: 'asset', type: 'image' },
			]),
			makeJob({ pageId: 'page:a' })
		)

		expect(body.error ? [] : body.records.map((record) => record.id)).toEqual([
			'document:document',
			'page:a',
			'shape:onA',
			'asset:pic',
		])
	})

	it('sends the whole board when the slice cannot vouch for itself', () => {
		// The requested shape sits on another page, so a slice of page:a would not be closed. The
		// render page refuses this job itself; it just must not be handed a partial board.
		const states = [
			{ id: 'page:a', typeName: 'page' },
			{ id: 'page:b', typeName: 'page' },
			{ id: 'shape:onB', typeName: 'shape', parentId: 'page:b', props: {} },
		]

		const body = thumbnailSnapshotBodyFor(
			makeSnapshot(states),
			makeJob({ pageId: 'page:a', shapeIds: ['shape:onB'] })
		)

		expect(body).toMatchObject({ error: false, records: states })
	})

	it('fails when the job targets a page that is no longer in the snapshot', () => {
		// A shared file's live snapshot can lose the targeted page to a concurrent edit between the
		// page being chosen and the snapshot being read. Rendering a different page would return a
		// picture of the wrong one, so the job fails instead.
		const body = thumbnailSnapshotBodyFor(
			makeSnapshot([{ id: 'page:still-here', typeName: 'page', name: 'A', index: 'a1' }]),
			makeJob({ pageId: 'page:deleted' })
		)

		expect(body).toEqual({ error: true, message: 'Page not found' })
	})

	it('fails when a requested shape is no longer in the snapshot', () => {
		const body = thumbnailSnapshotBodyFor(
			makeSnapshot([
				{ id: 'page:a', typeName: 'page' },
				{ id: 'shape:here', typeName: 'shape', parentId: 'page:a', props: {} },
			]),
			makeJob({ pageId: 'page:a', shapeIds: ['shape:here', 'shape:gone'] })
		)

		expect(body).toEqual({ error: true, message: 'Shape not found' })
	})

	it('fails rather than throwing on a partial snapshot with no documents', () => {
		// A corrupt R2 payload can have schema metadata but no documents array.
		const body = thumbnailSnapshotBodyFor(
			{ schema: { schemaVersion: 2, sequences: {} }, clock: 0 } as any,
			makeJob()
		)

		expect(body).toEqual({ error: true, message: 'Board not found' })
	})
})
