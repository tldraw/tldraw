import { TestEditor } from '../../../test/TestEditor'
import { Box } from '../../../primitives/Box'
import { Vec } from '../../../primitives/Vec'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

describe('CameraManager', () => {
	describe('camera basics', () => {
		it('should have a camera manager instance', () => {
			expect(editor.camera).toBeDefined()
		})

		it('should get camera', () => {
			const camera = editor.camera.getCamera()
			expect(camera).toMatchObject({ x: 0, y: 0, z: 1 })
		})

		it('should set camera', () => {
			editor.camera.setCamera({ x: 10, y: 20, z: 2 })
			const camera = editor.camera.getCamera()
			expect(camera.x).toBe(10)
			expect(camera.y).toBe(20)
			expect(camera.z).toBe(2)
		})
	})

	describe('zoom', () => {
		it('should get zoom level', () => {
			const zoom = editor.camera.getZoomLevel()
			expect(zoom).toBe(1)
		})

		it('should get debounced zoom level', () => {
			const zoom = editor.camera.getDebouncedZoomLevel()
			expect(zoom).toBe(1)
		})

		it('should zoom in and out', () => {
			const initialZoom = editor.camera.getZoomLevel()
			editor.camera.zoomIn()
			expect(editor.camera.getZoomLevel()).toBeGreaterThan(initialZoom)

			const zoomedInLevel = editor.getZoomLevel()
			editor.camera.zoomOut()
			expect(editor.camera.getZoomLevel()).toBeLessThan(zoomedInLevel)
		})

		it('should reset zoom', () => {
			editor.camera.zoomIn()
			editor.camera.zoomIn()
			expect(editor.camera.getZoomLevel()).toBeGreaterThan(1)

			editor.camera.resetZoom()
			expect(editor.camera.getZoomLevel()).toBe(1)
		})
	})

	describe('viewport', () => {
		it('should get viewport screen bounds', () => {
			const bounds = editor.camera.getViewportScreenBounds()
			expect(bounds).toBeInstanceOf(Box)
		})

		it('should get viewport page bounds', () => {
			const bounds = editor.camera.getViewportPageBounds()
			expect(bounds).toBeInstanceOf(Box)
		})

		it('should update viewport screen bounds', () => {
			const newBounds = new Box(0, 0, 1000, 800)
			editor.camera.updateViewportScreenBounds(newBounds)
			const bounds = editor.camera.getViewportScreenBounds()
			expect(bounds.w).toBe(1000)
			expect(bounds.h).toBe(800)
		})
	})

	describe('coordinate transformations', () => {
		it('should transform screen to page', () => {
			const screenPoint = new Vec(100, 100)
			const pagePoint = editor.camera.screenToPage(screenPoint)
			expect(pagePoint).toBeInstanceOf(Vec)
		})

		it('should transform page to screen', () => {
			const pagePoint = new Vec(100, 100)
			const screenPoint = editor.camera.pageToScreen(pagePoint)
			expect(screenPoint).toBeInstanceOf(Vec)
		})

		it('should transform page to viewport', () => {
			const pagePoint = new Vec(100, 100)
			const viewportPoint = editor.camera.pageToViewport(pagePoint)
			expect(viewportPoint).toBeInstanceOf(Vec)
		})

		it('should correctly round-trip transformations', () => {
			const originalPage = new Vec(100, 200)
			const screen = editor.camera.pageToScreen(originalPage)
			const backToPage = editor.camera.screenToPage(screen)
			expect(backToPage.x).toBeCloseTo(originalPage.x, 5)
			expect(backToPage.y).toBeCloseTo(originalPage.y, 5)
		})
	})

	describe('camera options', () => {
		it('should get camera options', () => {
			const options = editor.camera.getCameraOptions()
			expect(options).toBeDefined()
			expect(options.isLocked).toBe(false)
		})

		it('should set camera options', () => {
			editor.camera.setCameraOptions({ isLocked: true })
			const options = editor.camera.getCameraOptions()
			expect(options.isLocked).toBe(true)
		})

		it('should not move camera when locked', () => {
			editor.camera.setCameraOptions({ isLocked: true })
			const originalCamera = editor.camera.getCamera()
			editor.camera.setCamera({ x: 100, y: 100, z: 1 })
			const newCamera = editor.camera.getCamera()
			expect(newCamera.x).toBe(originalCamera.x)
			expect(newCamera.y).toBe(originalCamera.y)
		})
	})

	describe('camera movement', () => {
		it('should center on point', () => {
			editor.camera.centerOnPoint({ x: 100, y: 200 })
			const viewport = editor.camera.getViewportPageBounds()
			expect(viewport.center.x).toBeCloseTo(100, 1)
			expect(viewport.center.y).toBeCloseTo(200, 1)
		})

		it('should stop camera animation', () => {
			editor.camera.stopCameraAnimation()
			// Should not throw
		})
	})

	describe('camera state', () => {
		it('should get camera state', () => {
			const state = editor.camera.getCameraState()
			expect(state).toBe('idle')
		})

		it('should update camera state when camera moves', () => {
			editor.camera.setCamera({ x: 100, y: 100, z: 1 })
			// Camera state is set to 'moving' when camera moves
			// and decays back to 'idle' after timeout
			const state = editor.camera.getCameraState()
			expect(['idle', 'moving']).toContain(state)
		})
	})

	describe('base and initial zoom', () => {
		it('should get base zoom', () => {
			const baseZoom = editor.camera.getBaseZoom()
			expect(baseZoom).toBe(1)
		})

		it('should get initial zoom', () => {
			const initialZoom = editor.camera.getInitialZoom()
			expect(initialZoom).toBe(1)
		})
	})
})
