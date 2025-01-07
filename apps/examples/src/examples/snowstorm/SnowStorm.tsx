import { useEffect, useRef } from 'react'
import { Vec, useEditor, usePrefersReducedMotion } from 'tldraw'

const MAX_GUST_SPEED = 2
const GUST_ROTATION_DURATION = 30_000

const MAX_PIXELS_SCROLL_EFFECT = 18
const MAX_SCROLL_SPEED = 2

const MIN_POINTER_DISTANCE_SQUARED = 10_000
const SNOWFLAKE_VELOCITY_DECAY = 0.82

interface Snowflake {
	element: HTMLElement
	x: number
	y: number
	vx: number
	vy: number
	pvx: number
	pvy: number
	size: number
}

function rnd(min: number, max: number): number {
	return Math.random() * (max - min) + min
}

class Snowstorm {
	private flakes: Snowflake[] = []
	private active: boolean = false
	private container: HTMLElement
	private width: number
	private height: number

	windX = 0
	windY = 0

	baseWindX = 0

	// Configuration options
	private readonly config = {
		flakesMax: 128,
		flakeSizeMin: 2,
		flakeSizeMax: 5,
		flakeSpeedMinY: 1,
		flakeSpeedMaxY: 3,
		flakeSpeedX: 2,
	}

	constructor(container: HTMLElement = document.body) {
		this.container = container
		this.width = container.clientWidth
		this.height = container.clientHeight
	}

	private createSnowflake(): Snowflake {
		const element = document.createElement('div')
		element.classList.add('snowflake')
		this.container.appendChild(element)

		return {
			element,
			x: 0,
			y: 0,
			vx: 0,
			vy: 0,
			pvx: 0,
			pvy: 0,
			size: 1,
		}
	}

	configureSnowflake(flake: Snowflake) {
		const size = rnd(this.config.flakeSizeMin, this.config.flakeSizeMax)
		flake.x = rnd(0, this.width)
		flake.y = rnd(-this.height, 0)
		flake.vx = rnd(-this.config.flakeSpeedX, this.config.flakeSpeedX)
		flake.vy = rnd(this.config.flakeSpeedMinY, this.config.flakeSpeedMaxY)
		flake.element.style.width = `${size}px`
		flake.element.style.height = `${size}px`
		flake.element.style.opacity = rnd(0.5, 1).toString()
	}

	// Main render loop
	render(screenPoint: Vec, pointerVelocity: Vec, time: number) {
		if (!this.active) return

		const q = Math.sin(time / GUST_ROTATION_DURATION)

		// make wind gradually cycle between 0 and 10, maybe a bit randomly, like gusts of wind
		this.baseWindX = q * MAX_GUST_SPEED

		const pointerLen = pointerVelocity.len2()

		for (const flake of this.flakes) {
			const dist2 = Vec.Dist2(screenPoint, new Vec(flake.x, flake.y))

			// if the pointer is moving quickly, give nearby snowflakes a little boost based on the pointer velocity
			if (dist2 < MIN_POINTER_DISTANCE_SQUARED) {
				if (pointerLen > 1) {
					flake.pvx = pointerVelocity.x
					flake.pvy = pointerVelocity.y < 0 ? pointerVelocity.y / 2 : pointerVelocity.y // don't push up as easily
				}
			} else {
				// otherwise, declay down other snowflakes that have been boosted
				if (flake.pvx !== 0) {
					flake.pvx *= SNOWFLAKE_VELOCITY_DECAY
					if (Math.abs(flake.pvx) < 0.01) {
						flake.pvx = 0
					}

					if (flake.pvy !== 0) {
						flake.pvy *= SNOWFLAKE_VELOCITY_DECAY
						if (Math.abs(flake.pvy) < 0.01) {
							flake.pvy = 0
						}
					}
				}
			}

			// Move the flake based on the wind, the base wind, the pointer velocity, and some random wobble
			flake.x += flake.vx + this.windX + this.baseWindX + flake.pvx
			flake.y += flake.vy + this.windY + flake.pvy

			// Wrap the snowflakes around the screen horizontally
			if (flake.x < 0) {
				flake.x += this.width
				flake.pvx = 0
			} else if (flake.x > this.width) {
				flake.x -= this.width
				flake.pvx = 0
			}

			// Wrap the snowflakes around the screen vertically
			if (flake.y < 0) {
				flake.y += this.height
				flake.pvy = 0
			} else if (flake.y > this.height) {
				flake.y -= this.height
				flake.pvy = 0
			}

			flake.element.style.transform = `translate(${flake.x}px, ${flake.y}px)`
		}
	}

	resize() {
		this.width = this.container.clientWidth
		this.height = this.container.clientHeight
	}

	start() {
		this.active = true
		while (this.flakes.length < this.config.flakesMax) {
			const flake = this.createSnowflake()
			this.configureSnowflake(flake)
			this.flakes.push(flake)
		}
		window.addEventListener('resize', this.resize)
	}

	stop() {
		this.active = false
		for (const flake of this.flakes) {
			this.container.removeChild(flake.element)
		}
		this.flakes = []
	}

	dispose() {
		this.stop()
		window.removeEventListener('resize', this.resize)
	}
}

export function SnowStorm() {
	const editor = useEditor()
	const rElm = useRef<HTMLDivElement>(null)
	const prefersReducedMotion = usePrefersReducedMotion()

	useEffect(() => {
		if (prefersReducedMotion) return
		if (!rElm.current) return
		const snowstorm = new Snowstorm(rElm.current)
		const velocity = new Vec(0, 0)
		const camera = Vec.From(editor.getCamera())

		const start = Date.now()

		function updateOnTick() {
			const time = Date.now() - start

			const newCamera = editor.getCamera()

			// Apply camera movement effect only when zoom isn't changing
			if (newCamera.z === camera.z) {
				const dx = (newCamera.x - camera.x) * camera.z
				const dy = (newCamera.y - camera.y) * camera.z

				// add the camera movement to the velocity
				velocity.addXY(
					Math.min(dx / MAX_PIXELS_SCROLL_EFFECT, MAX_SCROLL_SPEED),
					Math.min(dy / MAX_PIXELS_SCROLL_EFFECT, MAX_SCROLL_SPEED)
				)

				// decay velocity
				velocity.mul(SNOWFLAKE_VELOCITY_DECAY)

				// stop the snowflakes from moving if the camera is not moving
				if (velocity.len2() < 1) {
					velocity.x = 0
					velocity.y = 0
				}

				snowstorm.windX = velocity.x
				snowstorm.windY = velocity.y
			}

			camera.setTo(newCamera)
			snowstorm.render(editor.inputs.currentScreenPoint, editor.inputs.pointerVelocity, time)
		}

		snowstorm.start()
		editor.on('tick', updateOnTick)

		return () => {
			editor.off('tick', updateOnTick)
			snowstorm.dispose()
		}
	}, [editor, prefersReducedMotion])

	return <div ref={rElm} className="snowstorm" />
}
