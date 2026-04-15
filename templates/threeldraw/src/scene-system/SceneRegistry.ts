import { cubeScene } from '../scenes/cube/cubeScene'
import { flatScene } from '../scenes/flat/flatScene'
import { sphereDomeScene } from '../scenes/sphere-dome/sphereDomeScene'
import { sphereEquirectScene } from '../scenes/sphere-equirect/sphereEquirectScene'
import { AnySceneDefinition } from './types'

export const sceneDefinitions: AnySceneDefinition[] = [
	flatScene,
	cubeScene,
	sphereEquirectScene,
	sphereDomeScene,
]

export const DEFAULT_SCENE_ID = cubeScene.id

export function getSceneDefinition(sceneId: string) {
	return sceneDefinitions.find((scene) => scene.id === sceneId) ?? cubeScene
}

export function createInitialSceneStateMap() {
	return Object.fromEntries(
		sceneDefinitions.map((scene) => [scene.id, scene.createInitialState()])
	) as Record<string, unknown>
}
