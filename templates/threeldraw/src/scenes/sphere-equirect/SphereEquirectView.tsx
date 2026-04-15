import { useCallback, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { Box } from 'tldraw'
import { SceneViewProps } from '../../scene-system/types'
import {
	EQUIRECT_PAGE_HEIGHT,
	EQUIRECT_PAGE_WIDTH,
	SPHERE_RADIUS,
	SphereSceneState,
	equirectUvToPage,
} from '../sphere-shared/sphereConstants'
import { sphereRaycast, SphereHit } from '../sphere-shared/sphereRaycast'
import { useSphereTexture } from '../sphere-shared/useSphereTexture'

export function SphereEquirectView({
	editor,
	state: rawState,
	bridge,
}: SceneViewProps<SphereSceneState>) {
	const state = rawState as SphereSceneState
	const containerRef = useRef<HTMLDivElement>(null)
	const meshRef = useRef<THREE.Mesh | null>(null)
	const cameraRef = useRef<THREE.OrthographicCamera | null>(null)
	const renderRef = useRef<(() => void) | null>(null)
	const lastHitRef = useRef<SphereHit | null>(null)

	const { texture, setRenderCallback } = useSphereTexture(
		editor,
		EQUIRECT_PAGE_WIDTH,
		EQUIRECT_PAGE_HEIGHT
	)

	// Editor viewport setup
	useEffect(() => {
		if (!editor) return
		const canvasEl = editor.getContainer().querySelector('.tl-canvas') as HTMLElement | null
		const origRect = canvasEl?.getBoundingClientRect.bind(canvasEl)

		editor.updateViewportScreenBounds(new Box(0, 0, EQUIRECT_PAGE_WIDTH, EQUIRECT_PAGE_HEIGHT))
		if (canvasEl) {
			canvasEl.getBoundingClientRect = () =>
				new DOMRect(0, 0, EQUIRECT_PAGE_WIDTH, EQUIRECT_PAGE_HEIGHT)
		}
		editor.setCamera({ x: 0, y: 0, z: 1 }, { immediate: true })

		return () => {
			if (canvasEl && origRect) {
				canvasEl.getBoundingClientRect = origRect
				editor.updateViewportScreenBounds(canvasEl)
			}
		}
	}, [editor])

	// Three.js scene
	useEffect(() => {
		const container = containerRef.current
		if (!container || !texture) return

		const width = container.clientWidth
		const height = container.clientHeight
		const aspect = width / height
		const frustum = SPHERE_RADIUS * 2.5

		const camera = new THREE.OrthographicCamera(
			-frustum * aspect,
			frustum * aspect,
			frustum,
			-frustum,
			0.1,
			5000
		)
		cameraRef.current = camera

		const scene = new THREE.Scene()
		scene.background = new THREE.Color('#1a1a2e')

		const geo = new THREE.SphereGeometry(SPHERE_RADIUS, 64, 32)
		const mat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.FrontSide })
		const mesh = new THREE.Mesh(geo, mat)
		scene.add(mesh)
		meshRef.current = mesh

		// Wireframe overlay
		const wireGeo = new THREE.SphereGeometry(SPHERE_RADIUS * 1.001, 24, 12)
		const wireMat = new THREE.MeshBasicMaterial({
			color: 0xffffff,
			wireframe: true,
			opacity: 0.06,
			transparent: true,
		})
		scene.add(new THREE.Mesh(wireGeo, wireMat))

		const renderer = new THREE.WebGLRenderer({ antialias: true })
		renderer.setSize(width, height)
		renderer.setPixelRatio(window.devicePixelRatio)
		container.appendChild(renderer.domElement)

		function render() {
			renderer.render(scene, camera)
		}

		renderRef.current = render
		setRenderCallback(render)
		render()

		function onResize() {
			if (!container) return
			const w = container.clientWidth
			const h = container.clientHeight
			const a = w / h
			camera.left = -frustum * a
			camera.right = frustum * a
			camera.updateProjectionMatrix()
			renderer.setSize(w, h)
			render()
		}
		window.addEventListener('resize', onResize)

		return () => {
			window.removeEventListener('resize', onResize)
			container.removeChild(renderer.domElement)
			renderer.dispose()
			geo.dispose()
			mat.dispose()
			wireGeo.dispose()
			wireMat.dispose()
			meshRef.current = null
			cameraRef.current = null
			renderRef.current = null
		}
	}, [texture, setRenderCallback])

	// Update camera position from state
	useEffect(() => {
		const camera = cameraRef.current
		if (!camera) return
		const dist = 1000
		const x = dist * Math.cos(state.elevation) * Math.sin(state.azimuth)
		const y = dist * Math.sin(state.elevation)
		const z = dist * Math.cos(state.elevation) * Math.cos(state.azimuth)
		camera.position.set(x, y, z)
		camera.lookAt(0, 0, 0)
		camera.updateProjectionMatrix()
		renderRef.current?.()
	}, [state.azimuth, state.elevation])

	// Pointer → page → screen → bridge
	const toScreenPoint = useCallback(
		(hit: SphereHit) => {
			if (!editor) return null
			const page = equirectUvToPage(hit.u, hit.v)
			return { ...editor.pageToScreen(page), z: hit.pressure }
		},
		[editor]
	)

	// Pointer events
	useEffect(() => {
		const container = containerRef.current
		const mesh = meshRef.current
		const camera = cameraRef.current
		if (!container || !mesh || !camera) return

		function handlePointer(e: PointerEvent) {
			const hit = sphereRaycast(e, container!, camera!, mesh!) ?? lastHitRef.current
			if (!hit) return

			if (e.type === 'pointerdown') {
				container!.setPointerCapture(e.pointerId)
			}

			lastHitRef.current = hit
			const pt = toScreenPoint(hit)
			if (pt) bridge.dispatchPointer(e, pt)

			if (e.type === 'pointerup') {
				lastHitRef.current = null
				if (container!.hasPointerCapture(e.pointerId)) {
					container!.releasePointerCapture(e.pointerId)
				}
			}
		}

		function handleWheel(e: WheelEvent) {
			const hit = sphereRaycast(e, container!, camera!, mesh!)
			if (!hit) return
			const pt = toScreenPoint(hit)
			if (pt) bridge.dispatchWheel(e, pt)
		}

		container.addEventListener('pointerdown', handlePointer)
		container.addEventListener('pointermove', handlePointer)
		container.addEventListener('pointerup', handlePointer)
		container.addEventListener('wheel', handleWheel, { passive: false })

		return () => {
			container.removeEventListener('pointerdown', handlePointer)
			container.removeEventListener('pointermove', handlePointer)
			container.removeEventListener('pointerup', handlePointer)
			container.removeEventListener('wheel', handleWheel)
		}
	}, [bridge, toScreenPoint])

	return <div ref={containerRef} className="threeldraw-scene" />
}
