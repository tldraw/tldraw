interface ErrorAnnotations {
	tags: Record<string, number | string | boolean | bigint | symbol | null | undefined>
	extras: Record<string, unknown>
}

const annotationsByError = new WeakMap<object, ErrorAnnotations>()

/**
 * Annotate an error with tags and additional data. Annotations won't overwrite existing ones.
 * Retrieve them with `getErrorAnnotations`.
 *
 * @internal
 */
export function annotateError(error: unknown, annotations: Partial<ErrorAnnotations>) {
	if (typeof error !== 'object' || error === null) return

	let currentAnnotations = annotationsByError.get(error)
	if (!currentAnnotations) {
		currentAnnotations = { tags: {}, extras: {} }
		annotationsByError.set(error, currentAnnotations)
	}

	if (annotations.tags) {
		currentAnnotations.tags = {
			...currentAnnotations.tags,
			...annotations.tags,
		}
	}
	if (annotations.extras) {
		currentAnnotations.extras = {
			...currentAnnotations.extras,
			...annotations.extras,
		}
	}
}

/** @internal */
export function getErrorAnnotations(error: Error): ErrorAnnotations {
	return annotationsByError.get(error) ?? { tags: {}, extras: {} }
}
