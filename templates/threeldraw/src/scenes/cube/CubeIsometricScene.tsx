import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { CSS3DObject, CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js'
import { CUBE_FRUSTUM, FACE_SIZE, normalizeFacePoint, type FaceName } from './constants'

export interface ProjectedFacePoint {
	faceName: FaceName
	localX: number
	localY: number
	pressure: number
}

interface CubeIsometricSceneProps {
	faceElements: Record<FaceName, HTMLDivElement>
	onPointerEvent?: (event: PointerEvent, hit: ProjectedFacePoint) => void
	onWheelEvent?: (event: WheelEvent, hit: ProjectedFacePoint) => void
}

export function CubeIsometricScene({
	faceElements,
	onPointerEvent,
	onWheelEvent,
}: CubeIsometricSceneProps) {
	const containerRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const container = containerRef.current
		if (!container) return
		const sceneContainer = container

		const width = sceneContainer.clientWidth
		const height = sceneContainer.clientHeight
		const aspect = width / height
		const size = FACE_SIZE

		const frustumSize = CUBE_FRUSTUM
		const camera = new THREE.OrthographicCamera(
			(-frustumSize * aspect) / 2,
			(frustumSize * aspect) / 2,
			frustumSize / 2,
			-frustumSize / 2,
			-10000,
			10000
		)
		const distance = 2000
		// Look a bit higher than the cube's center to shift the cube down on screen.
		const verticalShift = size * 0.15
		camera.position.set(distance, distance + verticalShift, distance)
		camera.lookAt(size / 2, size / 3 + verticalShift, size / 2)
		camera.updateProjectionMatrix()

		const cssScene = new THREE.Scene()
		const hitScene = new THREE.Scene()
		const raycaster = new THREE.Raycaster()
		const pointer = new THREE.Vector2()
		const lastHits = new Map<number, ProjectedFacePoint>()

		for (const el of Object.values(faceElements)) {
			el.style.width = `${size}px`
			el.style.height = `${size}px`
			el.style.overflow = 'hidden'
			el.style.background = 'white'
			el.style.backfaceVisibility = 'hidden'
			el.style.pointerEvents = 'none'
		}

		const leftObj = new CSS3DObject(faceElements.left)
		leftObj.position.set(0, size / 2, size / 2)
		leftObj.rotation.set(0, Math.PI / 2, 0)
		cssScene.add(leftObj)

		const rightObj = new CSS3DObject(faceElements.right)
		rightObj.position.set(size / 2, size / 2, 0)
		cssScene.add(rightObj)

		const floorObj = new CSS3DObject(faceElements.floor)
		floorObj.position.set(size / 2, 0, size / 2)
		floorObj.rotation.set(-Math.PI / 2, 0, 0)
		cssScene.add(floorObj)

		function createHitPlane(faceName: FaceName) {
			const plane = new THREE.Mesh(
				new THREE.PlaneGeometry(size, size),
				new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, visible: false })
			)
			plane.userData.faceName = faceName
			return plane
		}

		const leftHitPlane = createHitPlane('left')
		leftHitPlane.position.copy(leftObj.position)
		leftHitPlane.rotation.copy(leftObj.rotation)
		hitScene.add(leftHitPlane)

		const rightHitPlane = createHitPlane('right')
		rightHitPlane.position.copy(rightObj.position)
		rightHitPlane.rotation.copy(rightObj.rotation)
		hitScene.add(rightHitPlane)

		const floorHitPlane = createHitPlane('floor')
		floorHitPlane.position.copy(floorObj.position)
		floorHitPlane.rotation.copy(floorObj.rotation)
		hitScene.add(floorHitPlane)

		const cssRenderer = new CSS3DRenderer()
		cssRenderer.setSize(width, height)
		cssRenderer.domElement.style.position = 'absolute'
		cssRenderer.domElement.style.top = '0'
		cssRenderer.domElement.style.left = '0'
		cssRenderer.domElement.style.pointerEvents = 'none'
		sceneContainer.appendChild(cssRenderer.domElement)

		const glScene = new THREE.Scene()
		const verts: number[] = []
		verts.push(0, 0, 0, size, 0, 0)
		verts.push(0, 0, 0, 0, size, 0)
		verts.push(0, 0, 0, 0, 0, size)
		verts.push(0, size, 0, 0, size, size)
		verts.push(0, 0, size, 0, size, size)
		verts.push(0, size, 0, size, size, 0)
		verts.push(size, 0, 0, size, size, 0)
		verts.push(size, 0, 0, size, 0, size)
		verts.push(0, 0, size, size, 0, size)

		const edgeGeometry = new THREE.BufferGeometry()
		edgeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
		const edgeMaterial = new THREE.LineBasicMaterial({
			color: 0xffffff,
			opacity: 0.18,
			transparent: true,
		})
		glScene.add(new THREE.LineSegments(edgeGeometry, edgeMaterial))

		const glRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
		glRenderer.setSize(width, height)
		glRenderer.setPixelRatio(window.devicePixelRatio)
		glRenderer.setClearColor(0x000000, 0)
		glRenderer.domElement.style.position = 'absolute'
		glRenderer.domElement.style.top = '0'
		glRenderer.domElement.style.left = '0'
		glRenderer.domElement.style.pointerEvents = 'none'
		sceneContainer.appendChild(glRenderer.domElement)

		function render() {
			cssRenderer.render(cssScene, camera)
			glRenderer.render(glScene, camera)
		}

		function getFaceHit(event: PointerEvent | WheelEvent): ProjectedFacePoint | null {
			const rect = sceneContainer.getBoundingClientRect()
			if (!rect.width || !rect.height) return null

			pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
			pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
			raycaster.setFromCamera(pointer, camera)

			const [intersection] = raycaster.intersectObjects(hitScene.children, false)
			if (!intersection) return null

			const localPoint = intersection.object.worldToLocal(intersection.point.clone())
			const faceName = intersection.object.userData.faceName as FaceName
			const rawLocalX = THREE.MathUtils.clamp(localPoint.x + size / 2, 0, size)
			const rawLocalY = THREE.MathUtils.clamp(size / 2 - localPoint.y, 0, size)
			const { localX, localY } = normalizeFacePoint(faceName, rawLocalX, rawLocalY)

			return {
				faceName,
				localX,
				localY,
				pressure: 'pressure' in event ? event.pressure : 0.5,
			}
		}

		function handlePointer(event: PointerEvent) {
			const hit = getFaceHit(event) ?? lastHits.get(event.pointerId) ?? null
			if (!hit) return

			if (event.type === 'pointerdown') {
				sceneContainer.setPointerCapture(event.pointerId)
			}

			lastHits.set(event.pointerId, hit)
			onPointerEvent?.(event, hit)

			if (event.type === 'pointerup') {
				if (sceneContainer.hasPointerCapture(event.pointerId)) {
					sceneContainer.releasePointerCapture(event.pointerId)
				}
				lastHits.delete(event.pointerId)
			}
		}

		function handleWheel(event: WheelEvent) {
			const hit = getFaceHit(event)
			if (!hit) return
			onWheelEvent?.(event, hit)
		}

		function onResize() {
			const nextWidth = sceneContainer.clientWidth
			const nextHeight = sceneContainer.clientHeight
			const nextAspect = nextWidth / nextHeight

			camera.left = (-frustumSize * nextAspect) / 2
			camera.right = (frustumSize * nextAspect) / 2
			camera.updateProjectionMatrix()
			cssRenderer.setSize(nextWidth, nextHeight)
			glRenderer.setSize(nextWidth, nextHeight)
			render()
		}

		render()
		sceneContainer.addEventListener('pointerdown', handlePointer)
		sceneContainer.addEventListener('pointermove', handlePointer)
		sceneContainer.addEventListener('pointerup', handlePointer)
		sceneContainer.addEventListener('wheel', handleWheel, { passive: false })
		window.addEventListener('resize', onResize)

		return () => {
			sceneContainer.removeEventListener('pointerdown', handlePointer)
			sceneContainer.removeEventListener('pointermove', handlePointer)
			sceneContainer.removeEventListener('pointerup', handlePointer)
			sceneContainer.removeEventListener('wheel', handleWheel)
			window.removeEventListener('resize', onResize)
			sceneContainer.removeChild(cssRenderer.domElement)
			sceneContainer.removeChild(glRenderer.domElement)
			edgeGeometry.dispose()
			edgeMaterial.dispose()
			leftHitPlane.geometry.dispose()
			rightHitPlane.geometry.dispose()
			floorHitPlane.geometry.dispose()
			;(leftHitPlane.material as THREE.Material).dispose()
			;(rightHitPlane.material as THREE.Material).dispose()
			;(floorHitPlane.material as THREE.Material).dispose()
			glRenderer.dispose()
		}
	}, [faceElements, onPointerEvent, onWheelEvent])

	return <div ref={containerRef} className="threeldraw-scene" />
}
