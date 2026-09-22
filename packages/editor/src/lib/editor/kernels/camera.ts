import { exhaustiveSwitchError, last } from '@tldraw/utils'
import { Box } from '../../primitives/Box'
import { clamp } from '../../primitives/utils'
import type { TLCameraConstraints } from '../types/misc-types'

// Pure camera math. Editor gathers every input through its own (overridable, reactive) methods at
// the same points it always did, then calls in here, so nothing in this file may read editor state.

export interface CameraXYZ {
	x: number
	y: number
	z: number
}

export interface ViewportSize {
	w: number
	h: number
}

export type TLCameraFitZoom = Exclude<TLCameraConstraints['initialZoom'], 'default'>

export interface ConstrainCameraInput {
	current: CameraXYZ
	requested: CameraXYZ
	zoomSteps: number[]
	constraints: TLCameraConstraints
	viewport: ViewportSize
	baseZoom: number
	/** Present only when resetting: the camera moves to the constraint origin at this zoom. */
	resetZoom: number | null
}

/** Clamp a requested camera's zoom to the zoom steps, for cameras without constraints. */
export function clampCameraZoom(
	current: CameraXYZ,
	requested: CameraXYZ,
	zoomSteps: number[]
): CameraXYZ {
	let { x, y, z } = requested
	const zoomMin = zoomSteps[0]
	const zoomMax = last(zoomSteps)!
	// constrain the zoom, keeping the caller's focal point fixed
	if (z > zoomMax || z < zoomMin) {
		const rz = z
		z = clamp(z, zoomMin, zoomMax)
		x = preserveFocalPoint(current.z, current.x, x, rz, z)
		y = preserveFocalPoint(current.z, current.y, y, rz, z)
	}
	return { x, y, z }
}

/** Keep a requested camera within its constraint bounds. */
export function constrainCamera(input: ConstrainCameraInput): CameraXYZ {
	const { current, requested, zoomSteps, constraints, viewport: vsb, baseZoom, resetZoom } = input
	let { x, y, z } = requested

	const zoomMin = zoomSteps[0]
	const zoomMax = last(zoomSteps)!

	// For each axis, the "natural zoom" is the zoom at which the bounds (with padding) would fit
	// the viewport. The min and max zooms are factors of the base zoom.
	const { px, py, bounds, zx, zy } = getPaddedFit(constraints, vsb)

	const maxZ = zoomMax * baseZoom
	const minZ = zoomMin * baseZoom

	if (resetZoom !== null) {
		z = resetZoom
	}

	if (z < minZ || z > maxZ) {
		// We're trying to zoom out past the minimum zoom level, or in
		// past the maximum zoom level, so clamp the zoom while keeping
		// the caller's focal point fixed. Axis constraints below still
		// apply on top of this.
		const rz = z
		z = clamp(z, minZ, maxZ)
		x = preserveFocalPoint(current.z, current.x, x, rz, z)
		y = preserveFocalPoint(current.z, current.y, y, rz, z)
	}

	// Calculate available space
	const minX = px / z - bounds.x
	const minY = py / z - bounds.y
	const freeW = (vsb.w - px * 2) / z - bounds.w
	const freeH = (vsb.h - py * 2) / z - bounds.h
	const originX = minX + freeW * constraints.origin.x
	const originY = minY + freeH * constraints.origin.y

	if (resetZoom !== null) {
		// Reset the camera according to the origin
		return { x: originX, y: originY, z }
	}

	const behaviorX =
		typeof constraints.behavior === 'string' ? constraints.behavior : constraints.behavior.x
	const behaviorY =
		typeof constraints.behavior === 'string' ? constraints.behavior : constraints.behavior.y

	switch (behaviorX) {
		case 'fixed': {
			// Center according to the origin
			x = originX
			break
		}
		case 'contain': {
			// When below fit zoom, center the camera
			if (z < zx) x = originX
			// When above fit zoom, keep the bounds within padding distance of the viewport edge
			else x = clamp(x, minX + freeW, minX)
			break
		}
		case 'inside': {
			// When below fit zoom, constrain the camera so that the bounds stay completely within the viewport
			if (z < zx) x = clamp(x, minX, (vsb.w - px) / z - bounds.w - bounds.x)
			// When above fit zoom, keep the bounds within padding distance of the viewport edge
			else x = clamp(x, minX + freeW, minX)
			break
		}
		case 'outside': {
			// Constrain the camera so that the bounds never leaves the viewport
			x = clamp(x, px / z - bounds.w - bounds.x, (vsb.w - px) / z - bounds.x)
			break
		}
		case 'free': {
			break
		}
		default: {
			throw exhaustiveSwitchError(behaviorX)
		}
	}

	switch (behaviorY) {
		case 'fixed': {
			y = originY
			break
		}
		case 'contain': {
			if (z < zy) y = originY
			else y = clamp(y, minY + freeH, minY)
			break
		}
		case 'inside': {
			if (z < zy) y = clamp(y, minY, (vsb.h - py) / z - bounds.h - bounds.y)
			else y = clamp(y, minY + freeH, minY)
			break
		}
		case 'outside': {
			y = clamp(y, py / z - bounds.h - bounds.y, (vsb.h - py) / z - bounds.y)
			break
		}
		case 'free': {
			break
		}
		default: {
			throw exhaustiveSwitchError(behaviorY)
		}
	}

	return { x, y, z }
}

/** The zoom at which the constraint bounds fit the viewport, per the given fit mode. */
export function getFitZoom(
	fit: TLCameraFitZoom,
	constraints: TLCameraConstraints,
	viewport: ViewportSize
): number {
	const { zx, zy } = getPaddedFit(constraints, viewport)
	switch (fit) {
		case 'fit-min': {
			return Math.max(zx, zy)
		}
		case 'fit-max': {
			return Math.min(zx, zy)
		}
		case 'fit-x': {
			return zx
		}
		case 'fit-y': {
			return zy
		}
		case 'fit-min-100': {
			return Math.min(1, Math.max(zx, zy))
		}
		case 'fit-max-100': {
			return Math.min(1, Math.min(zx, zy))
		}
		case 'fit-x-100': {
			return Math.min(1, zx)
		}
		case 'fit-y-100': {
			return Math.min(1, zy)
		}
		default: {
			throw exhaustiveSwitchError(fit)
		}
	}
}

function getPaddedFit(constraints: TLCameraConstraints, vsb: ViewportSize) {
	// Clamp padding to half the viewport size on either dimension. Paddings are screen pixels at 100%.
	const px = Math.min(constraints.padding.x, vsb.w / 2)
	const py = Math.min(constraints.padding.y, vsb.h / 2)
	const bounds = Box.From(constraints.bounds)
	const zx = (vsb.w - px * 2) / bounds.w
	const zy = (vsb.h - py * 2) / bounds.h
	return { px, py, bounds, zx, zy }
}

// `requested` kept the caller's focal point (e.g. the cursor) fixed at zoom `rz`. When `rz` gets
// clamped, keep that same focal point fixed at the clamped zoom `z` rather than snapping to the
// viewport center.
function preserveFocalPoint(cz: number, current: number, requested: number, rz: number, z: number) {
	if (rz === cz) return current
	return current + ((requested - current) * (1 / z - 1 / cz)) / (1 / rz - 1 / cz)
}
