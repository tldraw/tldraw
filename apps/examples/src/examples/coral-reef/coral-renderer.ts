import type { VecLike } from 'tldraw'

// [1]
interface Branch {
	scale: number
	offsetX: number
	offsetY: number
	divergeX: number
	divergeY: number
}

function getPathCenter(basePath: VecLike[]): { x: number; y: number } {
	let cx = 0
	let cy = 0
	for (const p of basePath) {
		cx += p.x
		cy += p.y
	}
	return { x: cx / basePath.length, y: cy / basePath.length }
}

// [2]
export function drawCoralReef(
	ctx: CanvasRenderingContext2D,
	basePath: VecLike[],
	pullVector: VecLike,
	offsetX: number,
	offsetY: number
) {
	if (basePath.length < 2) return

	const depth = Math.hypot(pullVector.x, pullVector.y)
	if (depth < 1) {
		// Just draw the flat shape
		drawPath(ctx, basePath, offsetX, offsetY, 1, 'hsl(180, 70%, 35%)')
		return
	}

	const totalSteps = Math.max(1, Math.floor(depth / 4))
	const stepX = pullVector.x / totalSteps
	const stepY = pullVector.y / totalSteps
	const center = getPathCenter(basePath)

	let branches: Branch[] = [{ scale: 1, offsetX: 0, offsetY: 0, divergeX: 0, divergeY: 0 }]

	// [3]
	for (let i = 0; i < totalSteps; i++) {
		const progress = i / totalSteps
		const lightness = 25 + progress * 45
		const saturation = 60 + progress * 15
		const hue = 170 + progress * 30
		const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`

		const nextBranches: Branch[] = []

		for (const branch of branches) {
			// Draw the path for this branch at its current offset and scale
			ctx.save()
			ctx.translate(offsetX + branch.offsetX, offsetY + branch.offsetY)
			ctx.translate(center.x, center.y)
			ctx.scale(branch.scale, branch.scale)
			ctx.translate(-center.x, -center.y)

			drawPathRaw(ctx, basePath, color)
			ctx.restore()

			// Advance the branch along the pull direction
			const nextBranch: Branch = {
				scale: branch.scale * 0.98,
				offsetX: branch.offsetX + stepX + branch.divergeX,
				offsetY: branch.offsetY + stepY + branch.divergeY,
				divergeX: branch.divergeX,
				divergeY: branch.divergeY,
			}

			// [4]
			if (i % 12 === 11 && nextBranch.scale > 0.15) {
				const spread = 1.8 * nextBranch.scale
				nextBranches.push({
					...nextBranch,
					scale: nextBranch.scale * 0.8,
					divergeX: nextBranch.divergeX + spread,
					divergeY: nextBranch.divergeY - spread * 0.6,
				})
				nextBranches.push({
					...nextBranch,
					scale: nextBranch.scale * 0.8,
					divergeX: nextBranch.divergeX - spread,
					divergeY: nextBranch.divergeY + spread * 0.6,
				})
			} else {
				nextBranches.push(nextBranch)
			}
		}

		branches = nextBranches

		// Cap branches to avoid runaway performance
		if (branches.length > 64) {
			branches = branches.slice(0, 64)
		}
	}
}

function drawPathRaw(ctx: CanvasRenderingContext2D, basePath: VecLike[], color: string) {
	ctx.beginPath()
	ctx.moveTo(basePath[0].x, basePath[0].y)
	for (let j = 1; j < basePath.length; j++) {
		ctx.lineTo(basePath[j].x, basePath[j].y)
	}
	ctx.closePath()
	ctx.fillStyle = color
	ctx.strokeStyle = 'rgba(0,0,0,0.08)'
	ctx.lineWidth = 0.5
	ctx.fill()
	ctx.stroke()
}

function drawPath(
	ctx: CanvasRenderingContext2D,
	basePath: VecLike[],
	offsetX: number,
	offsetY: number,
	_scale: number,
	color: string
) {
	ctx.save()
	ctx.translate(offsetX, offsetY)
	drawPathRaw(ctx, basePath, color)
	ctx.restore()
}

// [5]
export function getCoralBounds(basePath: VecLike[], pullVector: VecLike) {
	if (basePath.length === 0) {
		return { minX: 0, minY: 0, maxX: 100, maxY: 100 }
	}

	let minX = Infinity
	let minY = Infinity
	let maxX = -Infinity
	let maxY = -Infinity

	for (const p of basePath) {
		minX = Math.min(minX, p.x)
		minY = Math.min(minY, p.y)
		maxX = Math.max(maxX, p.x)
		maxY = Math.max(maxY, p.y)
	}

	// Expand bounds to include the pull vector and branching spread
	const depth = Math.hypot(pullVector.x, pullVector.y)
	const spread = depth * 0.6
	const pvMinX = Math.min(0, pullVector.x) - spread
	const pvMinY = Math.min(0, pullVector.y) - spread
	const pvMaxX = Math.max(0, pullVector.x) + spread
	const pvMaxY = Math.max(0, pullVector.y) + spread

	return {
		minX: minX + pvMinX - 10,
		minY: minY + pvMinY - 10,
		maxX: maxX + pvMaxX + 10,
		maxY: maxY + pvMaxY + 10,
	}
}

/*
[1]
Each branch tracks its current scale, position offset, and divergence velocity.

[2]
Main rendering function. Draws back-to-front layers that shrink and branch as they extend along the pull vector.

[3]
Color shifts from dark teal at the base to bright cyan/green at the tips, mimicking real coral gradients.

[4]
Every 12 steps, if a branch is thick enough, it splits into two diverging sub-branches.
We cap at 64 branches to keep rendering snappy.

[5]
Computes the overall bounding box including the pull vector and branching spread,
used by the ShapeUtil's getGeometry to define hit-testing and selection bounds.
*/
