import { TLShapeId } from '@tldraw/tlschema'
import { TestApp } from '../TestApp'
import { TL } from '../jsx'

let app: TestApp
let ids: Record<string, TLShapeId>

beforeEach(() => {
	app = new TestApp()
	ids = app.createShapesFromJsx([
		<TL.geo ref="A" x={100} y={100} w={100} h={100} />,
		<TL.frame ref="B" x={200} y={200} w={300} h={300}>
			<TL.geo ref="C" x={200} y={200} w={50} h={50} />
			{/* this is outside of the frames clipping bounds, so it should never be rendered */}
			<TL.geo ref="D" x={1000} y={1000} w={50} h={50} />
		</TL.frame>,
	])

	app.setScreenBounds({ x: 0, y: 0, w: 1800, h: 900 })
})

it('updates the culling viewport', () => {
	app.updateCullingBounds = jest.fn(app.updateCullingBounds)
	app.pan(-201, -201)
	jest.advanceTimersByTime(500)
	expect(app.updateCullingBounds).toHaveBeenCalledTimes(1)
	expect(app.cullingBounds).toMatchObject({ x: 201, y: 201, w: 1800, h: 900 })
	expect(app.getPageBoundsById(ids.A)).toMatchObject({ x: 100, y: 100, w: 100, h: 100 })
})

it('lists shapes in viewport', () => {
	expect(
		app.renderingShapes.map(({ id, isCulled, isInViewport }) => [id, isCulled, isInViewport])
	).toStrictEqual([
		[ids.A, false, true], // A is within the expanded culling bounds, so should not be culled; and it's in the regular viewport too, so it's on screen.
		[ids.B, false, true],
		[ids.C, false, true],
		[ids.D, true, false], // D is clipped and so should always be culled / outside of viewport
	])

	// Move the camera 201 pixels to the right and 201 pixels down
	app.pan(-201, -201)
	jest.advanceTimersByTime(500)

	expect(
		app.renderingShapes.map(({ id, isCulled, isInViewport }) => [id, isCulled, isInViewport])
	).toStrictEqual([
		[ids.A, false, false], // A should not be culled, even though it's no longer in the viewport (because it's still in the EXPANDED viewport)
		[ids.B, false, true],
		[ids.C, false, true],
		[ids.D, true, false], // D is clipped and so should always be culled / outside of viewport
	])

	app.pan(-100, -100)
	jest.advanceTimersByTime(500)

	expect(
		app.renderingShapes.map(({ id, isCulled, isInViewport }) => [id, isCulled, isInViewport])
	).toStrictEqual([
		[ids.A, true, false], // A should be culled now that it's outside of the expanded viewport too
		[ids.B, false, true],
		[ids.C, false, true],
		[ids.D, true, false], // D is clipped and so should always be culled / outside of viewport
	])

	app.pan(-900, -900)
	jest.advanceTimersByTime(500)
	expect(
		app.renderingShapes.map(({ id, isCulled, isInViewport }) => [id, isCulled, isInViewport])
	).toStrictEqual([
		[ids.A, true, false],
		[ids.B, true, false],
		[ids.C, true, false],
		[ids.D, true, false],
	])
})

it('lists shapes in viewport sorted by id', () => {
	// Expect the results to be sorted correctly by id
	expect(app.renderingShapes.map(({ id, index }) => [id, index])).toStrictEqual([
		[ids.A, 0],
		[ids.B, 1],
		[ids.C, 2],
		[ids.D, 3],
		// A is at the back, then B, and then B's children
	])

	// Send B to the back
	app.reorderShapes('toBack', [ids.B])

	// The items should still be sorted by id
	expect(app.renderingShapes.map(({ id, index }) => [id, index])).toStrictEqual([
		[ids.A, 3],
		[ids.B, 0],
		[ids.C, 1],
		[ids.D, 2],
		// B is now at the back, then its children, and finally A is now in the front
	])
})
