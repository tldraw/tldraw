export const PERFORMANCE_COLORS = {
	Good: '#40C057',
	Mid: '#FFC078',
	Poor: '#E03131',
}

export const PERFORMANCE_PREFIX_COLOR = PERFORMANCE_COLORS.Good

/** @internal */
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

/** @internal */
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

/** @internal */
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
