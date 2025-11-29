import {
	type BaseRecord,
	createRecordMigrationSequence,
	createRecordType,
	idValidator,
	type RecordId,
	T,
} from 'tldraw'
import {
	FaeFairyConfig,
	FaeFairyConfigValidator,
	FaeFairyDebugFlagsValidator,
	FaeFairyEntity,
	FaeFairyEntityValidator,
	FaeFairyMode,
	faeFairyModeValidator,
} from './fae-validators'

/**
 * Represents the persistent state of a fairy agent.
 * Stores both the fairy entity data and agent-specific configuration.
 */
export interface FaeRecord extends BaseRecord<'fairy', FaeId> {
	/** The fairy entity (position, pose, gesture, etc.) */
	entity: FaeFairyEntity
	/** The fairy's configuration (name, model, etc.) */
	config: FaeFairyConfig
	/** Conditions this fairy is currently waiting for (NEEDS TO BE SERIALIZABLE)*/
	// waitingFor: FaeWaitCondition[]
	/** The current mode of the fairy */
	mode: FaeFairyMode
	/** Debug flags for this fairy */
	debugFlags: {
		logSystemPrompt: boolean
		logMessages: boolean
		logResponseTime: boolean
	}
	/** Whether the fairy uses one-shotting mode */
	useOneShottingMode: boolean
	/** Tasks assigned to this fairy */
	assignedTasks: string[] // FaeTask IDs
	/** Projects this fairy is working on */
	assignedProjects: string[] // FaeProject IDs
}

export type FaeId = RecordId<FaeRecord>

const FaeValidator = T.object<FaeRecord>({
	id: idValidator<FaeId>('fairy'),
	typeName: T.literal('fairy'),
	entity: FaeFairyEntityValidator,
	config: FaeFairyConfigValidator,
	mode: faeFairyModeValidator,
	debugFlags: FaeFairyDebugFlagsValidator,
	useOneShottingMode: T.boolean,
	assignedTasks: T.arrayOf(T.string),
	assignedProjects: T.arrayOf(T.string),
})

export const faeMigrations = createRecordMigrationSequence({
	sequenceId: 'com.tldraw.fairy',
	recordType: 'fairy',
	sequence: [],
})

export const faeRecordType = createRecordType<FaeRecord>('fairy', {
	validator: FaeValidator,
	scope: 'document',
})
