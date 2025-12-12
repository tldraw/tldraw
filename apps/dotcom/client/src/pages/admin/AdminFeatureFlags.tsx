import { FeatureFlagValue } from '@tldraw/dotcom-shared'
import { useCallback, useEffect, useState } from 'react'
import { fetch } from 'tldraw'
import styles from '../admin.module.css'

export function AdminFeatureFlags() {
	const [flags, setFlags] = useState<Record<string, FeatureFlagValue>>({})
	const [isLoading, setIsLoading] = useState(true)
	const [isSaving, setIsSaving] = useState(false)
	const [error, setError] = useState(null as string | null)
	const [successMessage, setSuccessMessage] = useState(null as string | null)

	const loadFlags = useCallback(async () => {
		setIsLoading(true)
		setError(null)
		try {
			const res = await fetch('/api/app/admin/feature-flags')
			if (!res.ok) {
				setError(res.statusText + ': ' + (await res.text()))
				return
			}
			const data = await res.json()
			setFlags(data)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load flags')
		} finally {
			setIsLoading(false)
		}
	}, [])

	useEffect(() => {
		loadFlags()
	}, [loadFlags])

	const toggleFlag = useCallback(async (flag: string, enabled: boolean) => {
		const action = enabled ? 'enable' : 'disable'
		if (!window.confirm(`Are you sure you want to ${action} "${flag}" for ALL users?`)) {
			return
		}

		setIsSaving(true)
		setError(null)
		setSuccessMessage(null)
		try {
			const res = await fetch('/api/app/admin/feature-flags', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ flag, enabled }),
			})
			if (!res.ok) {
				setError(res.statusText + ': ' + (await res.text()))
				return
			}
			setFlags((prev) => ({ ...prev, [flag]: { ...prev[flag], enabled } }))
			setSuccessMessage(`${flag} ${enabled ? 'enabled' : 'disabled'}`)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to update flag')
		} finally {
			setIsSaving(false)
		}
	}, [])

	useEffect(() => {
		if (successMessage) {
			const timer = setTimeout(() => setSuccessMessage(null), 3000)
			return () => clearTimeout(timer)
		}
	}, [successMessage])

	return (
		<div className={styles.fileOperation}>
			{error && <div className={styles.errorMessage}>{error}</div>}
			{successMessage && <div className={styles.successMessage}>{successMessage}</div>}

			<p className={`tla-text_ui__small ${styles.featureFlagsNote}`}>
				<strong>Global feature toggles.</strong> Changes take effect immediately for ALL users.
			</p>
			<p className={`tla-text_ui__small ${styles.featureFlagsDescription}`}>
				Unchecking these flags will completely disable the feature for everyone, regardless of their
				individual access settings.
			</p>

			{isLoading ? (
				<p className="tla-text_ui__small">Loading flags...</p>
			) : (
				<div className={styles.featureFlagsContainer}>
					{Object.entries(flags)
						.sort(([a], [b]) => a.localeCompare(b))
						.map(([flagName, flagValue]) => {
							const label = flagName
								.split('_')
								.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
								.join(' ')
							return (
								<div key={flagName} className={styles.featureFlagItem}>
									<label htmlFor={flagName} className={styles.featureFlagLabel}>
										<input
											id={flagName}
											type="checkbox"
											checked={flagValue.enabled}
											onChange={(e) => toggleFlag(flagName, e.target.checked)}
											disabled={isSaving}
										/>
										<span className="tla-text_ui__small">
											<strong>{label}</strong>
										</span>
									</label>
									{flagValue.description && (
										<span className={`tla-text_ui__small ${styles.featureFlagsDescription}`}>
											{flagValue.description}
										</span>
									)}
								</div>
							)
						})}
				</div>
			)}
		</div>
	)
}
