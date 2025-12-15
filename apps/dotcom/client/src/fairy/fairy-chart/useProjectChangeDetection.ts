/**
 * Custom hook for detecting project changes and clearing chart data
 *
 * Handles the complex logic of tracking project ID changes and
 * clearing velocity/chart data when projects change or end.
 */

import { useEffect, useRef } from 'react'
import type { FairyApp } from '../fairy-app/FairyApp'

interface Project {
	id: string
}

/**
 * Detect when the project changes and clear associated data
 *
 * @param project - Current project (null if no active project)
 * @param fairyApp - Fairy app instance for accessing velocity tracker
 * @param onProjectChange - Optional callback when project changes
 */
export function useProjectChangeDetection(
	project: Project | null,
	fairyApp: FairyApp | null,
	onProjectChange?: () => void
): void {
	const lastProjectIdRef = useRef<string | null>(null)
	const hasInitializedRef = useRef(false)

	useEffect(() => {
		const currentProjectId = project?.id ?? null
		const previousProjectId = lastProjectIdRef.current

		// Clear data if project ID changed (including null ↔ ID transitions)
		// But skip on first mount (when hasInitializedRef is false) to preserve data on dialog reopen
		if (hasInitializedRef.current && previousProjectId !== currentProjectId) {
			// Clear velocity data when project ends or changes
			if (fairyApp?.velocityTracker) {
				fairyApp.velocityTracker.clearData()
			}

			// Call custom handler if provided
			if (onProjectChange) {
				onProjectChange()
			}
		}

		// Mark as initialized and update ref to current project ID
		hasInitializedRef.current = true
		lastProjectIdRef.current = currentProjectId
	}, [project?.id, fairyApp, onProjectChange])
}
