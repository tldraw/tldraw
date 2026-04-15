import { useCallback, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { Box } from 'tldraw'
import { SceneViewProps } from '../../scene-system/types'
import {
	DOME_PAGE_SIZE,
	SPHERE_RADIUS,
	SphereSceneState,
	domeUvToPage,
} from '../sphere-shared/sphereConstants'
import { sphereRaycast, SphereHit } from '../sphere-shared/sphereRaycast'
import { useSphereTexture } from '../sphere-shared/useSphereTexture'

export function SphereDomeView({
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

	const { texture, setRenderCallback } = useSphereTexture(editor, DOME_PAGE_SIZE, DOME_PAGE_SIZE)

	// Editor viewport setup
	useEffect(() => {
		if (!editor) return
		const canvasEl = editor.getContainer().querySelector('.tl-canvas') as HTMLElement | null
		const origRect = canvasEl?.getBoundingClientRect.bind(canvasEl)

		editor.updateViewportScreenBounds(new Box(0, 0, DOME_PAGE_SIZE, DOME_PAGE_SIZE))
		if (canvasEl) {
			canvasEl.getBoundingClientRect = () => new DOMRect(0, 0, DOME_PAGE_SIZE, DOME_PAGE_SIZE)
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

		// Upper hemisphere: phiStart=0, phiLength=2π, thetaStart=0, thetaLength=π/2
		const geo = new THREE.SphereGeometry(SPHERE_RADIUS, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2)
		const mat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide })
		const mesh = new THREE.Mesh(geo, mat)
		// Rotate so the dome opening faces down and the pole faces the camera
		mesh.rotation.x = Math.PI / 2
		scene.add(mesh)
		meshRef.current = mesh

		// Wireframe
		const wireGeo = new THREE.SphereGeometry(
			SPHERE_RADIUS * 1.001,
			24,
			8,
			0,
			Math.PI * 2,
			0,
			Math.PI / 2
		)
		const wireMat = new THREE.MeshBasicMaterial({
			color: 0xffffff,
			wireframe: true,
			opacity: 0.06,
			transparent: true,
		})
		const wireMesh = new THREE.Mesh(wireGeo, wireMat)
		wireMesh.rotation.x = Math.PI / 2
		scene.add(wireMesh)

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

	// Camera from state
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

	const toScreenPoint = useCallback(
		(hit: SphereHit) => {
			if (!editor) return null
			const page = domeUvToPage(hit.u, hit.v)
			return { ...editor.pageToScreen(page), z: hit.pressure }
		},
		[editor]
	)

	useEffect(() => {
		const container = containerRef.current
		const mesh = meshRef.current
		const camera = cameraRef.current
		if (!container || !mesh || !camera) return

		function handlePointer(e: PointerEvent) {
			const hit = sphereRaycast(e, container!, camera!, mesh!) ?? lastHitRef.current
			if (!hit) return

			if (e.type === 'pointerdown') container!.setPointerCapture(e.pointerId)

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
