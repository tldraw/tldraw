import { computed } from '@tldraw/state'
import { VecModel } from '@tldraw/tlschema'
import { deepCopy } from '@tldraw/utils'
import { Mat } from '../../../primitives/Mat'
import { Vec } from '../../../primitives/Vec'
import { uniqueId } from '../../../utils/uniqueId'
import { Editor } from '../../Editor'
import { SnapData, SnapManager } from './SnapManager'

export class HandleSnaps {
	readonly editor: Editor
	constructor(readonly manager: SnapManager) {
		this.editor = manager.editor
	}

	@computed private getOutlinesInPageSpace() {
		return Array.from(this.manager.getSnappableShapes(), (id) => {
			const geometry = this.editor.getShapeGeometry(id)
			const outline = deepCopy(geometry.vertices)
			if (geometry.isClosed) outline.push(outline[0])
			const pageTransform = this.editor.getShapePageTransform(id)
			if (!pageTransform) throw Error('No page transform')
			return Mat.applyToPoints(pageTransform, outline)
		})
	}

	snapHandle({
		handlePoint,
		additionalSegments,
	}: {
		handlePoint: Vec
		additionalSegments: Vec[][]
	}): SnapData | null {
		const snapThreshold = this.manager.getSnapThreshold()
		const outlinesInPageSpace = this.getOutlinesInPageSpace()

		// Find the nearest point that is within the snap threshold
		let minDistance = snapThreshold
		let nearestPoint: Vec | null = null
		let C: VecModel, D: VecModel, nearest: Vec, distance: number

		const allSegments = [...outlinesInPageSpace, ...additionalSegments]
		for (const outline of allSegments) {
			for (let i = 0; i < outline.length - 1; i++) {
				C = outline[i]
				D = outline[i + 1]

				nearest = Vec.NearestPointOnLineSegment(C, D, handlePoint)
				distance = Vec.Dist(handlePoint, nearest)

				if (isNaN(distance)) continue
				if (distance < minDistance) {
					minDistance = distance
					nearestPoint = nearest
				}
			}
		}

		// If we found a point, display snap lines, and return the nudge
		if (nearestPoint) {
			this.manager.setIndicators([
				{
					id: uniqueId(),
					type: 'points',
					points: [nearestPoint],
				},
			])

			return { nudge: Vec.Sub(nearestPoint, handlePoint) }
		}

		return null
	}
}
