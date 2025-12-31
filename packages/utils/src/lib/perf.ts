/**
 * Color scheme for performance indicators.
 * Provides consistent colors for performance measurement displays.
 *
 * @public
 */
export const PERFORMANCE_COLORS = {
	Good: '#40C057',
	Mid: '#FFC078',
	Poor: '#E03131',
}

/**
 * Default color for performance measurement log prefixes.
 * Uses the 'Good' performance color for console output styling.
 *
 * @public
 */
export const PERFORMANCE_PREFIX_COLOR = PERFORMANCE_COLORS.Good

/**
 * Measures and logs the execution time of a callback function.
 * Executes the provided callback and logs the duration to the console with styled output.
 *
 * @param name - Descriptive name for the operation being measured
 * @param cb - Callback function to execute and measure
 * @returns The return value of the callback function
 *
 * @example
 * ```ts
 * const result = measureCbDuration('data processing', () => {
 *   return processLargeDataSet(data)
 * })
 * // Console output: "Perf data processing took 42.5ms"
 * ```
 *
 * @internal
 */
export function measureCbDuration(name: string, cb: () => any) {
	const start = performance.now()
	const result = cb()
	// eslint-disable-next-line no-console
	console.debug(
		`%cPerf%c ${name} took ${performance.now() - start}ms`,
		`color: white; background: ${PERFORMANCE_PREFIX_COLOR};padding: 2px;border-radius: 3px;`,
		'font-weight: normal'
	)
	return result
}

/**
 * Decorator that measures and logs the execution time of class methods.
 * Wraps the decorated method to automatically log its execution duration.
 *
 * @param _target - The class prototype (unused)
 * @param propertyKey - Name of the method being decorated
 * @param descriptor - Property descriptor of the method
 * @returns Modified property descriptor with timing measurement
 *
 * @example
 * ```ts
 * class DataProcessor {
 *   @measureDuration
 *   processData(data: unknown[]) {
 *     return data.map(item => transform(item))
 *   }
 * }
 * // When processData is called, logs: "Perf processData took: 15.2ms"
 * ```
 *
 * @internal
 */
export function measureDuration(_target: any, propertyKey: string, descriptor: PropertyDescriptor) {
	const originalMethod = descriptor.value
	descriptor.value = function (...args: any[]) {
		const start = performance.now()
		const result = originalMethod.apply(this, args)
		// eslint-disable-next-line no-console
		console.debug(
			`%cPerf%c ${propertyKey} took: ${performance.now() - start}ms`,
			`color: white; background: ${PERFORMANCE_PREFIX_COLOR};padding: 2px;border-radius: 3px;`,
			'font-weight: normal'
		)
		return result
	}
	return descriptor
}

const averages = new Map<any, { total: number; count: number }>()

/**
 * Decorator that measures method execution time and tracks running averages.
 * Wraps the decorated method to log both current execution time and running average.
 * Maintains a running total and count for each decorated method to calculate averages.
 *
 * @param _target - The class prototype (unused)
 * @param propertyKey - Name of the method being decorated
 * @param descriptor - Property descriptor of the method
 * @returns Modified property descriptor with timing measurement and averaging
 *
 * @example
 * ```ts
 * class RenderEngine {
 *   @measureAverageDuration
 *   renderFrame() {
 *     // Rendering logic here
 *   }
 * }
 * // After multiple calls, logs: "Perf renderFrame took 16.67ms | average 15.83ms"
 * ```
 *
 * @internal
 */
export function measureAverageDuration(
	_target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor
) {
	const originalMethod = descriptor.value
	descriptor.value = function (...args: any[]) {
		const start = performance.now()
		const result = originalMethod.apply(this, args)
		const end = performance.now()
		const length = end - start
		if (length !== 0) {
			const value = averages.get(descriptor.value)!
			const total = value.total + length
			const count = value.count + 1
			averages.set(descriptor.value, { total, count })
			// eslint-disable-next-line no-console
			console.debug(
				`%cPerf%c ${propertyKey} took ${(end - start).toFixed(2)}ms | average ${(total / count).toFixed(2)}ms`,
				`color: white; background: ${PERFORMANCE_PREFIX_COLOR};padding: 2px;border-radius: 3px;`,
				'font-weight: normal'
			)
		}
		return result
	}
	averages.set(descriptor.value, { total: 0, count: 0 })
	return descriptor
}
