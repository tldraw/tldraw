import { MAX_FAIRY_COUNT } from '@tldraw/dotcom-shared'
import { useCallback, useEffect, useState } from 'react'
import { fetch, useValue } from 'tldraw'
import { TlaButton } from '../../tla/components/TlaButton/TlaButton'
import { useApp } from '../../tla/hooks/useAppState'
import styles from '../admin.module.css'

export function AdminFairies() {
	const app = useApp()
	const user = useValue('user', () => app.getUser(), [app])
	const [invites, setInvites] = useState<
		Array<{
			id: string
			fairyLimit: number
			maxUses: number
			currentUses: number
			createdAt: number
			description: string | null
			redeemedBy: string[]
		}>
	>([])
	const [maxUses, setMaxUses] = useState(1)
	const [inviteDescription, setInviteDescription] = useState('')
	const [accessEmail, setAccessEmail] = useState('')
	const [isCreating, setIsCreating] = useState(false)
	const [isLoading, setIsLoading] = useState(false)
	const [isEnabling, setIsEnabling] = useState(false)
	const [isRemovingForMe, setIsRemovingForMe] = useState(false)
	const [isGranting, setIsGranting] = useState(false)
	const [isRemoving, setIsRemoving] = useState(false)
	const [error, setError] = useState(null as string | null)
	const [successMessage, setSuccessMessage] = useState(null as string | null)
	const [isTableExpanded, setIsTableExpanded] = useState(false)
	const [limitEmail, setLimitEmail] = useState('')
	const [limit, setLimit] = useState<number | ''>('')
	const [isSettingLimit, setIsSettingLimit] = useState(false)

	const loadInvites = useCallback(async () => {
		setIsLoading(true)
		setError(null)
		try {
			const res = await fetch('/api/app/admin/fairy-invites')
			if (!res.ok) {
				setError(res.statusText + ': ' + (await res.text()))
				return
			}
			setInvites(await res.json())
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load invites')
		} finally {
			setIsLoading(false)
		}
	}, [])

	useEffect(() => {
		loadInvites()
	}, [loadInvites])

	const createInvite = useCallback(async () => {
		if (maxUses < 0) {
			setError('Max uses must be 0 (unlimited) or greater')
			return
		}

		setIsCreating(true)
		setError(null)
		setSuccessMessage(null)
		try {
			const res = await fetch('/api/app/admin/fairy-invites', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ maxUses, description: inviteDescription || null }),
			})
			if (!res.ok) {
				setError(res.statusText + ': ' + (await res.text()))
				return
			}
			const invite = await res.json()
			setSuccessMessage(`Invite created: ${invite.id}`)
			setInviteDescription('')
			setIsTableExpanded(true)
			await loadInvites()
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to create invite')
		} finally {
			setIsCreating(false)
		}
	}, [maxUses, inviteDescription, loadInvites])

	const deleteInvite = useCallback(
		async (id: string) => {
			if (!window.confirm(`Delete invite ${id}?`)) {
				return
			}

			setError(null)
			setSuccessMessage(null)
			try {
				const res = await fetch(`/api/app/admin/fairy-invites/${id}`, {
					method: 'DELETE',
				})
				if (!res.ok) {
					setError(res.statusText + ': ' + (await res.text()))
					return
				}
				setSuccessMessage('Invite deleted')
				await loadInvites()
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to delete invite')
			}
		},
		[loadInvites]
	)

	const grantAccess = useCallback(async () => {
		if (!accessEmail || !accessEmail.includes('@')) {
			setError('Please enter a valid email address')
			return
		}

		setIsGranting(true)
		setError(null)
		setSuccessMessage(null)
		try {
			const res = await fetch('/api/app/admin/fairy/grant-access', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: accessEmail }),
			})
			if (!res.ok) {
				setError(res.statusText + ': ' + (await res.text()))
				return
			}
			await res.json()
			setSuccessMessage(`Fairy access granted to ${accessEmail}!`)
			setAccessEmail('')
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to grant fairy access')
		} finally {
			setIsGranting(false)
		}
	}, [accessEmail])

	const enableForMe = useCallback(async () => {
		setIsEnabling(true)
		setError(null)
		setSuccessMessage(null)
		try {
			const res = await fetch('/api/app/admin/fairy/enable-for-me', {
				method: 'POST',
			})
			if (!res.ok) {
				setError(res.statusText + ': ' + (await res.text()))
				return
			}
			await res.json()
			setSuccessMessage('Fairy access enabled!')
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to enable fairy access')
		} finally {
			setIsEnabling(false)
		}
	}, [])

	const removeForMe = useCallback(async () => {
		if (!user?.email) {
			setError('No user email found')
			return
		}

		setIsRemovingForMe(true)
		setError(null)
		setSuccessMessage(null)
		try {
			const res = await fetch('/api/app/admin/fairy/remove-access', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: user.email }),
			})
			if (!res.ok) {
				setError(res.statusText + ': ' + (await res.text()))
				return
			}
			await res.json()
			setSuccessMessage('Fairy access removed!')
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to remove fairy access')
		} finally {
			setIsRemovingForMe(false)
		}
	}, [user?.email])

	const removeFairyAccess = useCallback(async () => {
		if (!accessEmail || !accessEmail.includes('@')) {
			setError('Please enter a valid email address')
			return
		}

		if (!window.confirm(`Remove fairy access from ${accessEmail}?`)) {
			return
		}

		setIsRemoving(true)
		setError(null)
		setSuccessMessage(null)
		try {
			const res = await fetch('/api/app/admin/fairy/remove-access', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: accessEmail }),
			})
			if (!res.ok) {
				setError(res.statusText + ': ' + (await res.text()))
				return
			}
			await res.json()
			setSuccessMessage(`Fairy access removed from ${accessEmail}!`)
			setAccessEmail('')
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to remove fairy access')
		} finally {
			setIsRemoving(false)
		}
	}, [accessEmail])

	const setWeeklyLimit = useCallback(
		async (newLimit: number) => {
			if (!limitEmail) {
				setError('Email is required')
				return
			}

			setIsSettingLimit(true)
			setError(null)
			setSuccessMessage(null)
			try {
				const res = await fetch('/api/app/admin/fairy/set-weekly-limit', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ email: limitEmail, limit: newLimit }),
				})
				if (!res.ok) {
					setError(res.statusText + ': ' + (await res.text()))
					return
				}
				setSuccessMessage(`Weekly limit set to ${newLimit === 0 ? 'blocked' : `$${newLimit}`}`)
				setLimitEmail('')
				setLimit('')
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to set weekly limit')
			} finally {
				setIsSettingLimit(false)
			}
		},
		[limitEmail]
	)

	const handleSetCustomLimit = useCallback(async () => {
		if (limit === '') {
			setError('Please enter a limit value')
			return
		}
		await setWeeklyLimit(Number(limit))
	}, [limit, setWeeklyLimit])

	const handleBlock = useCallback(async () => {
		await setWeeklyLimit(0)
	}, [setWeeklyLimit])

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

			<h4 className="tla-text_ui__medium">Enable Fairies for Current User</h4>
			<p className="tla-text_ui__small">
				Quick access toggle for development. Grants {MAX_FAIRY_COUNT} fairies with 1 year
				expiration.
			</p>
			<div className={styles.fairyButtonContainer}>
				<TlaButton onClick={enableForMe} variant="primary" isLoading={isEnabling}>
					Enable fairies for me
				</TlaButton>
				<TlaButton
					onClick={removeForMe}
					variant="warning"
					className={styles.deleteButton}
					isLoading={isRemovingForMe}
				>
					Remove access for me
				</TlaButton>
			</div>

			<h4 className="tla-text_ui__medium">Manage Fairy Access</h4>
			<p className="tla-text_ui__small">
				Grant or remove fairy access by email. Granting access will give {MAX_FAIRY_COUNT} fairies.
			</p>
			<div className={`${styles.downloadContainer} ${styles.fairyAccessContainer}`}>
				<div>
					<label htmlFor="accessEmail">Email:</label>
					<input
						id="accessEmail"
						type="email"
						placeholder="user@example.com"
						value={accessEmail}
						onChange={(e) => setAccessEmail(e.target.value)}
						className={`${styles.searchInput} ${styles.fairyEmailInput}`}
					/>
				</div>
				<TlaButton onClick={grantAccess} variant="primary" isLoading={isGranting}>
					Grant Access
				</TlaButton>
				<TlaButton
					onClick={removeFairyAccess}
					variant="warning"
					className={styles.deleteButton}
					isLoading={isRemoving}
				>
					Remove Access
				</TlaButton>
			</div>

			<h4 className="tla-text_ui__medium">Manage weekly limits</h4>
			<p className="tla-text_ui__small">
				Set per-user weekly usage limits. Default is $25 per week.
			</p>
			<div className={`${styles.downloadContainer} ${styles.fairyAccessContainer}`}>
				<div>
					<label htmlFor="limitEmail">Email:</label>
					<input
						id="limitEmail"
						type="text"
						placeholder="user@example.com"
						value={limitEmail}
						onChange={(e) => setLimitEmail(e.target.value)}
						className={`${styles.searchInput} ${styles.fairyEmailInput}`}
					/>
				</div>
				<div>
					<label htmlFor="customLimit">New limit:</label>
					<input
						id="customLimit"
						type="number"
						placeholder="25"
						value={limit}
						onChange={(e) => setLimit(e.target.value === '' ? '' : Number(e.target.value))}
						min={0}
						className={`${styles.searchInput} ${styles.fairyEmailInput}`}
					/>
				</div>
				<TlaButton onClick={handleSetCustomLimit} variant="primary" isLoading={isSettingLimit}>
					Set custom limit
				</TlaButton>
				<TlaButton
					onClick={handleBlock}
					variant="warning"
					className={styles.deleteButton}
					isLoading={isSettingLimit}
				>
					Block
				</TlaButton>
			</div>

			<h4 className="tla-text_ui__medium">Create Invite Code</h4>
			<p className="tla-text_ui__small">
				Create an invite code that grants {MAX_FAIRY_COUNT} fairies. Max uses: how many users can
				redeem this code (0 = unlimited).
			</p>
			<div className={styles.downloadContainer}>
				<div>
					<label htmlFor="inviteDescription">Description:</label>
					<input
						id="inviteDescription"
						type="text"
						placeholder="Optional description"
						value={inviteDescription}
						onChange={(e) => setInviteDescription(e.target.value)}
						className={`${styles.searchInput} ${styles.fairyDescriptionInput}`}
					/>
				</div>
				<div>
					<label htmlFor="maxUses">Max uses:</label>
					<input
						id="maxUses"
						type="number"
						placeholder="1"
						value={maxUses}
						onChange={(e) => setMaxUses(Number(e.target.value))}
						min={0}
						className={`${styles.searchInput} ${styles.fairyMaxUsesInput}`}
					/>
				</div>
				<TlaButton onClick={createInvite} variant="primary" isLoading={isCreating}>
					Create Invite
				</TlaButton>
			</div>

			<div className={styles.invitesTableContainer}>
				<TlaButton
					onClick={() => setIsTableExpanded(!isTableExpanded)}
					variant="secondary"
					className={styles.toggleTableButton}
				>
					{isTableExpanded ? '▼' : '▶'} {isTableExpanded ? 'Hide' : 'Show'} {invites.length} invite
					{invites.length !== 1 ? 's' : ''}
				</TlaButton>

				{isTableExpanded && (
					<>
						{isLoading ? (
							<p className="tla-text_ui__small">Loading invites...</p>
						) : invites.length === 0 ? (
							<p className="tla-text_ui__small">No invites yet</p>
						) : (
							<table className={styles.invitesTable}>
								<thead>
									<tr>
										<th>ID</th>
										<th>Description</th>
										<th>Fairy Limit</th>
										<th>Uses</th>
										<th>Redeemed By</th>
										<th>Created</th>
										<th>Actions</th>
									</tr>
								</thead>
								<tbody>
									{[...invites]
										.sort((a, b) => b.createdAt - a.createdAt)
										.map((invite) => (
											<tr key={invite.id}>
												<td>{invite.id}</td>
												<td>{invite.description || '-'}</td>
												<td>{invite.fairyLimit}</td>
												<td>
													{invite.currentUses} / {invite.maxUses === 0 ? '∞' : invite.maxUses}
												</td>
												<td>
													{invite.redeemedBy && invite.redeemedBy.length > 0
														? invite.redeemedBy.join(', ')
														: '-'}
												</td>
												<td>{new Date(invite.createdAt).toLocaleString()}</td>
												<td className={styles.tableActions}>
													<TlaButton
														onClick={() => {
															const inviteUrl = `${window.location.origin}/fairy-invite/${invite.id}`
															navigator.clipboard.writeText(inviteUrl)
															setSuccessMessage('Link copied to clipboard!')
														}}
														variant="secondary"
													>
														Copy link
													</TlaButton>
													<TlaButton
														onClick={() => deleteInvite(invite.id)}
														variant="warning"
														className={styles.deleteButton}
													>
														Delete
													</TlaButton>
												</td>
											</tr>
										))}
								</tbody>
							</table>
						)}
					</>
				)}
			</div>
		</div>
	)
}
