import { AgentId } from '../schema/id-schemas'
import { FairyConfig } from './FairyConfig'

export interface PersistedFairyConfigs {
	[fairyId: AgentId]: FairyConfig
}
