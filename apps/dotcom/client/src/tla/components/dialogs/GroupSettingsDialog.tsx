import { Tooltip as _Tooltip } from 'radix-ui'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
	TldrawUiButton,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	TldrawUiInput,
	useDialogs,
	useValue,
} from 'tldraw'
import { useApp } from '../../hooks/useAppState'
import { useCurrentFileId } from '../../hooks/useCurrentFileId'
import { defineMessages, F, useMsg } from '../../utils/i18n'
import { TlaButton } from '../TlaButton/TlaButton'
import { TlaIcon } from '../TlaIcon/TlaIcon'
import {
	TlaTooltipArrow,
	TlaTooltipContent,
	TlaTooltipRoot,
	TlaTooltipTrigger,
} from '../TlaTooltip/TlaTooltip'
import { ConfirmDialog } from './ConfirmDialog'
import styles from './dialogs.module.css'

const messages = defineMessages({
	title: { defaultMessage: 'Group settings' },
	name: { defaultMessage: 'Name' },
	namePlaceholder: { defaultMessage: 'Group name' },
	inviteMembers: { defaultMessage: 'Invite members' },
	regenerateInviteLinkHelp: {
		defaultMessage: 'Revoke this link and create a new one.',
	},
	copyInviteLink: { defaultMessage: 'Copy invite link' },
	members: { defaultMessage: 'Members' },
	owner: { defaultMessage: 'Owner' },
	admin: { defaultMessage: 'Admin' },
	you: { defaultMessage: 'you' },
	dangerZone: { defaultMessage: 'Danger zone' },
	leaveGroup: { defaultMessage: 'Leave group…' },
	deleteGroup: { defaultMessage: 'Delete group…' },
	save: { defaultMessage: 'Save' },
	cancel: { defaultMessage: 'Cancel' },
	confirmLeave: { defaultMessage: 'Are you sure you want to leave this group?' },
	confirmDelete: {
		defaultMessage: 'Are you sure you want to delete this group? This action cannot be undone.',
	},
	leaveAction: { defaultMessage: 'Leave group' },
	deleteAction: { defaultMessage: 'Delete group' },
})

interface GroupSettingsDialogProps {
	groupId: string
	onClose(): void
}

export function GroupSettingsDialog({ groupId, onClose }: GroupSettingsDialogProps) {
	const app = useApp()
	const { addDialog } = useDialogs()
	const [isRegenerating, setIsRegenerating] = useState(false)
	const [copiedInviteLink, setCopiedInviteLink] = useState(false)
	const [showRefreshSuccess, setShowRefreshSuccess] = useState(false)

	const namePlaceholderMsg = useMsg(messages.namePlaceholder)
	const ownerMsg = useMsg(messages.owner)
	const adminMsg = useMsg(messages.admin)
	const youMsg = useMsg(messages.you)

	// Get group data
	const groupMembership = useValue('groupMembership', () => app.getGroupMembership(groupId), [
		app,
		groupId,
	])
	const currentFileId = useCurrentFileId()
	const navigate = useNavigate()

	if (!groupMembership) return null
	const group = groupMembership.group
	const currentUser = groupMembership.groupMembers.find(
		(member) => member.userId === app.getUser().id
	)
	const isOwner = currentUser?.role === 'owner'
	const canDelete = isOwner
	const canLeave =
		!isOwner || groupMembership.groupMembers.filter((member) => member.role === 'owner').length > 1
	const ownersCount = groupMembership.groupMembers.filter((m) => m.role === 'owner').length

	const handleCopyInviteLink = async () => {
		if (copiedInviteLink) return
		app.copyGroupInvite(groupId, false)
		setCopiedInviteLink(true)
		setTimeout(() => setCopiedInviteLink(false), 1000)
	}

	const handleRegenerateInviteLink = async () => {
		setIsRegenerating(true)
		try {
			await app.z.mutate.group.regenerateInvite({ id: groupId }).server
			setShowRefreshSuccess(true)
			setTimeout(() => setShowRefreshSuccess(false), 1000)
		} finally {
			setIsRegenerating(false)
		}
	}

	const handleLeaveGroup = async () => {
		try {
			await app.z.mutate.group.leave({ groupId })
			onClose()
		} catch (error) {
			console.error('Error leaving group:', error)
		}
	}

	const handleDeleteGroup = async () => {
		try {
			const isCurrentlyOnAFileInThisGroup =
				currentFileId && app.getFile(currentFileId)?.owningGroupId === groupId
			await app.z.mutate.group.delete({ id: groupId })
			onClose()
			if (isCurrentlyOnAFileInThisGroup) {
				navigate('/')
			}
		} catch (error) {
			console.error('Error deleting group:', error)
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
					onConfirm={handleLeaveGroup}
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
					onConfirm={handleDeleteGroup}
					onClose={onClose}
				/>
			),
		})
	}

	if (!group || !groupMembership) {
		return null
	}

	const inviteUrl = group.inviteSecret
		? `${window.location.origin}/invite/${group.inviteSecret}`
		: ''

	return (
		<_Tooltip.Provider>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>
					<F {...messages.title} />
				</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody className={styles.groupSettingsBody}>
				{/* Name Section */}
				<div className={styles.section}>
					<div className={styles.sectionLabel}>
						<F {...messages.name} />
					</div>
					<TldrawUiInput
						className={styles.dialogInput}
						defaultValue={group.name}
						onValueChange={(value) => {
							const name = value.trim()
							if (name && name !== group.name) {
								app.z.mutate.group.update({ id: groupId, name })
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
						<TlaTooltipRoot>
							<TlaTooltipTrigger asChild>
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
							</TlaTooltipTrigger>
							<TlaTooltipContent>
								<F {...messages.regenerateInviteLinkHelp} />
								<TlaTooltipArrow />
							</TlaTooltipContent>
						</TlaTooltipRoot>
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
						<span className={styles.memberCount}>{
							// eslint-disable-next-line react/jsx-no-literals
							`(${groupMembership.groupMembers.length})`
						}</span>
					</label>
					<div className={styles.membersList}>
						{[...groupMembership.groupMembers]
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
									{isOwner && member.userId !== app.getUser().id ? (
										<MemberRoleSelect
											value={member.role}
											disabled={member.role === 'owner' && ownersCount <= 1}
											ownerLabel={ownerMsg}
											adminLabel={adminMsg}
											onChange={async (value) => {
												if (value === member.role) return
												if (member.role === 'owner' && value === 'admin' && ownersCount <= 1) return
												try {
													await app.z.mutate.group.setMemberRole({
														groupId,
														targetUserId: member.userId,
														role: value,
													})
												} catch (err) {
													console.error('Failed to change member role', err)
												}
											}}
										/>
									) : (
										<span className={styles.memberRole}>
											{member.role === 'owner' ? ownerMsg : adminMsg}
										</span>
									)}
									{/* {isOwner && member.userId !== app.getUser().id ? (
									<TlaMenuSelect<'owner' | 'admin'>
										label={member.role === 'owner' ? ownerMsg : adminMsg}
										value={member.role}
										disabled={member.role === 'owner' && ownersCount <= 1}
										onChange={async (value) => {
											if (value === member.role) return
											if (member.role === 'owner' && value === 'admin' && ownersCount <= 1) {
												return
											}
											try {
												await app.z.mutate.group.setMemberRole({
													groupId,
													targetUserId: member.userId,
													role: value,
												})
											} catch (err) {
												console.error('Failed to change member role', err)
											}
										}}
										options={[
											{ value: 'admin', label: adminMsg },
											{ value: 'owner', label: ownerMsg },
										]}
									/>
								) : (
									<span className={styles.memberRole}>
										{member.role === 'owner' ? ownerMsg : adminMsg}
									</span>
								)} */}
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
								<F {...messages.leaveGroup} />
							</button>
						)}
						{canDelete && (
							<button className={styles.inlineButton} onClick={openDeleteConfirmDialog}>
								<F {...messages.deleteGroup} />
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
	ownerLabel,
	adminLabel,
}: {
	value: 'owner' | 'admin'
	onChange(v: 'owner' | 'admin'): void
	disabled?: boolean
	ownerLabel: string
	adminLabel: string
}) {
	return (
		<div className={styles.selectWrapper}>
			<TlaIcon icon="chevron-down" className={styles.menuSelectChevron} />
			<select
				className={styles.select}
				value={value}
				disabled={disabled}
				onChange={(e) => onChange(e.currentTarget.value as 'owner' | 'admin')}
			>
				<option value="owner">{ownerLabel}</option>
				<option value="admin">{adminLabel}</option>
			</select>
		</div>
	)
}
