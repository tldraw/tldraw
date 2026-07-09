import { useEffect, useRef } from 'react'
import * as THREE from 'three'
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
 * `screen = (page + camera) * zoom`. We drive an orthographic three.js camera
 * in pixel units and apply that same transform every frame, so panning slides
 * the figure and zooming scales it, exactly in step with the shapes.
 *
 * The figure itself is a canonical three.js starter: a rotating icosahedron
 * with a directional light. Swap the geometry/material below to make it yours.
 */

// Where the figure sits, in tldraw page coordinates, and its size (pixels at 100% zoom).
const FIGURE_PAGE_X = 0
const FIGURE_PAGE_Y = 0
const FIGURE_RADIUS = 120

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

		// Orthographic camera in pixel units: 1 world unit == 1 screen pixel,
		// origin at the top-left, y pointing down — matching tldraw's screen space.
		const cam = new THREE.OrthographicCamera(0, 1, 0, 1, -1000, 1000)
		cam.position.z = 100

		const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
		renderer.setPixelRatio(window.devicePixelRatio)
		container.appendChild(renderer.domElement)
		const canvas = renderer.domElement
		canvas.style.position = 'absolute'
		canvas.style.inset = '0'
		canvas.style.width = '100%'
		canvas.style.height = '100%'

		// The figure: a rotating icosahedron with a little lighting.
		const geometry = new THREE.IcosahedronGeometry(FIGURE_RADIUS, 0)
		const material = new THREE.MeshPhongMaterial({
			color: 0x6366f1,
			flatShading: true,
			shininess: 40,
		})
		const mesh = new THREE.Mesh(geometry, material)
		scene.add(mesh)

		const light = new THREE.DirectionalLight(0xffffff, 2.5)
		light.position.set(0.5, -1, 1)
		scene.add(light)
		scene.add(new THREE.AmbientLight(0xffffff, 0.6))

		let width = 0
		let height = 0
		const resize = () => {
			width = container.clientWidth
			height = container.clientHeight
			renderer.setSize(width, height, false)
			// Ortho frustum spans the container in pixels; y flipped so down is +y.
			cam.left = 0
			cam.right = width
			cam.top = 0
			cam.bottom = height
			cam.updateProjectionMatrix()
		}
		resize()

		const resizeObserver = new ResizeObserver(resize)
		resizeObserver.observe(container)

		let raf = 0
		const render = () => {
			raf = requestAnimationFrame(render)

			const { x, y, z } = cameraRef.current
			// tldraw: screen = (page + camera) * zoom — so the figure pans and
			// zooms with the canvas from its fixed page-space home.
			mesh.position.x = (FIGURE_PAGE_X + x) * z
			mesh.position.y = (FIGURE_PAGE_Y + y) * z
			mesh.scale.setScalar(z)

			mesh.rotation.x += 0.005
			mesh.rotation.y += 0.008

			renderer.render(scene, cam)
		}
		render()

		return () => {
			cancelAnimationFrame(raf)
			resizeObserver.disconnect()
			renderer.dispose()
			geometry.dispose()
			material.dispose()
			canvas.remove()
		}
	}, [editor])

	// Full-bleed container behind the shapes. `pointer-events: none` lets all
	// canvas interaction (drawing, selecting) pass straight through.
	return (
		<div ref={containerRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
	)
}
