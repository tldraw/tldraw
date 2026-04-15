import * as THREE from 'three'

const _pointer = new THREE.Vector2()
const _raycaster = new THREE.Raycaster()

export interface SphereHit {
	u: number
	v: number
	pressure: number
}

/**
 * Raycast a pointer event against a sphere mesh and return UV coordinates.
 */
export function sphereRaycast(
	event: PointerEvent | WheelEvent,
	container: HTMLElement,
	camera: THREE.Camera,
	mesh: THREE.Mesh
): SphereHit | null {
	const rect = container.getBoundingClientRect()
	if (!rect.width || !rect.height) return null

	_pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
	_pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

	_raycaster.setFromCamera(_pointer, camera)
	const intersections = _raycaster.intersectObject(mesh, false)
	if (intersections.length === 0) return null

	const hit = intersections[0]
	if (!hit.uv) return null

	return {
		u: hit.uv.x,
		v: hit.uv.y,
		pressure: 'pressure' in event ? event.pressure : 0.5,
	}
}
