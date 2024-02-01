import { EASINGS } from '../../primitives/easings'
import { Editor } from '../Editor'

export class CameraManager {
	constructor(public editor: Editor) {}

	// Zoom
	minZoom = 0.1
	maxZoom = 8
	zoomSteps = [0.1, 0.25, 0.5, 1, 2, 4, 8]

	// Animation
	animationShortDuration = 80
	animationMediumDuration = 320
	animationOptions = {
		duration: 0,
		easing: EASINGS.easeInOutCubic,
	}

	// Friction
	slideFriction = 0.09

	movementTimeout = 64

	maxRenderingInterval = 620
}
