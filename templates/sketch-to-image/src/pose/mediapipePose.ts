import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'
import { PoseData } from '../realtime/estimatePose'

/**
 * In-browser pose estimation via MediaPipe (Google's BlazePose). This replaces
 * the Claude-keypoint provider: it's a purpose-trained pose model, so it handles
 * arms and figure-left/right correctly — the exact failure modes of the Claude
 * approach. It runs entirely client-side (WASM), needs no worker route or API
 * key, and returns proper 2D + 3D keypoints.
 *
 * It maps MediaPipe's 33 landmarks onto our named-joint {@link PoseData} — the
 * same contract the Claude provider produced — so the overlay and everything
 * downstream is unchanged; only the source of the pose differs.
 *
 * The WASM runtime and model are loaded from a CDN (jsDelivr / Google's model
 * storage) rather than committed to the repo — they total ~38 MB. To run fully
 * offline, download them into public/mediapipe and point the two URLs below at
 * `/mediapipe/wasm` and `/mediapipe/pose_landmarker_lite.task`.
 */

// Pinned so the WASM matches the installed @mediapipe/tasks-vision at build time.
const MEDIAPIPE_VERSION = '0.10.35'
const WASM_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`
const MODEL_URL =
	'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task'

// MediaPipe BlazePose landmark indices (33-point topology). Note: MediaPipe's
// "left"/"right" already refer to the *subject's* anatomical sides, which is
// exactly what our PoseData wants — no mirroring needed.
const LM = {
	nose: 0,
	leftShoulder: 11,
	rightShoulder: 12,
	leftElbow: 13,
	rightElbow: 14,
	leftWrist: 15,
	rightWrist: 16,
	leftHip: 23,
	rightHip: 24,
	leftKnee: 25,
	rightKnee: 26,
	leftAnkle: 27,
	rightAnkle: 28,
} as const

let landmarkerPromise: Promise<PoseLandmarker> | null = null

/** Lazily create the PoseLandmarker once and reuse it across frames. */
function getLandmarker(): Promise<PoseLandmarker> {
	if (!landmarkerPromise) {
		landmarkerPromise = FilesetResolver.forVisionTasks(WASM_BASE).then((fileset) =>
			PoseLandmarker.createFromOptions(fileset, {
				baseOptions: { modelAssetPath: MODEL_URL },
				runningMode: 'IMAGE',
				numPoses: 1,
			})
		)
	}
	return landmarkerPromise
}

/**
 * Estimate a pose from an image (data URL). Returns our named-joint
 * {@link PoseData}, with `x`/`y` normalized to the image (0–1, y-down) and `z`
 * the landmark's normalized depth (roughly toward/away from camera). `neck` and
 * `hips` are synthesized as midpoints since MediaPipe doesn't emit them.
 *
 * `signal` mirrors the estimatePose contract for abortable supersede: MediaPipe
 * inference is synchronous per frame, but we honor an already-aborted signal so
 * a superseded call resolves to an empty pose the caller can drop.
 */
export async function estimatePoseMediaPipe(
	imageDataUrl: string,
	signal?: AbortSignal
): Promise<PoseData> {
	if (signal?.aborted) return { joints: {} }

	const landmarker = await getLandmarker()
	const img = await loadImage(imageDataUrl)
	if (signal?.aborted) return { joints: {} }

	const result = landmarker.detect(img)
	const landmarks = result.landmarks?.[0]
	if (!landmarks) return { joints: {} }
	// World landmarks are the same 33 points in metric 3D (meters), origin at the
	// hip midpoint — this is what drives the rig. They line up index-for-index
	// with the normalized `landmarks`.
	const worldLandmarks = result.worldLandmarks?.[0]

	const joints: PoseData['joints'] = {}
	const world: NonNullable<PoseData['world']> = {}
	const put = (name: string, idx: number) => {
		const p = landmarks[idx]
		if (!p) return
		// MediaPipe `visibility` is our confidence.
		const confidence = (p as { visibility?: number }).visibility ?? 1
		joints[name] = { x: p.x, y: p.y, z: p.z ?? 0, confidence }

		const w = worldLandmarks?.[idx]
		if (w) world[name] = { x: w.x, y: w.y, z: w.z ?? 0, confidence }
	}

	put('head', LM.nose)
	put('leftShoulder', LM.leftShoulder)
	put('rightShoulder', LM.rightShoulder)
	put('leftElbow', LM.leftElbow)
	put('rightElbow', LM.rightElbow)
	put('leftWrist', LM.leftWrist)
	put('rightWrist', LM.rightWrist)
	put('leftHip', LM.leftHip)
	put('rightHip', LM.rightHip)
	put('leftKnee', LM.leftKnee)
	put('rightKnee', LM.rightKnee)
	put('leftAnkle', LM.leftAnkle)
	put('rightAnkle', LM.rightAnkle)

	// Synthesize neck (shoulder midpoint) and hips (hip midpoint) so the overlay's
	// spine/shoulder bones and the rig's spine have endpoints. MediaPipe has no
	// dedicated neck/pelvis landmark. `mid` works for both 2D joints and 3D world
	// points since they share the {x,y,z,confidence} shape.
	const mid = <T extends { x: number; y: number; z: number; confidence: number }>(
		a?: T,
		b?: T
	): T | undefined =>
		a && b
			? ({
					x: (a.x + b.x) / 2,
					y: (a.y + b.y) / 2,
					z: (a.z + b.z) / 2,
					confidence: Math.min(a.confidence, b.confidence),
				} as T)
			: undefined
	const neck = mid(joints.leftShoulder, joints.rightShoulder)
	const hips = mid(joints.leftHip, joints.rightHip)
	if (neck) joints.neck = neck
	if (hips) joints.hips = hips

	const worldNeck = mid(world.leftShoulder, world.rightShoulder)
	const worldHips = mid(world.leftHip, world.rightHip)
	if (worldNeck) world.neck = worldNeck
	if (worldHips) world.hips = worldHips

	return Object.keys(world).length > 0 ? { joints, world } : { joints }
}

function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image()
		img.onload = () => resolve(img)
		img.onerror = () => reject(new Error('Failed to load image for pose estimation'))
		img.src = src
	})
}
