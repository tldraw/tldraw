import { IRequest } from 'itty-router'

/**
 * Request body for the /api/pose endpoint.
 */
interface PoseRequest {
	/**
	 * The sketch to read a pose from, as a base64 PNG data URL
	 * (`data:image/png;base64,...`).
	 */
	image: string
}

/**
 * The canonical joint set we ask Claude to locate. Deliberately a superset of
 * what the flat-2D tier-1 retargeter needs, so the {@link PoseData} shape stays
 * stable as we climb to real 2D pose estimators (tier 2) and image→SMPL
 * (tier 3) — only the *provider* changes, never the contract downstream.
 *
 * Names map cleanly onto the Xbot Mixamo rig (mixamorigHead, mixamorigLeftArm,
 * mixamorigLeftForeArm, mixamorigLeftHand, mixamorigLeftUpLeg, …).
 */
export const POSE_JOINTS = [
	'head',
	'neck',
	'leftShoulder',
	'rightShoulder',
	'leftElbow',
	'rightElbow',
	'leftWrist',
	'rightWrist',
	'hips',
	'leftHip',
	'rightHip',
	'leftKnee',
	'rightKnee',
	'leftAnkle',
	'rightAnkle',
] as const

export type PoseJoint = (typeof POSE_JOINTS)[number]

/**
 * One located joint. `x`/`y` are normalized image coordinates (0–1, origin
 * top-left, y-down — the natural frame for a 512×512 sketch). `z` is a coarse
 * depth *hint*, not a measurement: -1 = toward the viewer (in front of the
 * torso), 0 = neutral/in the torso plane, +1 = away (behind). `confidence` lets
 * the retargeter ignore joints Claude couldn't find in a partial sketch.
 *
 * "left"/"right" are the *figure's* own left and right (anatomical), which is
 * the viewer's mirror — the retargeter relies on this to avoid flipping limbs.
 */
export interface PoseKeypoint {
	x: number
	y: number
	z: number
	confidence: number
}

/**
 * The pose-provider contract. Every fidelity tier resolves to this shape, so
 * the retargeter and rig-driving code never change when the provider does.
 */
export interface PoseData {
	joints: Partial<Record<PoseJoint, PoseKeypoint>>
}

/** The Anthropic model used to read a pose out of a sketch. */
const POSE_MODEL = 'claude-haiku-4-5'

/** Anthropic Messages API endpoint. */
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

/**
 * Instruction given to Claude. We want strict, parseable JSON — a located
 * point per named joint — not prose. The depth hint (`z`) is explicitly coarse:
 * Claude's absolute depth guesses are noisy, so we only ask for a three-way
 * lean (toward / neutral / away) that's enough to disambiguate a limb crossing
 * in front of vs. behind the body.
 */
const SYSTEM_PROMPT = [
	'You are a human-pose estimator. The image is a rough sketch of a single human figure,',
	"often just a stick figure. Locate these joints, using the FIGURE's own left/right",
	'(anatomical, i.e. mirrored from the viewer):',
	POSE_JOINTS.join(', ') + '.',
	'',
	'Reply with ONLY a JSON object, no markdown fence, no prose, of the form:',
	'{"joints":{"head":{"x":0.5,"y":0.1,"z":0,"confidence":0.9}, ...}}',
	'where x,y are normalized image coordinates (0=left/top, 1=right/bottom),',
	'z is a coarse depth hint: -1 = toward the viewer (limb in front of the torso),',
	'0 = neutral / in the body plane, +1 = away from the viewer (behind the torso),',
	'and confidence is 0..1 for how sure you are the joint is present in the drawing.',
	'Omit a joint entirely only if the sketch gives no basis to place it at all.',
	'Interpret loose strokes generously; a stick figure is a valid, complete figure.',
].join(' ')

/**
 * POST /api/pose
 *
 * Reads a 2D pose (named joint keypoints + coarse depth hints) out of the
 * current sketch using Claude vision. This is tier 1 of the sketch→3D-pose
 * pipeline: the returned {@link PoseData} is later retargeted onto the Xbot
 * Mixamo rig. The ANTHROPIC_API_KEY is injected server-side and never reaches
 * the browser — mirroring /api/describe and the fal proxy.
 *
 * Returns: PoseData ({ joints: { [jointName]: {x,y,z,confidence} } })
 */
export async function handlePose(request: IRequest, env: Env): Promise<Response> {
	const apiKey = env.ANTHROPIC_API_KEY
	if (!apiKey || apiKey === 'your_anthropic_key_here') {
		return json(
			{ error: 'ANTHROPIC_API_KEY is not configured. Add it to .dev.vars (see the README).' },
			500
		)
	}

	const body = (await request.json()) as PoseRequest
	if (!body.image) {
		return json({ error: 'image is required' }, 400)
	}

	// The Anthropic image block wants the raw base64 and a media type, not a
	// full data URL — split the `data:image/png;base64,` prefix off.
	const match = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/.exec(body.image)
	if (!match) {
		return json({ error: 'image must be a base64 PNG data URL' }, 400)
	}
	const [, mediaType, base64Data] = match

	try {
		const response = await fetch(ANTHROPIC_API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': apiKey,
				'anthropic-version': '2023-06-01',
			},
			body: JSON.stringify({
				model: POSE_MODEL,
				max_tokens: 1024,
				system: SYSTEM_PROMPT,
				messages: [
					{
						role: 'user',
						content: [
							{
								type: 'image',
								source: { type: 'base64', media_type: mediaType, data: base64Data },
							},
							{
								type: 'text',
								text: 'Locate the joints for this figure. Reply with only the JSON.',
							},
						],
					},
				],
			}),
		})

		if (!response.ok) {
			const text = await response.text()
			throw new Error(`Anthropic error ${response.status}: ${text}`)
		}

		const data = (await response.json()) as {
			content?: Array<{ type: string; text?: string }>
		}
		const raw = data.content
			?.filter((block) => block.type === 'text')
			.map((block) => block.text ?? '')
			.join('')
			.trim()

		if (!raw) {
			throw new Error('Anthropic did not return a pose')
		}

		const pose = parsePose(raw)
		return json(pose, 200)
	} catch (e: any) {
		console.error('Pose error:', e)
		return json({ error: e.message ?? 'Pose estimation failed' }, 500)
	}
}

/**
 * Parse Claude's reply into {@link PoseData}, tolerating a stray markdown fence
 * or leading prose and keeping only known joints with finite coordinates. We
 * validate here (not in the browser) so a malformed reply fails as a clear 500
 * rather than a confusing client-side crash.
 */
function parsePose(raw: string): PoseData {
	// Strip a ```json … ``` fence if the model added one, then grab the first
	// {...} block so leading/trailing prose can't break JSON.parse.
	const unfenced = raw.replace(/```json\s*|\s*```/g, '')
	const start = unfenced.indexOf('{')
	const end = unfenced.lastIndexOf('}')
	if (start === -1 || end === -1) {
		throw new Error(`Pose reply was not JSON: ${raw.slice(0, 200)}`)
	}

	const parsed = JSON.parse(unfenced.slice(start, end + 1)) as {
		joints?: Record<string, Partial<PoseKeypoint>>
	}
	const src = parsed.joints ?? {}

	const known = new Set<string>(POSE_JOINTS)
	const joints: PoseData['joints'] = {}
	for (const [name, kp] of Object.entries(src)) {
		if (!known.has(name) || !kp) continue
		const x = Number(kp.x)
		const y = Number(kp.y)
		if (!Number.isFinite(x) || !Number.isFinite(y)) continue
		joints[name as PoseJoint] = {
			x: clamp01(x),
			y: clamp01(y),
			z: clampUnit(Number(kp.z) || 0),
			confidence: clamp01(Number(kp.confidence ?? 1)),
		}
	}

	if (Object.keys(joints).length === 0) {
		throw new Error('Pose reply contained no usable joints')
	}
	return { joints }
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))
const clampUnit = (n: number) => Math.min(1, Math.max(-1, n))

function json(body: unknown, status: number): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	})
}
