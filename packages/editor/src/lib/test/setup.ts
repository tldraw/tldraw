// Test setup to mock browser APIs that jsdom doesn't provide

// Mock PointerEvent for jsdom
if (typeof window !== 'undefined' && !window.PointerEvent) {
	// @ts-ignore
	global.PointerEvent = class PointerEvent extends Event {
		pointerId: number
		pointerType: string
		clientX: number
		clientY: number

		constructor(type: string, options: any = {}) {
			super(type, options)
			this.pointerId = options.pointerId || 1
			this.pointerType = options.pointerType || 'mouse'
			this.clientX = options.clientX || 0
			this.clientY = options.clientY || 0
		}
	}
}

// Mock DragEvent for jsdom
if (typeof window !== 'undefined' && !window.DragEvent) {
	// @ts-ignore
	global.DragEvent = class DragEvent extends Event {
		dataTransfer: any

		constructor(type: string, options: any = {}) {
			super(type, options)
			this.dataTransfer = options.dataTransfer || {
				getData: () => '',
				setData: () => {},
				files: [],
			}
		}
	}
}

// Mock TouchEvent for jsdom
if (typeof window !== 'undefined' && !window.TouchEvent) {
	// @ts-ignore
	global.TouchEvent = class TouchEvent extends Event {
		touches: any[]

		constructor(type: string, options: any = {}) {
			super(type, options)
			this.touches = options.touches || []
		}
	}
}
