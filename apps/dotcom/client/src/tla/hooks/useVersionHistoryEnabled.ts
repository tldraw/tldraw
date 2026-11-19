import { useTldrawCurrentUser } from './useUser'

/** History is for signed-in editors; callers still check edit access per file. */
export function useVersionHistoryEnabled(): boolean {
	return !!useTldrawCurrentUser()
}
