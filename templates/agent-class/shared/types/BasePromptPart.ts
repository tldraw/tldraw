/**
 * This type represents the bare minimum properties that all prompt parts must have.
 */
export interface BasePromptPart<T extends string = string> {
	type: T
}
