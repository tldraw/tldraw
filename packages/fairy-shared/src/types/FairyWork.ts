import { FairyProject } from './FairyProject'
import { FairyTask } from './FairyTask'

/**
 * A unit of work that a fairy agent might have on their desk.
 */
export interface FairyWork {
	/** The project that the fairy agent is working on. */
	project: FairyProject | null
	/** The tasks that the fairy agent is working on. */
	tasks: FairyTask[]
}
