export type STWorkerEvent =
	| {
			id: string
			workerId: string
			type: 'operation'
			operation: string
			duration: number
			error?: null | string
	  }
	| {
			id: string
			workerId: string
			type: 'error'
			error: string
	  }
export interface STCoordinatorState {
	tests: {
		[testId: string]: {
			numWorkers: number
			running: boolean
			events: STWorkerEvent[]
		}
	}
}
