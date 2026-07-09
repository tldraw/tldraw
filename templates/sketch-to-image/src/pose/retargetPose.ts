import * as THREE from 'three'
import { PoseData } from '../realtime/estimatePose'

/**
 * Drive the Xbot Mixamo rig from a MediaPipe pose by direction-based bone
 * retargeting.
 *
 * The idea, kept deliberately simple (no IK solver): for each limb bone we know
 * two things — the direction it points in the model's rest pose (T-pose), and
 * the direction the *same* bone should point according to the estimated pose
 * (e.g. the left upper-arm points from the left shoulder to the left elbow). We
 * compute the rotation that carries the rest direction onto the target
 * direction and apply it to the bone. Bone lengths are never touched, so the
 * figure can't stretch — it only rotates at the joints, exactly like a real
 * skeleton.
 *
 * We work in the figure's own local space (the space the bones live in, before
 * the per-frame pan/zoom transform on the wrapping group), so retargeting is
 * independent of where the figure is on screen.
 *
 * Coordinate frames: MediaPipe world landmarks are metric (meters), origin at
 * the hip midpoint, axes (x right, y DOWN, z toward the camera). Xbot is y-up
 * and faces +z. {@link toRigSpace} converts between them in one place.
 */

/**
 * One retargeted bone: the runtime bone name (GLTFLoader turns `mixamorig:Left`
 * into `mixamorigLeft`) and the two pose joints whose delta gives the bone's
 * target direction, from the parent joint toward the child joint.
 */
interface BoneSpec {
	bone: string
	from: string
	to: string
}

// Bones we drive, parents before children so a parent's new rotation is already
// baked into the world matrix when we solve the child (see the update loop).
const BONE_SPECS: BoneSpec[] = [
	// Spine and neck run up the midline (hips → neck → head).
	{ bone: 'mixamorigSpine', from: 'hips', to: 'neck' },
	{ bone: 'mixamorigNeck', from: 'neck', to: 'head' },
	// Arms: shoulder → elbow → wrist.
	{ bone: 'mixamorigLeftArm', from: 'leftShoulder', to: 'leftElbow' },
	{ bone: 'mixamorigLeftForeArm', from: 'leftElbow', to: 'leftWrist' },
	{ bone: 'mixamorigRightArm', from: 'rightShoulder', to: 'rightElbow' },
	{ bone: 'mixamorigRightForeArm', from: 'rightElbow', to: 'rightWrist' },
	// Legs: hip → knee → ankle.
	{ bone: 'mixamorigLeftUpLeg', from: 'leftHip', to: 'leftKnee' },
	{ bone: 'mixamorigLeftLeg', from: 'leftKnee', to: 'leftAnkle' },
	{ bone: 'mixamorigRightUpLeg', from: 'rightHip', to: 'rightKnee' },
	{ bone: 'mixamorigRightLeg', from: 'rightKnee', to: 'rightAnkle' },
]

/** Ignore pose joints the model isn't confident about; below this we hold the rest pose. */
const MIN_CONFIDENCE = 0.5

/**
 * Convert a MediaPipe world point (x right, y down, z toward camera) into the
 * rig's space (y up, faces +z). Flipping y makes down→up; flipping z makes a
 * camera-facing subject face +z like Xbot does. The magnitude is irrelevant —
 * we only ever take directions — so no metric scaling is needed.
 */
function toRigSpace(p: { x: number; y: number; z: number }, out: THREE.Vector3): THREE.Vector3 {
	return out.set(p.x, -p.y, -p.z)
}

/**
 * A prepared retargeter bound to one loaded model. Call {@link PoseRetargeter.apply}
 * each frame with the latest pose. Cheap enough to run every frame; it early-outs
 * on a missing bone or a low-confidence joint pair.
 */
export class PoseRetargeter {
	private readonly bones: Array<{
		spec: BoneSpec
		bone: THREE.Object3D
		/** The bone's local rest rotation, restored each frame before applying the delta. */
		restQuat: THREE.Quaternion
		/** Unit rest direction (bone → child) in the bone's *parent* space. */
		restDir: THREE.Vector3
	}> = []

	// Scratch vectors/quaternions reused each frame to avoid per-frame allocation.
	private readonly a = new THREE.Vector3()
	private readonly b = new THREE.Vector3()
	private readonly targetLocal = new THREE.Vector3()
	private readonly parentInv = new THREE.Quaternion()
	private readonly parentWorld = new THREE.Quaternion()
	private readonly delta = new THREE.Quaternion()
	private readonly scratchPos = new THREE.Vector3()
	private readonly scratchScale = new THREE.Vector3()

	constructor(model: THREE.Object3D) {
		model.updateWorldMatrix(true, true)
		for (const spec of BONE_SPECS) {
			const bone = model.getObjectByName(spec.bone)
			// The bone's child determines the rest direction. Mixamo bones have a
			// single relevant child (e.g. LeftArm → LeftForeArm); we take the first.
			const child = bone?.children[0]
			if (!bone || !child) continue

			// Rest direction in the bone's local space is just the child's local
			// position (bones sit at their parent's origin). We express the target in
			// the *parent's* space when applying, so translate the rest dir similarly:
			// the bone's local frame here already is the parent's-space frame for the
			// child offset, because a child's position is defined in the bone's frame.
			const restDir = child.position.clone().normalize()
			if (restDir.lengthSq() === 0) continue

			this.bones.push({
				spec,
				bone,
				restQuat: bone.quaternion.clone(),
				restDir,
			})
		}
	}

	/**
	 * Apply `pose.world` to the rig. Returns true if at least one bone was driven
	 * (so the caller knows a live pose is steering the figure and can skip the
	 * idle clip). Bones whose joints are missing or low-confidence keep their rest
	 * rotation, so a partial pose degrades gracefully instead of collapsing.
	 */
	apply(pose: PoseData): boolean {
		const world = pose.world
		if (!world) return false

		let drove = false
		for (const entry of this.bones) {
			const { spec, bone, restQuat, restDir } = entry
			// Always start from the rest rotation so a joint that drops out this frame
			// returns to rest instead of freezing at its last driven angle.
			bone.quaternion.copy(restQuat)

			const from = world[spec.from]
			const to = world[spec.to]
			if (!from || !to || from.confidence < MIN_CONFIDENCE || to.confidence < MIN_CONFIDENCE) {
				continue
			}

			// Target direction (parent joint → child joint) in rig space.
			toRigSpace(from, this.a)
			toRigSpace(to, this.b)
			this.b.sub(this.a)
			if (this.b.lengthSq() === 0) continue
			this.b.normalize()

			// The rest direction lives in the bone's parent space; bring the target
			// there too by inverting the parent's *current* world rotation (which
			// already includes any parent bone we drove earlier this pass).
			bone.parent?.getWorldQuaternion(this.parentWorld)
			this.parentInv.copy(this.parentWorld).invert()
			this.targetLocal.copy(this.b).applyQuaternion(this.parentInv).normalize()

			// Rotate the rest direction onto the target, then compose with the rest
			// rotation so we rotate *relative to* the bone's rest orientation.
			this.delta.setFromUnitVectors(restDir, this.targetLocal)
			bone.quaternion.premultiply(this.delta)
			bone.updateWorldMatrix(false, false)
			drove = true
		}

		return drove
	}

	/** Restore every driven bone to its rest rotation (used when a pose is lost). */
	reset() {
		for (const entry of this.bones) entry.bone.quaternion.copy(entry.restQuat)
	}

	// Kept so the compiler doesn't drop the scratch decomposition helpers if a
	// future edit needs them; harmless no-op reference.
	private _touchScratch() {
		void this.scratchPos
		void this.scratchScale
	}
}
