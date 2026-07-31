import { FeatureFlagValue, PercentageFeatureFlag } from '@tldraw/dotcom-shared'
import { useCallback, useEffect, useState } from 'react'
import { fetch } from 'tldraw'
import { AdminButton } from './AdminButton'
import styles from './admin.module.css'

export function FlagsSection() {
	return (
		<section className={styles.adminSection}>
			<h3 className={styles.sectionTitle}>Feature flags</h3>
			<FeatureFlags />
		</section>
	)
}

function FeatureFlags() {
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

	const saveFlag = useCallback(
		async (flag: string, update: { enabled?: boolean; percentage?: number }) => {
			setIsSaving(true)
			setError(null)
			setSuccessMessage(null)
			try {
				const res = await fetch('/api/app/admin/feature-flags', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ flag, ...update }),
				})
				if (!res.ok) {
					setError(res.statusText + ': ' + (await res.text()))
					return
				}
				setFlags((prev) => ({ ...prev, [flag]: { ...prev[flag], ...update } }))
				if (update.percentage !== undefined) {
					setSuccessMessage(
						update.percentage === 0
							? `${flag} disabled (0%)`
							: `${flag} set to ${update.percentage}% of users`
					)
				} else {
					setSuccessMessage(`${flag} ${update.enabled ? 'enabled' : 'disabled'}`)
				}
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to update flag')
			} finally {
				setIsSaving(false)
			}
		},
		[]
	)

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

			<p className={styles.featureFlagsNote}>
				<strong>Global feature toggles.</strong> Changes take effect immediately for ALL users.
			</p>
			<p className={styles.featureFlagsDescription}>
				Boolean flags toggle on/off for everyone. Percentage flags roll out to X% of users
				(evaluated server-side per userId).
			</p>

			{isLoading ? (
				<p>Loading flags...</p>
			) : (
				<div className={styles.featureFlagsContainer}>
					{Object.entries(flags)
						.sort(([a], [b]) => {
							// boolean flags first, then percentage flags
							const aType = flags[a].type ?? 'boolean'
							const bType = flags[b].type ?? 'boolean'
							if (aType !== bType) return aType === 'boolean' ? -1 : 1
							return a.localeCompare(b)
						})
						.map(([flagName, flagValue]) => {
							const label = flagName
								.split('_')
								.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
								.join(' ')

							if (flagValue.type === 'percentage') {
								return (
									<PercentageFlag
										key={flagName}
										flagName={flagName}
										label={label}
										flagValue={flagValue}
										isSaving={isSaving}
										onToggle={(enabled) => {
											const action = enabled ? 'Enable' : 'Disable'
											if (!window.confirm(`${action} "${flagName}"?`)) return
											saveFlag(flagName, { enabled })
										}}
										onSavePercentage={(pct) => {
											if (!window.confirm(`Set "${flagName}" to ${pct}% of users?`)) return
											saveFlag(flagName, { percentage: pct })
										}}
									/>
								)
							}

							return (
								<div key={flagName} className={styles.featureFlagItem}>
									<label htmlFor={flagName} className={styles.featureFlagLabel}>
										<input
											id={flagName}
											type="checkbox"
											checked={flagValue.enabled}
											onChange={(e) => {
												const enabled = e.target.checked
												const action = enabled ? 'enable' : 'disable'
												if (
													!window.confirm(
														`Are you sure you want to ${action} "${flagName}" for ALL users?`
													)
												) {
													return
												}
												saveFlag(flagName, { enabled })
											}}
											disabled={isSaving}
										/>
										<span>
											<strong>{label}</strong>
										</span>
									</label>
									{flagValue.description && (
										<span className={styles.featureFlagsDescription}>{flagValue.description}</span>
									)}
								</div>
							)
						})}
				</div>
			)}
		</div>
	)
}

function PercentageFlag({
	flagName,
	label,
	flagValue,
	isSaving,
	onToggle,
	onSavePercentage,
}: {
	flagName: string
	label: string
	flagValue: PercentageFeatureFlag
	isSaving: boolean
	onToggle(enabled: boolean): void
	onSavePercentage(percentage: number): void
}) {
	const currentPct = flagValue.percentage
	const [pct, setPct] = useState(currentPct)

	useEffect(() => {
		setPct(currentPct)
	}, [currentPct])

	return (
		<div className={styles.featureFlagItem}>
			<div className={styles.featureFlagLabel}>
				<label
					htmlFor={flagName}
					style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
				>
					<input
						id={flagName}
						type="checkbox"
						checked={flagValue.enabled}
						onChange={(e) => onToggle(e.target.checked)}
						disabled={isSaving}
						style={{ cursor: 'pointer' }}
					/>
					<span>
						<strong>{label}</strong>
					</span>
				</label>
				<input
					type="text"
					value={pct}
					onChange={(e) => {
						const n = Number(e.target.value)
						if (!Number.isNaN(n)) setPct(Math.max(0, Math.min(100, n)))
					}}
					disabled={isSaving || !flagValue.enabled}
					className={styles.searchInput}
					style={{ width: 60 }}
				/>
				<span className={!flagValue.enabled ? styles.featureFlagDisabled : ''}>%</span>
				<AdminButton
					onClick={() => onSavePercentage(pct)}
					variant="primary"
					disabled={isSaving || !flagValue.enabled || pct === currentPct}
				>
					Save
				</AdminButton>
			</div>
			{flagValue.description && (
				<span className={styles.featureFlagsDescription}>{flagValue.description}</span>
			)}
		</div>
	)
}
