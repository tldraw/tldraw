import { useEffect, useRef } from 'react'
import { Vec, useEditor } from 'tldraw'

/* eslint-disable local/prefer-class-methods */
interface Snowflake {
	element: HTMLElement
	x: number
	y: number
	vx: number
	vy: number
	size: number
	opacity: number
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
	private wind = 0
	windX = 0
	windY = 0
	offsetX = 0
	offsetY = 0

	// Configuration options
	private readonly config = {
		autoStart: true,
		flakesMax: 128,
		flakesMaxActive: 64,
		animationInterval: 30,
		snowColor: '#ccc',
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
		const element = document.createElement('div')
		element.style.position = 'absolute'
		element.style.width = `${size}px`
		element.style.height = `${size}px`
		element.style.backgroundColor = this.config.snowColor
		element.style.borderRadius = '50%'
		element.style.opacity = `${rnd(0.5, 1)}`
		element.style.pointerEvents = 'none'

		this.container.appendChild(element)

		return {
			element,
			x: rnd(0, this.width),
			y: rnd(-this.height, 0),
			vx: rnd(-this.config.windMax, this.config.windMax),
			vy: rnd(1, 3),
			size,
			opacity: parseFloat(element.style.opacity),
		}
	}

	private updateSnowflake(flake: Snowflake) {
		flake.x += flake.vx + this.windX
		flake.y += flake.vy + this.windY

		if (flake.x < 0) {
			flake.x += this.width
		} else if (flake.x > this.width) {
			flake.x -= this.width
		}

		if (flake.y < 0) {
			flake.y += this.height
		} else if (flake.y > this.height) {
			flake.y -= this.height
		}

		flake.element.style.transform = `translate(${flake.x}px, ${flake.y}px)`
	}

	// Main render loop
	render = () => {
		if (!this.active) return

		let activeFlakes = 0
		for (const flake of this.flakes) {
			this.updateSnowflake(flake)
			activeFlakes++
			if (activeFlakes >= this.config.flakesMaxActive) break
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

		function updateOnTick() {
			const newCamera = Vec.From(editor.getCamera())
			if (newCamera.z === camera.z) {
				const dx = newCamera.x - camera.x
				const dy = newCamera.y - camera.y

				velocity.addXY(dx / 20, dy / 20).mul(0.8)

				snowstorm.windX = velocity.x
				snowstorm.windY = velocity.y
			}

			camera.setTo(newCamera)
			snowstorm.render()
		}

		editor.on('tick', updateOnTick)
		return () => {
			editor.off('tick', updateOnTick)
			snowstorm.dispose()
		}
	}, [editor])

	return (
		<div
			ref={rElm}
			style={{
				position: 'absolute',
				width: '100%',
				height: '100%',
				zIndex: 99999999,
				pointerEvents: 'none',
				transform: 'translateZ(0)',
			}}
		/>
	)
}
