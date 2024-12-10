import { STCoordinatorDO } from './STCoordinatorDO'
import { STWorkerDO } from './STWorkerDO'

export interface Environment {
	ST_WORKER: DurableObjectNamespace<STWorkerDO>
	ST_COORDINATOR: DurableObjectNamespace<STCoordinatorDO>
	// used to access the dashboard
	ACCESS_TOKEN: string
	// used to create users on the fly
	TEST_AUTH_SECRET: string
}
