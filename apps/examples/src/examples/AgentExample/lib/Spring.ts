import { isSignal } from '@tldraw/state'
import { Atom, Signal, atom as createAtom } from '@tldraw/tldraw'

class ValueOrSignal<T> {
	#value: Atom<T | Signal<T>>
	constructor(name: string, value: T | Signal<T>) {
		this.#value = createAtom(name, value)
	}

	get() {
		const value = this.#value.get()
		return isSignal(value) ? value.get() : value
	}

	set(value: T | Signal<T>) {
		this.#value.set(value)
	}
}

function asSignal<T>(name: string, value: T | Signal<T>) {
	return new ValueOrSignal(name, value)
}

export class Spring {
	readonly #target: ValueOrSignal<number>
	readonly #tension: ValueOrSignal<number>
	readonly #friction: ValueOrSignal<number>

	readonly #value = createAtom('value', 0)
	getValue() {
		return this.#value.get()
	}
	setValue(value: number) {
		this.#value.set(value)
	}
	readonly #velocity = createAtom('velocity', 0)
	getVelocity() {
		return this.#velocity.get()
	}
	setVelocity(value: number) {
		this.#velocity.set(value)
	}

	constructor(opts: {
		target: number | Signal<number>
		tension?: number | Signal<number>
		friction?: number | Signal<number>
	}) {
		this.#target = asSignal('target', opts.target)
		this.#tension = asSignal('tension', opts.tension ?? 30)
		this.#friction = asSignal('friction', opts.friction ?? 25)
		this.setValue(this.getTarget())
	}

	getTarget() {
		return this.#target.get()
	}
	setTarget(value: number | Signal<number>) {
		this.#target.set(value)
	}

	getTension() {
		return this.#tension.get()
	}
	setTension(value: number | Signal<number>) {
		this.#tension.set(value)
	}

	getFriction() {
		return this.#friction.get()
	}
	setFriction(value: number | Signal<number>) {
		this.#friction.set(value)
	}

	lastTime = performance.now()
	tick() {
		const deltaMs = Math.min(performance.now() - this.lastTime, 500)
		const timeStep = deltaMs / 10000

		const target = this.getTarget()
		const tension = this.getTension()
		const friction = this.getFriction()
		const currentValue = this.getValue()
		const currentVelocity = this.getVelocity()

		let tempValue = currentValue
		let tempVelocity = currentVelocity

		const aVelocity = currentVelocity
		const aAcceleration = tension * (target - tempValue) - friction * currentVelocity

		tempValue = currentValue + aVelocity * timeStep * 0.5
		tempVelocity = currentVelocity + aAcceleration * timeStep * 0.5
		const bVelocity = tempVelocity
		const bAcceleration = tension * (target - tempValue) - friction * tempVelocity

		tempValue = currentValue + bVelocity * timeStep * 0.5
		tempVelocity = currentVelocity + bAcceleration * timeStep * 0.5
		const cVelocity = tempVelocity
		const cAcceleration = tension * (target - tempValue) - friction * tempVelocity

		tempValue = currentValue + cVelocity * timeStep
		tempVelocity = currentVelocity + cAcceleration * timeStep
		const dVelocity = tempVelocity
		const dAcceleration = tension * (target - tempValue) - friction * tempVelocity

		const dxdt = (1.0 / 6.0) * (aVelocity + 2.0 * (bVelocity + cVelocity) + dVelocity)
		const dvdt =
			(1.0 / 6.0) * (aAcceleration + 2.0 * (bAcceleration + cAcceleration) + dAcceleration)

		if (Math.abs(dxdt) < 0.000001) {
			this.setValue(this.getTarget())
		} else {
			this.setValue(this.getValue() + dxdt * timeStep)
		}

		if (Math.abs(dvdt) < 0.000001) {
			this.setVelocity(0)
		} else {
			this.setVelocity(this.getVelocity() + dvdt * timeStep)
		}
	}
}
