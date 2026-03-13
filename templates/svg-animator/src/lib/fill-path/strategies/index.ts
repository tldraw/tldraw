import { FillStrategy, FillStrategyType } from '../types'
import { zigzagStrategy } from './zigzag'

const strategies: Record<FillStrategyType, FillStrategy> = {
	zigzag: zigzagStrategy,
}

/** Get a fill strategy by name */
export function getStrategy(name: FillStrategyType): FillStrategy {
	const strategy = strategies[name]
	if (!strategy) {
		throw new Error(`Unknown fill strategy: ${name}`)
	}
	return strategy
}

/** Register a custom fill strategy */
export function registerStrategy(name: string, strategy: FillStrategy): void {
	;(strategies as Record<string, FillStrategy>)[name] = strategy
}

export { zigzagStrategy }
