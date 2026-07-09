import { PoseData } from '../realtime/estimatePose'

/**
 * The bones we draw between joints, as [from, to] joint-name pairs. Left/right
 * are the figure's own anatomical sides; we color them differently so a
 * mirrored/swapped limb (a known weak spot of the Claude-keypoint tier) is
 * obvious at a glance.
 */
const BONES: Array<[string, string]> = [
	['head', 'neck'],
	['neck', 'leftShoulder'],
	['neck', 'rightShoulder'],
	['leftShoulder', 'leftElbow'],
	['leftElbow', 'leftWrist'],
	['rightShoulder', 'rightElbow'],
	['rightElbow', 'rightWrist'],
	['neck', 'hips'],
	['hips', 'leftHip'],
	['hips', 'rightHip'],
	['leftHip', 'leftKnee'],
	['leftKnee', 'leftAnkle'],
	['rightHip', 'rightKnee'],
	['rightKnee', 'rightAnkle'],
]

const LEFT_COLOR = '#2f7bff' // figure's left
const RIGHT_COLOR = '#ff5a3d' // figure's right
const AXIS_COLOR = '#8a55ff' // spine / head / hips (non-sided)

function sideColor(joint: string): string {
	if (joint.startsWith('left')) return LEFT_COLOR
	if (joint.startsWith('right')) return RIGHT_COLOR
	return AXIS_COLOR
}

/**
 * Draws Claude's returned skeleton over the captured sketch. Coordinates are
 * normalized to the captured square, so we render into a 0–100 viewBox and let
 * the SVG scale to whatever box the panel gives it — the skeleton stays aligned
 * with the `capturedUrl` image behind it.
 *
 * A pure presentational component: it takes the pose + captured image and draws.
 * This is the on-canvas readout of the sketch→pose step.
 */
export function PoseOverlay({
	pose,
	capturedUrl,
}: {
	pose: PoseData | null
	capturedUrl: string | null
}) {
	const joints = pose?.joints ?? {}
	return (
		<div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1' }}>
			{capturedUrl && (
				<img
					src={capturedUrl}
					alt="captured sketch"
					style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
				/>
			)}
			<svg
				viewBox="0 0 100 100"
				preserveAspectRatio="none"
				style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
			>
				{BONES.map(([a, b]) => {
					const ja = joints[a]
					const jb = joints[b]
					if (!ja || !jb) return null
					return (
						<line
							key={`${a}-${b}`}
							x1={ja.x * 100}
							y1={ja.y * 100}
							x2={jb.x * 100}
							y2={jb.y * 100}
							stroke={sideColor(b)}
							strokeWidth={1.2}
							strokeLinecap="round"
							opacity={0.85}
						/>
					)
				})}
				{Object.entries(joints).map(([name, kp]) =>
					kp ? (
						<circle
							key={name}
							cx={kp.x * 100}
							cy={kp.y * 100}
							// Radius carries confidence: surer joints read bigger.
							r={1.4 + kp.confidence * 1.8}
							fill={sideColor(name)}
							stroke="#fff"
							strokeWidth={0.4}
						/>
					) : null
				)}
			</svg>
		</div>
	)
}
