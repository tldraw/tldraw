import { Tooltip as _Tooltip } from '@base-ui/react/tooltip'
import { Role, ZErrorCode, can } from '@tldraw/dotcom-shared'
import { MouseEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
	TldrawUiButton,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	TldrawUiInput,
	TldrawUiTooltip,
	useDialogs,
	useValue,
} from 'tldraw'
import { routes } from '../../../routeDefs'
import { useApp } from '../../hooks/useAppState'
import { useCurrentFileId } from '../../hooks/useCurrentFileId'
import { defineMessages, F, useMsg } from '../../utils/i18n'
import { TlaButton } from '../TlaButton/TlaButton'
import { TlaIcon } from '../TlaIcon/TlaIcon'
import { ConfirmDialog } from './ConfirmDialog'
import styles from './dialogs.module.css'

const messages = defineMessages({
	title: { defaultMessage: 'Workspace settings' },
	name: { defaultMessage: 'Name' },
	namePlaceholder: { defaultMessage: 'Workspace name' },
	inviteMembers: { defaultMessage: 'Invite members' },
	regenerateInviteLinkHelp: {
		defaultMessage: 'Revoke this link and create a new one.',
	},
	copyInviteLink: { defaultMessage: 'Copy invite link' },
	members: { defaultMessage: 'Members' },
	owner: { defaultMessage: 'Owner' },
	member: { defaultMessage: 'Member' },
	you: { defaultMessage: 'you' },
	dangerZone: { defaultMessage: 'Danger zone' },
	leaveWorkspace: { defaultMessage: 'Leave workspace…' },
	deleteWorkspaceMsg: { defaultMessage: 'Delete workspace…' },
	save: { defaultMessage: 'Save' },
	cancel: { defaultMessage: 'Cancel' },
	confirmLeave: { defaultMessage: 'Are you sure you want to leave this workspace?' },
	confirmDelete: {
		defaultMessage: 'Are you sure you want to delete this workspace? This action cannot be undone.',
	},
	leaveAction: { defaultMessage: 'Leave workspace' },
	deleteAction: { defaultMessage: 'Delete workspace' },
})

interface WorkspaceSettingsDialogProps {
	workspaceId: string
	onClose(): void
}

export function WorkspaceSettingsDialog({ workspaceId, onClose }: WorkspaceSettingsDialogProps) {
	const app = useApp()
	const { addDialog } = useDialogs()
	const [isRegenerating, setIsRegenerating] = useState(false)
	const [copiedInviteLink, setCopiedInviteLink] = useState(false)
	const [showRefreshSuccess, setShowRefreshSuccess] = useState(false)

	const namePlaceholderMsg = useMsg(messages.namePlaceholder)
	const ownerMsg = useMsg(messages.owner)
	const memberMsg = useMsg(messages.member)
	const youMsg = useMsg(messages.you)

	// Get workspace data
	const workspaceMembership = useValue(
		'workspaceMembership',
		() => app.getWorkspaceMembership(workspaceId),
		[app, workspaceId]
	)
	const currentFileId = useCurrentFileId()
	const navigate = useNavigate()

	if (!workspaceMembership) return null
	// The home workspace has no settings to manage.
	if (workspaceId === app.getHomeWorkspaceId()) return null
	const workspace = workspaceMembership.group
	const currentUser = workspaceMembership.groupMembers.find(
		(member) => member.userId === app.getUser().id
	)
	const role = currentUser?.role
	const ownersCount = workspaceMembership.groupMembers.filter((m) => m.role === 'owner').length
	// Leaving is allowed for everyone except the last owner — a workspace invariant
	// (it must always keep at least one owner), not a capability.
	const canLeave = role !== 'owner' || ownersCount > 1
	const roleLabels: Record<Role, string> = { owner: ownerMsg, member: memberMsg }

	const handleCopyInviteLink = async () => {
		if (copiedInviteLink) return
		if (!app.copyWorkspaceInvite(workspaceId, false)) return
		setCopiedInviteLink(true)
		setTimeout(() => setCopiedInviteLink(false), 1000)
	}

	const handleRegenerateInviteLink = async (e: MouseEvent<HTMLButtonElement>) => {
		e.preventDefault()
		setIsRegenerating(true)
		try {
			await app.z.mutate.regenerateWorkspaceInviteSecret({ id: workspaceId }).server
			setShowRefreshSuccess(true)
			setTimeout(() => setShowRefreshSuccess(false), 1000)
		} finally {
			setIsRegenerating(false)
		}
	}

	const handleLeaveWorkspace = async () => {
		try {
			const isCurrentlyOnAFileInThisWorkspace =
				currentFileId && app.getFile(currentFileId)?.owningGroupId === workspaceId
			await app.z.mutate.leaveWorkspace({ workspaceId }).client
			onClose()
			if (isCurrentlyOnAFileInThisWorkspace) {
				navigate('/')
			}
		} catch (error) {
			console.error('Error leaving workspace:', error)
			app.showMutationRejectionToast((error as Error).message as ZErrorCode)
		}
	}

	const handleDeleteWorkspace = async () => {
		try {
			const isCurrentlyOnAFileInThisWorkspace =
				currentFileId && app.getFile(currentFileId)?.owningGroupId === workspaceId
			await app.z.mutate.deleteWorkspace({ id: workspaceId }).client
			onClose()
			if (isCurrentlyOnAFileInThisWorkspace) {
				navigate('/')
			}
		} catch (error) {
			console.error('Error deleting workspace:', error)
			app.showMutationRejectionToast((error as Error).message as ZErrorCode)
		}
	}

	const openLeaveConfirmDialog = () => {
		addDialog({
			component: ({ onClose }) => (
				<ConfirmDialog
					title={<F {...messages.leaveAction} />}
					description={<F {...messages.confirmLeave} />}
					confirmLabel={<F {...messages.leaveAction} />}
					cancelLabel={<F {...messages.cancel} />}
					confirmType="danger"
					onConfirm={handleLeaveWorkspace}
					onClose={onClose}
				/>
			),
		})
	}

	const openDeleteConfirmDialog = () => {
		addDialog({
			component: ({ onClose }) => (
				<ConfirmDialog
					title={<F {...messages.deleteAction} />}
					description={<F {...messages.confirmDelete} />}
					confirmLabel={<F {...messages.deleteAction} />}
					cancelLabel={<F {...messages.cancel} />}
					confirmType="danger"
					onConfirm={handleDeleteWorkspace}
					onClose={onClose}
				/>
			),
		})
	}

	if (!workspace || !workspaceMembership) {
		return null
	}

	const inviteUrl = workspace.inviteSecret
		? routes.tlaInvite(workspace.inviteSecret, { asUrl: true })
		: ''

	return (
		<_Tooltip.Provider>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>
					<F {...messages.title} />
				</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody className={styles.workspaceSettingsBody}>
				{/* Name Section */}
				<div className={styles.section}>
					<div className={styles.sectionLabel}>
						<F {...messages.name} />
					</div>
					{/* Renaming requires the owner role (the updateWorkspace mutator enforces it) */}
					<TldrawUiInput
						className={styles.dialogInput}
						defaultValue={workspace.name}
						disabled={!can(role, 'editWorkspace')}
						onValueChange={(value) => {
							const name = value.trim()
							if (name && name !== workspace.name) {
								app.z.mutate.updateWorkspace({ id: workspaceId, name })
							}
						}}
						placeholder={namePlaceholderMsg}
					/>
				</div>

				{/* Invite Members Section */}
				<div className={styles.section}>
					<div className={styles.sectionLabel}>
						<F {...messages.inviteMembers} />
					</div>
					<div className={`${styles.inviteInputContainer} tlui-input--disabled`}>
						<input
							className={`${styles.noPadding} tlui-input`}
							value={inviteUrl}
							readOnly
							onBlur={() => {
								window.getSelection()?.collapseToEnd()
							}}
							onMouseDown={(e) => {
								e.preventDefault()
								;(e.target as HTMLInputElement).select()
							}}
						/>
						<TldrawUiTooltip content={<F {...messages.regenerateInviteLinkHelp} />}>
							<TldrawUiButton
								type="normal"
								aria-label="Regenerate invite link"
								onClick={handleRegenerateInviteLink}
								disabled={isRegenerating}
								style={{
									transform: 'scale(0.9)',
								}}
							>
								<TlaIcon
									icon={showRefreshSuccess ? 'check' : 'refresh'}
									className={showRefreshSuccess ? styles.disabledIcon : undefined}
								/>
							</TldrawUiButton>
						</TldrawUiTooltip>
					</div>
					<TlaButton
						iconRight={copiedInviteLink ? 'check' : 'copy'}
						iconRightClassName={styles.copyInviteLinkIconRight}
						variant="primary"
						onClick={handleCopyInviteLink}
					>
						<F {...messages.copyInviteLink} />
					</TlaButton>
				</div>

				{/* Members Section */}
				<hr className={styles.divider} />
				<div className={styles.section}>
					<label className={styles.sectionLabelLarge}>
						<F {...messages.members} />{' '}
						<span className={styles.memberCount}>
							{/* eslint-disable-next-line tldraw/jsx-no-literals */}
							{`(${workspaceMembership.groupMembers.length})`}
						</span>
					</label>
					<div className={styles.membersList}>
						{[...workspaceMembership.groupMembers]
							.sort((a, b) => {
								const currentId = app.getUser().id
								if (a.userId === currentId && b.userId !== currentId) return -1
								if (b.userId === currentId && a.userId !== currentId) return 1
								return 0
							})
							.map((member) => (
								<div key={member.userId} className={styles.memberItem}>
									<div
										className={styles.memberAvatar}
										style={{
											backgroundColor: member.userColor || '#ff6b35',
										}}
									>
										{member.userName.charAt(0).toUpperCase()}
									</div>
									<span className={styles.memberName}>
										{member.userName}
										{member.userId === app.getUser().id ? ` (${youMsg})` : ''}
									</span>
									{can(role, 'editMembers') &&
									(member.userId !== app.getUser().id || ownersCount > 1) ? (
										<MemberRoleSelect
											value={member.role}
											disabled={member.role === 'owner' && ownersCount <= 1}
											labels={roleLabels}
											onChange={async (value) => {
												if (value === member.role) return
												if (member.role === 'owner' && value !== 'owner' && ownersCount <= 1) return
												try {
													await app.z.mutate.setWorkspaceMemberRole({
														workspaceId,
														targetUserId: member.userId,
														role: value,
													}).client
												} catch (err) {
													console.error('Failed to change member role', err)
													app.showMutationRejectionToast((err as Error).message as ZErrorCode)
												}
											}}
										/>
									) : (
										<span className={styles.memberRole}>{roleLabels[member.role]}</span>
									)}
								</div>
							))}
					</div>
				</div>

				{/* Danger Zone */}
				<hr className={styles.divider} />
				<div>
					<label className={styles.sectionLabelLarge}>
						<F {...messages.dangerZone} />
					</label>
					<div className={styles.dangerZoneActions}>
						{canLeave && (
							<button className={styles.inlineButton} onClick={openLeaveConfirmDialog}>
								<F {...messages.leaveWorkspace} />
							</button>
						)}
						{can(role, 'deleteWorkspace') && (
							<button className={styles.inlineButton} onClick={openDeleteConfirmDialog}>
								<F {...messages.deleteWorkspaceMsg} />
							</button>
						)}
					</div>
				</div>

				{/* Confirmation handled via tldraw dialogs */}
			</TldrawUiDialogBody>
		</_Tooltip.Provider>
	)
}

function MemberRoleSelect({
	value,
	onChange,
	disabled,
	labels,
}: {
	value: Role
	onChange(v: Role): void
	disabled?: boolean
	labels: Record<Role, string>
}) {
	return (
		<div className={styles.selectWrapper}>
			<TlaIcon icon="chevron-down" className={styles.menuSelectChevron} />
			<select
				className={styles.select}
				value={value}
				disabled={disabled}
				onChange={(e) => onChange(e.currentTarget.value as Role)}
			>
				{Object.entries(labels).map(([roleValue, label]) => (
					<option key={roleValue} value={roleValue}>
						{label}
					</option>
				))}
			</select>
		</div>
	)
}
