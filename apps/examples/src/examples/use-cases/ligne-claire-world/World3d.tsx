/* oxlint-disable react/no-unknown-property -- R3F elements use three.js props */
import { Edges, OrbitControls } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Component, ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { compileScene } from '../make-3d-real/Model3dShapeUtil'
import { Footprint } from './footprints'

// Page pixels -> world units, and world height per storey.
const SCALE = 0.01
const FLOOR = 1.4

// A plain extruded prism for footprints without an asset. Uses the shape's true
// page-space outline, so position/rotation/size are inherently correct.
function Building({ fp, cx, cy }: { fp: Footprint; cx: number; cy: number }) {
	const geometry = useMemo(() => {
		const shape = new THREE.Shape()
		fp.points.forEach((p, i) => {
			// Page (x, y) -> world (X, Z) directly: x right, page-down = +Z = near
			// the camera. The rotateX below turns shape-y into world -z, so negate.
			const x = (p.x - cx) * SCALE
			const y = -(p.y - cy) * SCALE
			if (i === 0) shape.moveTo(x, y)
			else shape.lineTo(x, y)
		})
		shape.closePath()
		const geo = new THREE.ExtrudeGeometry(shape, {
			depth: fp.storeys * FLOOR,
			bevelEnabled: false,
		})
		// ExtrudeGeometry builds in XY and extrudes along +Z; tip it up so the
		// footprint lies on the ground (XZ) and the building rises along +Y.
		geo.rotateX(-Math.PI / 2)
		return geo
	}, [fp, cx, cy])

	return (
		<mesh geometry={geometry} castShadow receiveShadow>
			<meshToonMaterial color={fp.color} side={THREE.DoubleSide} />
			<Edges threshold={15} color="#2b2b2b" />
		</mesh>
	)
}

// A compiled `Scene` asset placed to match the shape's footprint. The asset is
// authored at an arbitrary scale, so we measure its bounding box once, then scale
// X/Z to fill the footprint's width/depth and rotate it to the shape's rotation.
// A long shape gives a long bridge; a circle gives a round pagoda.
function AssetBuilding({ fp, cx, cy }: { fp: Footprint; cx: number; cy: number }) {
	const innerRef = useRef<THREE.Group>(null)
	const [intrinsic, setIntrinsic] = useState<{ x: number; z: number; minY: number } | null>(null)

	const Scene = useMemo(() => {
		try {
			return compileScene(fp.assetCode!)
		} catch (e) {
			console.warn('[ligne-claire-world] asset failed to compile', e)
			return null
		}
	}, [fp.assetCode])

	// Measure the raw asset's true size while it's at identity (invisible). Done
	// in useFrame, not a layout effect, because R3F attaches the meshes to the
	// three scene during its own render loop — reading too early gives an empty
	// box and the asset would render at full authored scale.
	const doneRef = useRef(false)
	useEffect(() => {
		doneRef.current = false
		setIntrinsic(null)
	}, [Scene])
	useFrame(() => {
		if (doneRef.current || !innerRef.current) return
		const box = new THREE.Box3().setFromObject(innerRef.current)
		if (box.isEmpty()) return
		const size = new THREE.Vector3()
		box.getSize(size)
		if (size.x === 0 && size.z === 0) return
		doneRef.current = true
		setIntrinsic({ x: size.x || 1, z: size.z || 1, minY: box.min.y })
	})

	if (!Scene) return <Building fp={fp} cx={cx} cy={cy} />

	const measured = intrinsic != null
	const wx = (fp.center.x - cx) * SCALE
	const wz = (fp.center.y - cy) * SCALE // page-down = +Z = near the camera
	// Uniform scale: fit the asset's width to the footprint's width and keep its
	// designed proportions. The footprint aspect is snapped to the asset's on
	// assign, so its depth already matches. Uniform (not per-axis) keeps sizes
	// consistent between assets and never distorts them.
	const scale = measured ? (fp.localW * SCALE) / intrinsic.x : 1
	const y = measured ? -intrinsic.minY * scale : 0

	return (
		<group
			visible={measured}
			position={measured ? [wx, y, wz] : [0, 0, 0]}
			rotation={measured ? [0, -fp.rotation, 0] : [0, 0, 0]}
			scale={scale}
		>
			<group ref={innerRef}>
				<AssetErrorBoundary>
					<Scene />
				</AssetErrorBoundary>
			</group>
		</group>
	)
}

// Keep one bad asset from blanking the whole world.
class AssetErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
	override state = { hasError: false }
	static getDerivedStateFromError() {
		return { hasError: true }
	}
	override render() {
		return this.state.hasError ? null : this.props.children
	}
}

function centroid(footprints: Footprint[]) {
	if (footprints.length === 0) return { x: 0, y: 0 }
	let minX = Infinity,
		minY = Infinity,
		maxX = -Infinity,
		maxY = -Infinity
	for (const fp of footprints) {
		for (const p of fp.points) {
			if (p.x < minX) minX = p.x
			if (p.x > maxX) maxX = p.x
			if (p.y < minY) minY = p.y
			if (p.y > maxY) maxY = p.y
		}
	}
	return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 }
}

// The 3D world. It owns no state — it's a pure function of the footprints, which
// are themselves a pure function of the canvas shapes.
export function World3d({ footprints }: { footprints: Footprint[] }) {
	// Re-centre framing when the set of shapes changes (add/remove), but not while
	// dragging (count stays the same), so drags stay stable and the layout stays
	// framed as it grows.
	const [origin, setOrigin] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
	const live = useMemo(() => centroid(footprints), [footprints])
	// eslint-disable-next-line react-hooks/exhaustive-deps
	useEffect(() => setOrigin(live), [footprints.length])
	const cx = origin.x
	const cy = origin.y

	return (
		<Canvas
			shadows
			orthographic
			camera={{ position: [14, 14, 14], zoom: 46, near: 0.1, far: 1000 }}
			dpr={[1, 2]}
		>
			<color attach="background" args={['#f4f1ea']} />
			<ambientLight intensity={0.6} />
			<directionalLight
				position={[8, 14, 6]}
				intensity={1.2}
				castShadow
				shadow-mapSize={[2048, 2048]}
			/>
			<OrbitControls makeDefault enableDamping target={[0, 1, 0]} />

			{/* Paper ground plane */}
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
				<planeGeometry args={[200, 200]} />
				<meshToonMaterial color="#eae4d2" />
			</mesh>

			{footprints.map((fp) =>
				fp.assetCode ? (
					<AssetBuilding key={fp.id} fp={fp} cx={cx} cy={cy} />
				) : (
					<Building key={fp.id} fp={fp} cx={cx} cy={cy} />
				)
			)}
		</Canvas>
	)
}
