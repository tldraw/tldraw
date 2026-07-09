import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { useEditor, useValue } from 'tldraw'

/**
 * A three.js scene rendered behind the tldraw shapes.
 *
 * This is wired in as the `Background` component (see App.tsx), so tldraw
 * mounts it beneath every shape on the canvas. The 3D figure lives at a fixed
 * point in tldraw *page space*, so it pans and zooms with the canvas — it feels
 * anchored to the drawing rather than pinned to the viewport.
 *
 * How the camera tracking works: tldraw maps a page point to a screen point as
 * `screen = (page + camera) * zoom`. The figure is drawn with a *perspective*
 * camera (so it has real depth and shading), but we position and scale it in
 * pixel units and apply that same tldraw transform every frame — so panning
 * slides the figure and zooming scales it, exactly in step with the shapes.
 *
 * The figure is Xbot, one of three.js's own rigged glTF demo characters
 * (examples/models/gltf/Xbot.glb, MIT-licensed). It ships with `idle`, `walk`,
 * and `run` clips driven by an AnimationMixer. Swap MODEL_URL / ACTIVE_CLIP
 * below to make it yours.
 */

// The rigged figure, served from public/models. Swap for another glTF/GLB.
const MODEL_URL = '/models/Xbot.glb'
// Which animation clip to play. Xbot ships 'idle', 'walk', 'run'.
const ACTIVE_CLIP = 'idle'

// Where the figure sits, in tldraw page coordinates. Exported so the "Center"
// button can recenter the canvas on this point. Note: the Center button aims
// the camera at exactly this point, so it cancels out of the on-screen framing
// — to nudge the figure up/down within the frame, use FIGURE_FRAME_OFFSET_Y
// below, not this.
export const FIGURE_PAGE_X = 0
export const FIGURE_PAGE_Y = 0
// Vertical framing bias in screen pixels, applied in the render loop where the
// Center button can't cancel it. The figure is pivoted at the pelvis, which
// sits ~58% up the body, so centering the pelvis leaves the standing figure
// low; a positive value lifts it so the whole figure reads as centered. Tuned
// by eye against the rendered frame.
const FIGURE_FRAME_OFFSET_Y = 200
// On-screen height of the figure in pixels at 100% zoom. The loaded model is
// ~1.6 world units tall; we scale it to hit this pixel height.
const FIGURE_HEIGHT = 320

export function ThreeBackground() {
	const editor = useEditor()
	const containerRef = useRef<HTMLDivElement>(null)

	// Re-read the camera reactively so pan/zoom keeps the figure in sync even
	// while the render loop is idle between animation frames.
	const camera = useValue('camera', () => editor.getCamera(), [editor])

	// Keep the latest camera in a ref so the animation loop (set up once) can
	// read it without re-running the effect on every pan/zoom.
	const cameraRef = useRef(camera)
	cameraRef.current = camera

	useEffect(() => {
		const container = containerRef.current
		if (!container) return

		const scene = new THREE.Scene()

		// Perspective camera looking down -z from a fixed distance. We keep the
		// figure near z=0 and move it in x/y pixel units; because the camera sits
		// at a constant distance, one world unit stays a predictable number of
		// pixels, which we solve for once the viewport size is known (see resize).
		const CAMERA_DISTANCE = 1000
		const cam = new THREE.PerspectiveCamera(35, 1, 1, 5000)
		cam.position.set(0, 0, CAMERA_DISTANCE)

		const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
		renderer.setPixelRatio(window.devicePixelRatio)
		container.appendChild(renderer.domElement)
		const canvas = renderer.domElement
		canvas.style.position = 'absolute'
		canvas.style.inset = '0'
		canvas.style.width = '100%'
		canvas.style.height = '100%'

		// Lighting: a key directional light plus soft ambient fill.
		const light = new THREE.DirectionalLight(0xffffff, 2.5)
		light.position.set(0.5, 1, 1)
		scene.add(light)
		scene.add(new THREE.AmbientLight(0xffffff, 0.9))

		// The figure lives inside a wrapper we translate/scale each frame. The
		// glTF's own transform stays untouched inside it. The Xbot model already
		// faces the camera (+Z) in its default orientation, so no extra rotation
		// is needed — the figure faces the viewer head-on.
		const figure = new THREE.Group()
		scene.add(figure)

		// Number of screen pixels one world unit spans at z=0 for this camera.
		// Derived from the perspective frustum: the visible height at the focal
		// plane is 2 * distance * tan(fov/2), mapped onto the viewport height.
		let pixelsPerUnit = 1
		let unitScale = 1 // world units per pixel of desired figure height

		let mixer: THREE.AnimationMixer | null = null
		// Track elapsed time by hand to feed the animation mixer a per-frame delta
		// (in seconds). `performance.now()` avoids THREE.Clock, which is deprecated.
		let lastTime = performance.now()

		const loader = new GLTFLoader()
		let disposed = false
		loader.load(
			MODEL_URL,
			(gltf) => {
				if (disposed) return
				const model = gltf.scene

				// Pivot the model around its pelvis so scaling and positioning turn
				// around the figure's center of mass rather than its feet. We use the
				// rig's hip bone when present (Xbot is a Mixamo rig; GLTFLoader strips
				// the colon from `mixamorig:Hips`, so the runtime name is
				// `mixamorigHips`), falling back to the bounding-box center height.
				model.updateWorldMatrix(true, true)
				const box = new THREE.Box3().setFromObject(model)
				const size = new THREE.Vector3()
				const center = new THREE.Vector3()
				box.getSize(size)
				box.getCenter(center)

				const hips = model.getObjectByName('mixamorigHips')
				const pelvisY = hips ? hips.getWorldPosition(new THREE.Vector3()).y : center.y

				model.position.x -= center.x
				model.position.z -= center.z
				model.position.y -= pelvisY
				// Normalize so the model is 1 world unit tall; per-frame scale then
				// stretches that to the desired pixel height.
				const modelHeight = size.y || 1
				model.scale.setScalar(1 / modelHeight)

				figure.add(model)

				mixer = new THREE.AnimationMixer(model)
				const clip =
					THREE.AnimationClip.findByName(gltf.animations, ACTIVE_CLIP) ?? gltf.animations[0]
				if (clip) mixer.clipAction(clip).play()
			},
			undefined,
			(err) => console.error('Failed to load figure model', err)
		)

		let width = 0
		let height = 0
		const resize = () => {
			width = container.clientWidth
			height = container.clientHeight
			renderer.setSize(width, height, false)
			cam.aspect = width === 0 ? 1 : width / height
			cam.updateProjectionMatrix()

			// Visible world-height at z=0, and thus pixels per world unit.
			const visibleHeight = 2 * CAMERA_DISTANCE * Math.tan((cam.fov * Math.PI) / 360)
			pixelsPerUnit = height / visibleHeight
			// One normalized (1-unit-tall) model should render FIGURE_HEIGHT px.
			unitScale = FIGURE_HEIGHT / pixelsPerUnit
		}
		resize()

		const resizeObserver = new ResizeObserver(resize)
		resizeObserver.observe(container)

		let raf = 0
		const render = () => {
			raf = requestAnimationFrame(render)

			const now = performance.now()
			mixer?.update((now - lastTime) / 1000)
			lastTime = now

			const { x, y, z } = cameraRef.current
			// tldraw: screen = (page + camera) * zoom. Convert that screen pixel
			// position into this camera's world units (origin at center, +y up).
			const screenX = (FIGURE_PAGE_X + x) * z
			const screenY = (FIGURE_PAGE_Y + y) * z
			figure.position.x = (screenX - width / 2) / pixelsPerUnit
			// Lift by the framing offset (scaled with zoom) so the figure sits
			// higher than a strict pelvis-centered position.
			figure.position.y = (height / 2 - screenY + FIGURE_FRAME_OFFSET_Y * z) / pixelsPerUnit
			figure.scale.setScalar(unitScale * z)

			renderer.render(scene, cam)
		}
		render()

		return () => {
			disposed = true
			cancelAnimationFrame(raf)
			resizeObserver.disconnect()
			mixer?.stopAllAction()
			renderer.dispose()
			scene.traverse((obj) => {
				if (obj instanceof THREE.Mesh) {
					obj.geometry?.dispose()
					const material = obj.material
					if (Array.isArray(material)) material.forEach((m) => m.dispose())
					else material?.dispose()
				}
			})
			canvas.remove()
		}
	}, [editor])

	// Full-bleed container behind the shapes. `pointer-events: none` lets all
	// canvas interaction (drawing, selecting) pass straight through.
	return (
		<div ref={containerRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
	)
}
