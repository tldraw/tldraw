import { TLShapeId, assert, assertExists } from '@tldraw/editor'
import { TestEditor } from './TestEditor'
import { TL } from './test-jsx'

let editor: TestEditor

/**
 * When we're comparing shape indexes, we don't actually care about the specific
 * indexes involved. We're only interested in the ordering of those indexes.
 * This function rewrites indexes to be a range of consecutive numbers starting
 * at 0, where in reality the way we allocate indexes might produce gaps.
 */
function normalizeIndexes(
	renderingShapes: { id: TLShapeId; index: number; backgroundIndex: number }[]
): [id: TLShapeId, index: number, backgroundIndex: number][] {
	const allIndexes = renderingShapes
		.flatMap(({ index, backgroundIndex }) => [index, backgroundIndex])
		.sort((a, b) => a - b)

	const positionsByIndex = new Map<number, number>()
	for (let position = 0; position < allIndexes.length; position++) {
		const index = allIndexes[position]
		assert(!positionsByIndex.has(index), `Duplicate index ${index}`)
		positionsByIndex.set(index, position)
	}

	return renderingShapes.map(({ id, index, backgroundIndex }) => [
		id,
		assertExists(positionsByIndex.get(index)),
		assertExists(positionsByIndex.get(backgroundIndex)),
	])
}

beforeEach(() => {
	editor = new TestEditor()
	editor.setScreenBounds({ x: 0, y: 0, w: 1800, h: 900 })
	editor.renderingBoundsMargin = 100
})

function createShapes() {
	return editor.createShapesFromJsx([
		<TL.geo ref="A" x={100} y={100} w={100} h={100} />,
		<TL.frame ref="B" x={200} y={200} w={300} h={300}>
			<TL.geo ref="C" x={200} y={200} w={50} h={50} />
			{/* this is outside of the frames clipping bounds, so it should never be rendered */}
			<TL.geo ref="D" x={1000} y={1000} w={50} h={50} />
		</TL.frame>,
	])
}

it('updates the rendering viewport when the camera stops moving', () => {
	const ids = createShapes()

	editor.updateRenderingBounds = jest.fn(editor.updateRenderingBounds)
	editor.pan({ x: -201, y: -201 })
	jest.advanceTimersByTime(500)

	expect(editor.updateRenderingBounds).toHaveBeenCalledTimes(1)
	expect(editor.getRenderingBounds()).toMatchObject({ x: 201, y: 201, w: 1800, h: 900 })
	expect(editor.getShapePageBounds(ids.A)).toMatchObject({ x: 100, y: 100, w: 100, h: 100 })
})

it('lists shapes in viewport', () => {
	const ids = createShapes()
	editor.selectNone()
	expect(editor.getRenderingShapes().map(({ id, isCulled }) => [id, isCulled])).toStrictEqual([
		[ids.A, false], // A is within the expanded rendering bounds, so should not be culled; and it's in the regular viewport too, so it's on screen.
		[ids.B, false],
		[ids.C, false],
		[ids.D, true], // D is clipped and so should always be culled / outside of viewport
	])

	// Move the camera 201 pixels to the right and 201 pixels down
	editor.pan({ x: -201, y: -201 })
	jest.advanceTimersByTime(500)

	expect(editor.getRenderingShapes().map(({ id, isCulled }) => [id, isCulled])).toStrictEqual([
		[ids.A, false], // A should not be culled, even though it's no longer in the viewport (because it's still in the EXPANDED viewport)
		[ids.B, false],
		[ids.C, false],
		[ids.D, true], // D is clipped and so should always be culled / outside of viewport
	])

	editor.pan({ x: -100, y: -100 })
	jest.advanceTimersByTime(500)

	expect(editor.getRenderingShapes().map(({ id, isCulled }) => [id, isCulled])).toStrictEqual([
		[ids.A, true], // A should be culled now that it's outside of the expanded viewport too
		[ids.B, false],
		[ids.C, false],
		[ids.D, true], // D is clipped and so should always be culled, even if it's in the viewport
	])

	editor.pan({ x: -900, y: -900 })
	jest.advanceTimersByTime(500)
	expect(editor.getRenderingShapes().map(({ id, isCulled }) => [id, isCulled])).toStrictEqual([
		[ids.A, true],
		[ids.B, true],
		[ids.C, true],
		[ids.D, true],
	])
})

it('lists shapes in viewport sorted by id with correct indexes & background indexes', () => {
	const ids = createShapes()
	// Expect the results to be sorted correctly by id
	expect(normalizeIndexes(editor.getRenderingShapes())).toStrictEqual([
		[ids.A, 2, 0],
		[ids.B, 3, 1],
		[ids.C, 6, 4], // the background of C is above B
		[ids.D, 7, 5],
		// A is at the back, then B, and then B's children
	])

	// Send B to the back
	editor.sendToBack([ids.B])

	// The items should still be sorted by id
	expect(normalizeIndexes(editor.getRenderingShapes())).toStrictEqual([
		[ids.A, 7, 1],
		[ids.B, 2, 0],
		[ids.C, 5, 3],
		[ids.D, 6, 4],
		// B is now at the back, then its children, and A is below the group
	])
})

it('handles frames in frames', () => {
	const ids = editor.createShapesFromJsx([
		<TL.geo ref="A" x={0} y={0} w={10} h={10} />,
		<TL.frame ref="B" x={100} y={0} w={100} h={100}>
			<TL.geo ref="C" x={100} y={0} w={10} h={10} />
			<TL.frame ref="D" x={150} y={0} w={100} h={100}>
				<TL.geo ref="E" x={150} y={0} w={10} h={10} />
			</TL.frame>
			<TL.geo ref="F" x={100} y={0} w={10} h={10} />
		</TL.frame>,
		<TL.geo ref="G" x={100} y={0} w={10} h={10} />,
	])

	expect(normalizeIndexes(editor.getRenderingShapes())).toStrictEqual([
		[ids.A, 3, 0],
		[ids.B, 4, 1],
		[ids.C, 8, 5], // frame B creates a background, so C's background layer is above B's foreground
		[ids.D, 9, 6],
		[ids.E, 11, 10], // frame D creates a background too
		[ids.F, 12, 7], // F is above the nested frame, but it's background is still below frame D
		[ids.G, 13, 2], // G is on top of everything, but its BG is behind both frames
	])
})

it('handles groups in frames', () => {
	const ids = editor.createShapesFromJsx([
		<TL.geo ref="A" x={0} y={0} w={10} h={10} />,
		<TL.frame ref="B" x={100} y={0} w={100} h={100}>
			<TL.geo ref="C" x={100} y={0} w={10} h={10} />
			<TL.group ref="D" x={150} y={0}>
				<TL.geo ref="E" x={150} y={0} w={10} h={10} />
			</TL.group>
			<TL.geo ref="F" x={100} y={0} w={10} h={10} />
		</TL.frame>,
		<TL.geo ref="G" x={100} y={0} w={10} h={10} />,
	])

	expect(normalizeIndexes(editor.getRenderingShapes())).toStrictEqual([
		[ids.A, 3, 0],
		[ids.B, 4, 1],
		[ids.C, 9, 5], // frame B creates a background, so C's background layer is above B's foreground
		[ids.D, 10, 6],
		[ids.E, 11, 7], // group D doesn't create a background, so E's background remains in order
		[ids.F, 12, 8],
		[ids.G, 13, 2], // G is on top of everything, but its BG is behind the frame
	])
})

it('handles frames in groups', () => {
	const ids = editor.createShapesFromJsx([
		<TL.geo ref="A" x={0} y={0} w={10} h={10} />,
		<TL.group ref="B" x={100} y={0}>
			<TL.geo ref="C" x={100} y={0} w={10} h={10} />
			<TL.frame ref="D" x={150} y={0} w={100} h={100}>
				<TL.geo ref="E" x={150} y={0} w={10} h={10} />
			</TL.frame>
			<TL.geo ref="F" x={100} y={0} w={10} h={10} />
		</TL.group>,
		<TL.geo ref="G" x={100} y={0} w={10} h={10} />,
	])

	expect(normalizeIndexes(editor.getRenderingShapes())).toStrictEqual([
		[ids.A, 6, 0],
		[ids.B, 7, 1],
		[ids.C, 8, 2], // groups don't create backgrounds, so things within the group stay in order
		[ids.D, 9, 3],
		[ids.E, 11, 10], // frame G creates a background, so the BG of E is skipped up above D
		[ids.F, 12, 4], // but F after the frame returns to the normal background ordering
		[ids.G, 13, 5], //
	])
})

it('handles groups in groups', () => {
	const ids = editor.createShapesFromJsx([
		<TL.geo ref="A" x={0} y={0} w={10} h={10} />,
		<TL.group ref="B" x={100} y={0}>
			<TL.geo ref="C" x={100} y={0} w={10} h={10} />
			<TL.group ref="D" x={150} y={0}>
				<TL.geo ref="E" x={150} y={0} w={10} h={10} />
			</TL.group>
			<TL.geo ref="F" x={100} y={0} w={10} h={10} />
		</TL.group>,
		<TL.geo ref="G" x={100} y={0} w={10} h={10} />,
	])

	expect(normalizeIndexes(editor.getRenderingShapes())).toStrictEqual([
		// as groups don't create backgrounds, everything is consecutive
		[ids.A, 7, 0],
		[ids.B, 8, 1],
		[ids.C, 9, 2],
		[ids.D, 10, 3],
		[ids.E, 11, 4],
		[ids.F, 12, 5],
		[ids.G, 13, 6],
	])
})
