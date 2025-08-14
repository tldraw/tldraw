import { ArraySet } from './ArraySet'
import { startCapturingParents, stopCapturingParents } from './capture'
import { GLOBAL_START_EPOCH } from './constants'
import { attach, detach, haveParentsChanged, singleton } from './helpers'
import { getGlobalEpoch } from './transactions'
import { Signal } from './types'

/** @public */
export interface EffectSchedulerOptions {
	/**
	 * scheduleEffect is a function that will be called when the effect is scheduled.
	 *
	 * It can be used to defer running effects until a later time, for example to batch them together with requestAnimationFrame.
	 *
	 *
	 * @example
	 * ```ts
	 * let isRafScheduled = false
	 * const scheduledEffects: Array<() => void> = []
	 * const scheduleEffect = (runEffect: () => void) => {
	 * 	scheduledEffects.push(runEffect)
	 * 	if (!isRafScheduled) {
	 * 		isRafScheduled = true
	 * 		requestAnimationFrame(() => {
	 * 			isRafScheduled = false
	 * 			scheduledEffects.forEach((runEffect) => runEffect())
	 * 			scheduledEffects.length = 0
	 * 		})
	 * 	}
	 * }
	 * const stop = react('set page title', () => {
	 * 	document.title = doc.title,
	 * }, scheduleEffect)
	 * ```
	 *
	 * @param execute - A function that will execute the effect.
	 * @returns void
	 */
	// eslint-disable-next-line @typescript-eslint/method-signature-style
	scheduleEffect?: (execute: () => void) => void
}

class __EffectScheduler__<Result> implements EffectScheduler<Result> {
	/** @internal */
	private _isActivelyListening = false
	/**
	 * Whether this scheduler is attached and actively listening to its parents.
	 * @public
	 */
	// eslint-disable-next-line no-restricted-syntax
	get isActivelyListening() {
		return this._isActivelyListening
	}
	/** @internal */
	lastTraversedEpoch = GLOBAL_START_EPOCH

	/** @internal */
	private lastReactedEpoch = GLOBAL_START_EPOCH

	/** @internal */
	private _scheduleCount = 0
	/** @internal */
	__debug_ancestor_epochs__: Map<Signal<any, any>, number> | null = null

	/**
	 * The number of times this effect has been scheduled.
	 * @public
	 */
	// eslint-disable-next-line no-restricted-syntax
	get scheduleCount() {
		return this._scheduleCount
	}

	/** @internal */
	readonly parentSet = new ArraySet<Signal<any, any>>()
	/** @internal */
	readonly parentEpochs: number[] = []
	/** @internal */
	readonly parents: Signal<any, any>[] = []
	/** @internal */
	private readonly _scheduleEffect?: (execute: () => void) => void
	constructor(
		public readonly name: string,
		private readonly runEffect: (lastReactedEpoch: number) => Result,
		options?: EffectSchedulerOptions
	) {
		this._scheduleEffect = options?.scheduleEffect
	}

	/** @internal */
	maybeScheduleEffect() {
		// bail out if we have been cancelled by another effect
		if (!this._isActivelyListening) return
		// bail out if no atoms have changed since the last time we ran this effect
		if (this.lastReactedEpoch === getGlobalEpoch()) return

		// bail out if we have parents and they have not changed since last time
		if (this.parents.length && !haveParentsChanged(this)) {
			this.lastReactedEpoch = getGlobalEpoch()
			return
		}
		// if we don't have parents it's probably the first time this is running.
		this.scheduleEffect()
	}

	/** @internal */
	scheduleEffect() {
		this._scheduleCount++
		if (this._scheduleEffect) {
			// if the effect should be deferred (e.g. until a react render), do so
			this._scheduleEffect(this.maybeExecute)
		} else {
			// otherwise execute right now!
			this.execute()
		}
	}

	/** @internal */
	// eslint-disable-next-line local/prefer-class-methods
	readonly maybeExecute = () => {
		// bail out if we have been detached before this runs
		if (!this._isActivelyListening) return
		this.execute()
	}

	/**
	 * Makes this scheduler become 'actively listening' to its parents.
	 * If it has been executed before it will immediately become eligible to receive 'maybeScheduleEffect' calls.
	 * If it has not executed before it will need to be manually executed once to become eligible for scheduling, i.e. by calling `EffectScheduler.execute`.
	 * @public
	 */
	attach() {
		this._isActivelyListening = true
		for (let i = 0, n = this.parents.length; i < n; i++) {
			attach(this.parents[i], this)
		}
	}

	/**
	 * Makes this scheduler stop 'actively listening' to its parents.
	 * It will no longer be eligible to receive 'maybeScheduleEffect' calls until `EffectScheduler.attach` is called again.
	 * @public
	 */
	detach() {
		this._isActivelyListening = false
		for (let i = 0, n = this.parents.length; i < n; i++) {
			detach(this.parents[i], this)
		}
	}

	/**
	 * Executes the effect immediately and returns the result.
	 * @returns The result of the effect.
	 * @public
	 */
	execute(): Result {
		try {
			startCapturingParents(this)
			// Important! We have to make a note of the current epoch before running the effect.
			// We allow atoms to be updated during effects, which increments the global epoch,
			// so if we were to wait until after the effect runs, the this.lastReactedEpoch value might get ahead of itself.
			const currentEpoch = getGlobalEpoch()
			const result = this.runEffect(this.lastReactedEpoch)
			this.lastReactedEpoch = currentEpoch
			return result
		} finally {
			stopCapturingParents()
		}
	}
}

/**
 * An EffectScheduler is responsible for executing side effects in response to changes in state.
 *
 * You probably don't need to use this directly unless you're integrating this library with a framework of some kind.
 *
 * Instead, use the {@link react} and {@link reactor} functions.
 *
 * @example
 * ```ts
 * const render = new EffectScheduler('render', drawToCanvas)
 *
 * render.attach()
 * render.execute()
 * ```
 *
 * @public
 */
export const EffectScheduler = singleton(
	'EffectScheduler',
	(): {
		new <Result>(
			name: string,
			runEffect: (lastReactedEpoch: number) => Result,
			options?: EffectSchedulerOptions
		): EffectScheduler<Result>
	} => __EffectScheduler__
)
/** @public */
export interface EffectScheduler<Result> {
	/**
	 * Whether this scheduler is attached and actively listening to its parents.
	 * @public
	 */
	readonly isActivelyListening: boolean

	/** @internal */
	readonly lastTraversedEpoch: number

	/** @public */
	readonly name: string

	/** @internal */
	__debug_ancestor_epochs__: Map<Signal<any, any>, number> | null

	/**
	 * The number of times this effect has been scheduled.
	 * @public
	 */
	readonly scheduleCount: number

	/** @internal */
	readonly parentSet: ArraySet<Signal<any, any>>

	/** @internal */
	readonly parentEpochs: number[]

	/** @internal */
	readonly parents: Signal<any, any>[]

	/** @internal */
	maybeScheduleEffect(): void

	/** @internal */
	scheduleEffect(): void

	/** @internal */
	maybeExecute(): void

	/**
	 * Makes this scheduler become 'actively listening' to its parents.
	 * If it has been executed before it will immediately become eligible to receive 'maybeScheduleEffect' calls.
	 * If it has not executed before it will need to be manually executed once to become eligible for scheduling, i.e. by calling `EffectScheduler.execute`.
	 * @public
	 */
	attach(): void

	/**
	 * Makes this scheduler stop 'actively listening' to its parents.
	 * It will no longer be eligible to receive 'maybeScheduleEffect' calls until `EffectScheduler.attach` is called again.
	 * @public
	 */
	detach(): void

	/**
	 * Executes the effect immediately and returns the result.
	 * @returns The result of the effect.
	 * @public
	 */
	execute(): Result
}

/**
 * Starts a new effect scheduler, scheduling the effect immediately.
 *
 * Returns a function that can be called to stop the scheduler.
 *
 * @example
 * ```ts
 * const color = atom('color', 'red')
 * const stop = react('set style', () => {
 *   divElem.style.color = color.get()
 * })
 * color.set('blue')
 * // divElem.style.color === 'blue'
 * stop()
 * color.set('green')
 * // divElem.style.color === 'blue'
 * ```
 *
 *
 * Also useful in React applications for running effects outside of the render cycle.
 *
 * @example
 * ```ts
 * useEffect(() => react('set style', () => {
 *   divRef.current.style.color = color.get()
 * }), [])
 * ```
 *
 * @public
 */
export function react(
	name: string,
	fn: (lastReactedEpoch: number) => any,
	options?: EffectSchedulerOptions
) {
	const scheduler = new EffectScheduler(name, fn, options)
	scheduler.attach()
	scheduler.scheduleEffect()
	return () => {
		scheduler.detach()
	}
}

/**
 * The reactor is a user-friendly interface for starting and stopping an `EffectScheduler`.
 *
 * Calling `.start()` will attach the scheduler and execute the effect immediately the first time it is called.
 *
 * If the reactor is stopped, calling `.start()` will re-attach the scheduler but will only execute the effect if any of its parents have changed since it was stopped.
 *
 * You can create a reactor with {@link reactor}.
 * @public
 */
export interface Reactor<T = unknown> {
	/**
	 * The underlying effect scheduler.
	 * @public
	 */
	scheduler: EffectScheduler<T>
	/**
	 * Start the scheduler. The first time this is called the effect will be scheduled immediately.
	 *
	 * If the reactor is stopped, calling this will start the scheduler again but will only execute the effect if any of its parents have changed since it was stopped.
	 *
	 * If you need to force re-execution of the effect, pass `{ force: true }`.
	 * @public
	 */
	start(options?: { force?: boolean }): void
	/**
	 * Stop the scheduler.
	 * @public
	 */
	stop(): void
}

/**
 * Creates a {@link Reactor}, which is a thin wrapper around an `EffectScheduler`.
 *
 * @public
 */
export function reactor<Result>(
	name: string,
	fn: (lastReactedEpoch: number) => Result,
	options?: EffectSchedulerOptions
): Reactor<Result> {
	const scheduler = new EffectScheduler<Result>(name, fn, options)
	return {
		scheduler,
		start: (options?: { force?: boolean }) => {
			const force = options?.force ?? false
			scheduler.attach()
			if (force) {
				scheduler.scheduleEffect()
			} else {
				scheduler.maybeScheduleEffect()
			}
		},
		stop: () => {
			scheduler.detach()
		},
	}
}
