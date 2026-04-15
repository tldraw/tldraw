import { SceneDefinition } from '../../scene-system/types'
import { DEFAULT_SPHERE_STATE, SphereSceneState } from '../sphere-shared/sphereConstants'
import { SphereControls } from '../sphere-shared/SphereControls'
import { SphereEquirectView } from './SphereEquirectView'

export const sphereEquirectScene: SceneDefinition<SphereSceneState> = {
	id: 'sphere-equirect',
	label: 'Sphere (equirect)',
	description: 'Wrap the canvas around a full sphere using equirectangular projection.',
	createInitialState: () => ({ ...DEFAULT_SPHERE_STATE }),
	View: SphereEquirectView,
	Controls: SphereControls,
}
