import { POSE_URL } from '../constants'

/**
 * One located joint in a pose. `x`/`y` are normalized to the captured square
 * (0–1, origin top-left, y-down). `z` is a coarse depth hint (-1 toward viewer,
 * 0 neutral, +1 away). `confidence` is 0–1. Mirrors the worker's PoseKeypoint.
 */
export interface PoseKeypoint {
	x: number
	y: number
	z: number
	confidence: number
}

/**
 * A 3D point in MediaPipe world-landmark space: metric (meters), origin at the
 * hip midpoint, with MediaPipe's native axes (x right, y DOWN, z toward camera).
 * We keep the raw MediaPipe frame here and convert to three.js's Y-up frame in
 * exactly one place — the retargeter — so the convention lives with the code
 * that depends on it. Only providers that produce real 3D (MediaPipe) fill this.
 */
export interface PoseWorldPoint {
	x: number
	y: number
	z: number
	confidence: number
}

/**
 * A pose read from the sketch: named joints, each an optional keypoint. Mirrors
 * the worker's PoseData — the fixed contract every fidelity tier resolves to.
 *
 * `world` is an optional 3D companion to the 2D `joints`: the same named joints
 * in metric world space, used to drive the three.js rig. It's absent for 2D-only
 * providers (the overlay uses `joints`; the rig uses `world` when present).
 */
export interface PoseData {
	joints: Record<string, PoseKeypoint | undefined>
	world?: Record<string, PoseWorldPoint | undefined>
}

/**
 * Ask the worker to read a 2D pose (named joint keypoints + coarse depth hints)
 * out of the current sketch, via Claude vision. Returns the pose, or throws on
 * failure. Abortable so a newer settled frame can supersede an in-flight call —
 * same discipline as {@link describeSketch}.
 */
export async function estimatePose(imageDataUrl: string, signal?: AbortSignal): Promise<PoseData> {
	const response = await fetch(POSE_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ image: imageDataUrl }),
		signal,
	})

	if (!response.ok) {
		const err = (await response.json().catch(() => ({}))) as { error?: string }
		throw new Error(err.error ?? `Pose estimation failed (${response.status})`)
	}

	return (await response.json()) as PoseData
}
