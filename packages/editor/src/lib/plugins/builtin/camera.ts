import { DEFAULT_CAMERA_OPTIONS } from '../../constants'
import { defineCapability, definePlugin } from '../plugin'
import { CameraController } from './CameraController'

/** @public */
export const cameraCapability = defineCapability<CameraController>('camera')

/**
 * Moves and constrains the camera, animates it, measures the viewport and follows other users.
 * The editor's camera and viewport methods use it. It reads the `cameraOptions` editor option and
 * `options.camera`, and `options.camera` wins.
 *
 * @public
 */
export const cameraPlugin = definePlugin({
	id: 'camera',
	provides: [cameraCapability],
	setup(ctx) {
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		const { cameraOptions, options } = ctx.editorOptions
		const camera = new CameraController(ctx.editor, {
			...DEFAULT_CAMERA_OPTIONS,
			...cameraOptions,
			...options?.camera,
		})
		ctx.provide(cameraCapability, camera)
		ctx.onDispose(() => camera.dispose())
	},
})
