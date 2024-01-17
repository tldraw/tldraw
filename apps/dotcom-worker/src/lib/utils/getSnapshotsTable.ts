import { Environment } from '../types'

export function getSnapshotsTable(env: Environment) {
	if (env.TLDRAW_ENV === 'production') {
		return 'snapshots'
	} else if (env.TLDRAW_ENV === 'staging' || env.TLDRAW_ENV === 'preview') {
		return 'snapshots_staging'
	}
	return 'snapshots_dev'
}
