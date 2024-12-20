import { useEffect, useRef } from 'react'
import { Vec, useEditor } from 'tldraw'

/* eslint-disable local/prefer-class-methods */
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
		flakesMaxActive: 64,
		animationInterval: 30,
		flakeSizeMin: 2,
		flakeSizeMax: 8,
		windMax: 2,
	}

	constructor(container: HTMLElement = document.body) {
		this.container = container
		this.width = container.clientWidth
		this.height = container.clientHeight
	}

	private createSnowflake(): Snowflake {
		const size = rnd(this.config.flakeSizeMin, this.config.flakeSizeMax)
		const opacity = rnd(0.5, 1)

		const element = document.createElement('div')
		element.style.width = `${size}px`
		element.style.height = `${size}px`
		element.classList.add('tl-snowflake')
		element.style.opacity = opacity.toString()

		this.container.appendChild(element)

		return {
			element,
			x: rnd(0, this.width),
			y: rnd(-this.height, 0),
			vx: rnd(-this.config.windMax, this.config.windMax),
			vy: rnd(1, 3),
			pvx: 0,
			pvy: 0,
			size,
		}
	}

	// Main render loop
	render = (screenPoint: Vec, pointerVelocity: Vec) => {
		if (!this.active) return

		const pointerLen = pointerVelocity.len2()

		for (const flake of this.flakes) {
			const dist2 = Vec.Dist2(screenPoint, new Vec(flake.x, flake.y))
			// if the snowflake is close to the pointer, give it a little boost based on the pointer velocity

			if (dist2 < 10000 && pointerLen > 1) {
				flake.pvx = pointerVelocity.x
				flake.pvy = pointerVelocity.y
			} else {
				if (flake.pvx !== 0) {
					flake.pvx *= 0.9
					if (Math.abs(flake.pvx) < 0.01) {
						flake.pvx = 0
					}
					flake.pvy *= 0.9
					if (Math.abs(flake.pvy) < 0.01) {
						flake.pvy = 0
					}
				}
			}

			flake.x += flake.vx + this.windX + this.baseWindX + flake.pvx
			flake.y += flake.vy + this.windY + flake.pvy

			if (flake.x < 0) {
				flake.x += this.width
				flake.pvx = 0
			} else if (flake.x > this.width) {
				flake.x -= this.width
				flake.pvx = 0
			}

			if (flake.y < 0) {
				flake.y += this.height
				flake.pvx = 0
			} else if (flake.y > this.height) {
				flake.y -= this.height
				flake.pvx = 0
			}

			flake.element.style.transform = `translate(${flake.x}px, ${flake.y}px)`
		}
	}

	resize = () => {
		this.width = this.container.clientWidth
		this.height = this.container.clientHeight
	}

	start() {
		this.active = true
		while (this.flakes.length < this.config.flakesMax) {
			this.flakes.push(this.createSnowflake())
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

	useEffect(() => {
		if (!rElm.current) return
		const snowstorm = new Snowstorm(rElm.current)
		snowstorm.start()
		const velocity = new Vec(0, 0)
		const camera = Vec.From(editor.getCamera())

		const start = Date.now()

		function updateOnTick() {
			const time = Date.now() - start

			// make wind gradually cycle between 0 and 10, maybe a bit randomly, like gusts of wind
			snowstorm.baseWindX = Math.sin(time / 30000) * 1

			const newCamera = editor.getCamera()

			if (newCamera.z === camera.z) {
				const dx = newCamera.x - camera.x
				const dy = newCamera.y - camera.y

				velocity.addXY(dx / 20, dy / 20).mul(0.8)

				snowstorm.windX = velocity.x
				snowstorm.windY = velocity.y
			}

			camera.setTo(newCamera)
			snowstorm.render(editor.inputs.currentScreenPoint, editor.inputs.pointerVelocity)
		}

		editor.on('tick', updateOnTick)
		return () => {
			editor.off('tick', updateOnTick)
			snowstorm.dispose()
		}
	}, [editor])

	return <div ref={rElm} className="tl-snowstorm" />
}
