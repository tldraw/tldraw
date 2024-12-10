export interface STCoordinatorState {
	tests: {
		[testId: string]: {
			running: boolean
		}
	}
}
