/** @public */
export type ReadonlyStatus = 'readonly' | 'readonly-legacy' | 'non-readonly'
/** @public */
export const ReadonlyStatusToPath: Record<ReadonlyStatus, string> = {
	readonly: 'o',
	'readonly-legacy': 'v',
	'non-readonly': 'r',
}
