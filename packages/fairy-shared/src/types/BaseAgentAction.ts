/**
 * This type represents the bare minimum properties that all agent actions must have.
 */
export interface BaseAgentAction<T extends string = string> {
	_type: T
}
