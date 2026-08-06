import {
	AllowlistFeatureFlag,
	FeatureFlagValue,
	FriendsAndFamilyEntry,
	PercentageFeatureFlag,
} from '@tldraw/dotcom-shared'
import { useCallback, useEffect, useRef, useState } from 'react'
import { fetch } from 'tldraw'
import { AdminButton } from './AdminButton'
import styles from './admin.module.css'

const FLAG_TYPE_ORDER: FeatureFlagValue['type'][] = ['boolean', 'percentage', 'allowlist']

export function FlagsSection() {
	return (
		<>
			<section className={styles.adminSection}>
				<h3 className={styles.sectionTitle}>Feature flags</h3>
				<FeatureFlags />
			</section>
			<section className={styles.adminSection}>
				<h3 className={styles.sectionTitle}>MCP friends and family</h3>
				<McpFriendsAndFamily />
			</section>
		</>
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
		async (
			flag: string,
			update: { enabled?: boolean; percentage?: number; userIds?: string[] }
		) => {
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
				} else if (update.userIds !== undefined) {
					setSuccessMessage(
						update.userIds.length === 0
							? `${flag} allowlist cleared`
							: `${flag} allowed for ${update.userIds.length} user(s)`
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
				(evaluated server-side per userId). Allowlist flags are on only for the user ids named,
				which is the one thing a percentage cannot do — it picks its own subset.
			</p>

			{isLoading ? (
				<p>Loading flags...</p>
			) : (
				<div className={styles.featureFlagsContainer}>
					{Object.entries(flags)
						.sort(([a], [b]) => {
							// Grouped by type — boolean, then percentage, then allowlist — and alphabetical
							// within a group. Ranked rather than compared pairwise so the ordering stays a
							// total one as types are added.
							const rank = (name: string) => FLAG_TYPE_ORDER.indexOf(flags[name].type ?? 'boolean')
							return rank(a) - rank(b) || a.localeCompare(b)
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

							if (flagValue.type === 'allowlist') {
								return (
									<AllowlistFlag
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
										onSaveUserIds={(userIds) => {
											if (
												!window.confirm(
													`Set "${flagName}" to these ${userIds.length} user id(s)? This replaces the current list.`
												)
											) {
												return
											}
											saveFlag(flagName, { userIds })
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

// The list is edited as free text, one user id per line, rather than as a row of chips with an add
// button. It is a short hand-maintained list that is pasted into as often as it is typed into, and
// the textarea makes "replace the whole list" the obvious operation — which is what the save does.
function AllowlistFlag({
	flagName,
	label,
	flagValue,
	isSaving,
	onToggle,
	onSaveUserIds,
}: {
	flagName: string
	label: string
	flagValue: AllowlistFeatureFlag
	isSaving: boolean
	onToggle(enabled: boolean): void
	onSaveUserIds(userIds: string[]): void
}) {
	const currentUserIds = flagValue.userIds ?? []
	const [text, setText] = useState(() => currentUserIds.join('\n'))

	useEffect(() => {
		setText(currentUserIds.join('\n'))
		// Re-synced against the saved list, not the array identity, which is new on every render.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentUserIds.join('\n')])

	const parsed = text
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean)
	const isDirty = parsed.join('\n') !== currentUserIds.join('\n')

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
				<span className={!flagValue.enabled ? styles.featureFlagDisabled : ''}>
					{currentUserIds.length} user(s)
				</span>
				<AdminButton
					onClick={() => onSaveUserIds(parsed)}
					variant="primary"
					disabled={isSaving || !flagValue.enabled || !isDirty}
				>
					Save
				</AdminButton>
			</div>
			<textarea
				value={text}
				onChange={(e) => setText(e.target.value)}
				disabled={isSaving || !flagValue.enabled}
				className={styles.searchInput}
				rows={4}
				placeholder="One user id per line, e.g. user_2abc…"
				style={{ width: '100%', fontFamily: 'monospace' }}
			/>
			{flagValue.description && (
				<span className={styles.featureFlagsDescription}>{flagValue.description}</span>
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

function emailsOf(entries: FriendsAndFamilyEntry[]) {
	return entries.map((entry) => entry.email).join('\n')
}

function McpFriendsAndFamily() {
	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const [entries, setEntries] = useState([] as FriendsAndFamilyEntry[])
	const [isLoading, setIsLoading] = useState(true)
	const [isSaving, setIsSaving] = useState(false)
	const [error, setError] = useState(null as string | null)
	const [successMessage, setSuccessMessage] = useState(null as string | null)

	const load = useCallback(async () => {
		setIsLoading(true)
		setError(null)
		try {
			const res = await fetch('/api/app/admin/mcp-friends-and-family')
			if (!res.ok) {
				setError(res.statusText + ': ' + (await res.text()))
				return
			}
			const data = (await res.json()) as { entries: FriendsAndFamilyEntry[] }
			setEntries(data.entries)
			// The stored entries are user IDs; the box edits the emails they were resolved from. Only
			// seed it on load, never on save — overwriting it mid-edit would discard what was typed.
			if (textareaRef.current) textareaRef.current.value = emailsOf(data.entries)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load the friends and family list')
		} finally {
			setIsLoading(false)
		}
	}, [])

	useEffect(() => {
		load()
	}, [load])

	const onSave = useCallback(async () => {
		const value = textareaRef.current?.value ?? ''
		if (!window.confirm('Replace the MCP friends and family list with what is in the box?')) return

		setError(null)
		setSuccessMessage(null)
		setIsSaving(true)
		try {
			const res = await fetch('/api/app/admin/mcp-friends-and-family', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ entries: value }),
			})
			if (!res.ok) {
				setError(res.statusText + ': ' + (await res.text()))
				return
			}
			const data = (await res.json()) as { entries: FriendsAndFamilyEntry[] }
			setEntries(data.entries)
			// Reflect back the addresses as the accounts actually have them, so the box matches what
			// was stored rather than what was typed.
			if (textareaRef.current) textareaRef.current.value = emailsOf(data.entries)
			setSuccessMessage(`Saved ${data.entries.length} entries`)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to save the friends and family list')
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
			<p className={styles.featureFlagsDescription}>
				Who will get the raised rate limits on the MCP screenshot server. One email address per
				line. Each must belong to an existing tldraw account — saving resolves them to user IDs, so
				an address with no account is rejected rather than stored.
			</p>
			{error && <div className={styles.errorMessage}>{error}</div>}
			{successMessage && <div className={styles.successMessage}>{successMessage}</div>}
			<div className={styles.summaryItem}>
				<span className={styles.fieldLabel}>Current:</span>
				<span className={styles.fieldValue}>
					{isLoading ? 'Loading…' : entries.length ? `${entries.length} entries` : 'empty — nobody'}
				</span>
			</div>
			<textarea
				ref={textareaRef}
				rows={6}
				spellCheck={false}
				placeholder={'someone@tldraw.com\nfriend@example.com'}
				className={styles.searchInput}
				disabled={isLoading || isSaving}
			/>
			<div className={styles.searchContainer}>
				<AdminButton onClick={onSave} variant="primary" disabled={isLoading || isSaving}>
					Save list
				</AdminButton>
				<AdminButton onClick={load} variant="secondary" disabled={isLoading || isSaving}>
					Reset
				</AdminButton>
			</div>
		</div>
	)
}
