import {
	AllowlistFeatureFlag,
	FeatureFlagValue,
	PercentageFeatureFlag,
	parseAllowlistEmails,
} from '@tldraw/dotcom-shared'
import { useCallback, useEffect, useState } from 'react'
import { fetch } from 'tldraw'
import { AdminButton } from './AdminButton'
import { getResponseError, useTransientMessage } from './shared'
import styles from './admin.module.css'

const FLAG_TYPE_ORDER: FeatureFlagValue['type'][] = ['boolean', 'percentage', 'allowlist']

function flagLabel(flagName: string) {
	return flagName
		.split('_')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ')
}

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
	const [successMessage, setSuccessMessage] = useTransientMessage()

	const loadFlags = useCallback(async () => {
		setIsLoading(true)
		setError(null)
		try {
			const res = await fetch('/api/app/admin/feature-flags')
			if (!res.ok) {
				setError(await getResponseError(res))
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
			update: {
				enabled?: boolean
				percentage?: number
				emails?: string[]
				allowEveryone?: boolean
			}
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
					setError(await getResponseError(res))
					return
				}
				// Merge what the server stored, not what was sent: an allowlist save sends emails but
				// stores resolved { userId, email } entries, and the response carries them back.
				const { success: _success, flag: _flag, ...stored } = await res.json()
				setFlags((prev) => ({ ...prev, [flag]: { ...prev[flag], ...stored } }))
				if (update.percentage !== undefined && flags[flag]?.type === 'allowlist') {
					setSuccessMessage(`${flag} set to the user list plus ${update.percentage}% of users`)
				} else if (update.percentage !== undefined) {
					setSuccessMessage(
						update.percentage === 0
							? `${flag} disabled (0%)`
							: `${flag} set to ${update.percentage}% of users`
					)
				} else if (update.emails !== undefined) {
					setSuccessMessage(
						update.emails.length === 0
							? `${flag} allowlist cleared`
							: `${flag} allowed for ${update.emails.length} user(s)`
					)
				} else if (update.allowEveryone !== undefined) {
					setSuccessMessage(
						update.allowEveryone ? `${flag} set to allow all` : `${flag} set to user list`
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
		[flags, setSuccessMessage]
	)

	const renderFlag = (flagName: string, flagValue: FeatureFlagValue) => {
		const label = flagLabel(flagName)

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
					onSetAllowEveryone={(allowEveryone) => {
						if (
							!window.confirm(
								allowEveryone
									? `Open "${flagName}" to EVERY signed-in account? The list below is kept, and applies again on "User list".`
									: `Limit "${flagName}" to the user list?`
							)
						) {
							return
						}
						saveFlag(flagName, { allowEveryone })
					}}
					onSavePercentage={(pct) => {
						if (
							!window.confirm(`Set "${flagName}" to the user list plus ${pct}% of everyone else?`)
						) {
							return
						}
						saveFlag(flagName, { percentage: pct })
					}}
					onSaveEmails={(emails) => {
						if (
							!window.confirm(
								`Set "${flagName}" to these ${emails.length} address(es)? This replaces the current list.`
							)
						) {
							return
						}
						saveFlag(flagName, { emails })
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
								!window.confirm(`Are you sure you want to ${action} "${flagName}" for ALL users?`)
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
	}

	return (
		<div className={styles.fileOperation}>
			{error && (
				<div className={styles.errorMessage} role="alert">
					{error}
				</div>
			)}
			{successMessage && (
				<div className={styles.successMessage} role="status" aria-live="polite">
					{successMessage}
				</div>
			)}

			<p className={styles.featureFlagsNote}>
				<strong>Global feature toggles.</strong> Server checks pick up changes within about 90
				seconds, open tabs on their next page load after that. Some apply later still, as noted in
				their descriptions.
			</p>
			<p className={styles.featureFlagsDescription}>
				Boolean flags toggle on/off for everyone. Percentage flags roll out to X% of users
				(evaluated server-side per userId). Allowlist flags are on for the people named, which a
				percentage cannot do — it picks its own subset — plus their own percentage of everyone else,
				bucketed the same way. Their lists are edited as emails and stored as user ids.
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
						.map(([flagName, flagValue]) => renderFlag(flagName, flagValue))}
				</div>
			)}
		</div>
	)
}

// The list is edited as free text, one email address per line, rather than as a row of chips with an
// add button. It is a short hand-maintained list that is pasted into as often as it is typed into,
// and the textarea makes "replace the whole list" the obvious operation — which is what the save
// does. The addresses are resolved to user ids server-side at save time, so an address with no
// tldraw account is rejected rather than stored; matching on the request path is always by id.
function AllowlistFlag({
	flagName,
	label,
	flagValue,
	isSaving,
	onSaveEmails,
	onSavePercentage,
	onSetAllowEveryone,
}: {
	flagName: string
	label: string
	flagValue: AllowlistFeatureFlag
	isSaving: boolean
	onSaveEmails(emails: string[]): void
	onSavePercentage(percentage: number): void
	onSetAllowEveryone(allowEveryone: boolean): void
}) {
	const currentEmails = (flagValue.users ?? []).map((entry) => entry.email)
	const [text, setText] = useState(() => currentEmails.join('\n'))

	useEffect(() => {
		setText(currentEmails.join('\n'))
		// Re-synced against the saved list, not the array identity, which is new on every render.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentEmails.join('\n')])

	// The server's own parser, not a second implementation of it: this count is what the confirm
	// dialog and the success message quote, and the worker is what decides what gets stored. Splitting
	// on newlines only — as this did — reported "1 user" for a comma-separated paste the server then
	// stored as five. A malformed address surfaces here rather than as a 400 after the confirm.
	let parsed: string[] = []
	let parseError: string | null = null
	try {
		parsed = parseAllowlistEmails(text)
	} catch (err) {
		parseError = err instanceof Error ? err.message : String(err)
	}
	// Both sides normalized before comparing. `parseAllowlistEmails` lowercases, while the stored list
	// carries each address as the *database* has it — the save resolves emails to accounts and keeps
	// the account's own casing — so comparing them raw leaves Save enabled forever on any list holding
	// one mixed-case address, and confirms a replace-the-whole-list save that changes nothing.
	const isDirty = parsed.join('\n') !== currentEmails.map((email) => email.toLowerCase()).join('\n')

	return (
		// The column modifier is what keeps the textarea usable: in the base row layout it is one
		// flex item among many and shrinks to nothing beside the description.
		<div className={`${styles.featureFlagItem} ${styles.featureFlagItemColumn}`}>
			<div className={styles.featureFlagLabel}>
				<span>
					<strong>{label}</strong>
				</span>
				{/* No master toggle: an empty list already admits nobody, so an "off" beside it would be
				    a second way to say the same thing. The mode is the whole control. */}
				<div
					role="radiogroup"
					aria-label={`${label} mode`}
					style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}
				>
					<span style={{ opacity: 0.7 }}>Mode:</span>
					{(
						[
							{ value: false, label: 'User list' },
							{ value: true, label: 'Allow all' },
						] as const
					).map((mode) => (
						<label
							key={String(mode.value)}
							style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
						>
							<input
								type="radio"
								name={`${flagName}-mode`}
								checked={(flagValue.allowEveryone === true) === mode.value}
								onChange={() => onSetAllowEveryone(mode.value)}
								disabled={isSaving}
								style={{ cursor: 'pointer' }}
							/>
							<span>{mode.label}</span>
						</label>
					))}
				</div>
				<span className={flagValue.allowEveryone === true ? styles.featureFlagDisabled : ''}>
					Plus
				</span>
				<PercentageInput
					label={`${label} percentage of everyone else`}
					value={flagValue.percentage ?? 0}
					disabled={flagValue.allowEveryone === true}
					isSaving={isSaving}
					onSave={onSavePercentage}
				/>
				<span className={flagValue.allowEveryone === true ? styles.featureFlagDisabled : ''}>
					{currentEmails.length} user(s)
				</span>
				<AdminButton
					onClick={() => onSaveEmails(parsed)}
					variant="primary"
					disabled={isSaving || !isDirty || !!parseError}
				>
					Save
				</AdminButton>
			</div>
			<textarea
				value={text}
				onChange={(e) => setText(e.target.value)}
				disabled={isSaving}
				className={styles.searchInput}
				rows={4}
				// The label above is not tied to a control, so the textarea names itself.
				aria-label={`${label} allowlist, one email per line`}
				aria-invalid={!!parseError}
				placeholder={'One email per line, e.g. someone@tldraw.com'}
				// `searchInput` pins the 32px single-line height; `auto` hands control back to `rows`.
				style={{ height: 'auto', padding: '6px 8px', fontFamily: 'monospace' }}
			/>
			{parseError && (
				<span className={styles.errorMessage} role="alert">
					{parseError}
				</span>
			)}
			{/* An entry whose user id no longer resolves is a grant that looks live and matches nobody the
			    admin can see — a deleted account, or one whose address moved. Named here rather than left
			    to look like an ordinary line, since re-saving the list as displayed would 400 on it. */}
			{(flagValue.users ?? []).some((entry) => entry.missing) && (
				<span className={styles.errorMessage} role="alert">
					No account for:{' '}
					{(flagValue.users ?? [])
						.filter((entry) => entry.missing)
						.map((entry) => entry.email)
						.join(', ')}
				</span>
			)}
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
				<PercentageInput
					label={`${label} percentage`}
					value={flagValue.percentage}
					disabled={!flagValue.enabled}
					isSaving={isSaving}
					onSave={onSavePercentage}
				/>
			</div>
			{flagValue.description && (
				<span className={styles.featureFlagsDescription}>{flagValue.description}</span>
			)}
		</div>
	)
}

function PercentageInput({
	label,
	value,
	disabled,
	isSaving,
	onSave,
}: {
	label: string
	value: number
	disabled: boolean
	isSaving: boolean
	onSave(percentage: number): void
}) {
	const [pct, setPct] = useState(value)

	useEffect(() => {
		setPct(value)
	}, [value])

	return (
		<>
			<input
				type="text"
				value={pct}
				onChange={(e) => {
					const n = Number(e.target.value)
					if (!Number.isNaN(n)) setPct(Math.max(0, Math.min(100, Math.round(n))))
				}}
				disabled={isSaving || disabled}
				aria-label={label}
				className={styles.searchInput}
				style={{ width: 60, flex: 'none' }}
			/>
			<span className={disabled ? styles.featureFlagDisabled : ''}>%</span>
			<AdminButton
				onClick={() => onSave(pct)}
				variant="primary"
				disabled={isSaving || disabled || pct === value}
			>
				Save
			</AdminButton>
		</>
	)
}
