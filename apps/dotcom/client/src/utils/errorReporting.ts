let globalErrorReporter: (error: unknown) => void = () => {
	// noop
}

export function setGlobalErrorReporter(reporter: (error: unknown) => void) {
	globalErrorReporter = reporter
}

export function reportError(error: unknown) {
	globalErrorReporter(error)
}
