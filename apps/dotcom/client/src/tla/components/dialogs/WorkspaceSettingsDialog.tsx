import { MAX_WORKSPACE_NAME_LENGTH, Role, ZErrorCode, can } from '@tldraw/dotcom-shared'
import { Tooltip as _Tooltip } from 'radix-ui'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	TldrawUiInput,
	TldrawUiTooltip,
	useDialogs,
	useValue,
} from 'tldraw'
import { useApp } from '../../hooks/useAppState'
import { useCurrentFileId } from '../../hooks/useCurrentFileId'
import { defineMessages, F, useMsg } from '../../utils/i18n'
import {
	TlaMenuControl,
	TlaMenuControlLabel,
	TlaMenuSelect,
	TlaMenuSwitch,
	TlaMenuTabsPage,
	TlaMenuTabsRoot,
	TlaMenuTabsTab,
	TlaMenuTabsTabs,
} from '../tla-menu/tla-menu'
import { TlaButton } from '../TlaButton/TlaButton'
import { ConfirmDialog } from './ConfirmDialog'
import styles from './dialogs.module.css'

const messages = defineMessages({
	cancel: { defaultMessage: 'Cancel' },
	copyInviteLink: { defaultMessage: 'Copy invite link' },
	delete: { defaultMessage: 'Delete' },
	deleteWorkspace: { defaultMessage: 'Delete workspace' },
	deleteWorkspaceConfirm: {
		defaultMessage: 'Are you sure you want to delete this workspace? This action cannot be undone.',
	},
	enableInviteLink: { defaultMessage: 'Enable invites' },
	inviteDisabled: { defaultMessage: 'Invites are disabled' },
	inviteTeammates: { defaultMessage: 'Invite teammates' },
	leave: { defaultMessage: 'Leave' },
	leaveWorkspace: { defaultMessage: 'Leave workspace' },
	leaveWorkspaceConfirm: { defaultMessage: 'Are you sure you want to leave this workspace?' },
	manageWorkspace: { defaultMessage: 'Manage workspace' },
	member: { defaultMessage: 'Member' },
	members: { defaultMessage: 'Members' },
	mustKeepOwner: {
		defaultMessage: 'A workspace must keep at least one owner. Make someone else an owner first.',
	},
	name: { defaultMessage: 'Name' },
	namePlaceholder: { defaultMessage: 'Workspace name' },
	owner: { defaultMessage: 'Owner' },
	privateWorkspaceHelp: {
		defaultMessage: 'This is your private workspace. Create a new workspace to invite teammates.',
	},
	regenerate: { defaultMessage: 'Regenerate' },
	regenerateInviteLink: { defaultMessage: 'Regenerate invite link' },
	regenerateInviteLinkConfirm: {
		defaultMessage:
			'Regenerating replaces the current invite link with a new one. Anyone using the old link will need the new one to join.',
	},
	remove: { defaultMessage: 'Remove' },
	removeMember: { defaultMessage: 'Remove member' },
	removeMemberConfirm: {
		defaultMessage: 'Are you sure you want to remove {name} from this workspace?',
	},
	settings: { defaultMessage: 'Settings' },
	you: { defaultMessage: 'you' },
})

interface WorkspaceSettingsDialogProps {
	workspaceId: string
	onClose(): void
}

// Returns a callback ref for a scroll container that shows its scrollbar only when the
// content actually overflows. The container stays `overflow: hidden` (see .tabPage) and
// gets the `.scrollable` class — flipping overflow to auto — once measurement shows the
// content is taller than the (max-height-capped) container. A ResizeObserver on the
// container and its content re-checks as members are added/removed or the window resizes.
function useScrollbarWhenScrollable() {
	return useCallback((el: HTMLDivElement | null) => {
		if (!el) return
		const update = () =>
			el.classList.toggle(styles.scrollable, el.scrollHeight > el.clientHeight + 1)
		update()
		const observer = new ResizeObserver(update)
		observer.observe(el)
		for (const child of el.children) observer.observe(child)
		return () => observer.disconnect()
	}, [])
}

export function WorkspaceSettingsDialog({ workspaceId, onClose }: WorkspaceSettingsDialogProps) {
	const app = useApp()
	const { addDialog } = useDialogs()
	const [activeTab, setActiveTab] = useState('members')
	const [copiedInviteLink, setCopiedInviteLink] = useState(false)

	const scrollableRef = useScrollbarWhenScrollable()

	const namePlaceholderMsg = useMsg(messages.namePlaceholder)
	const ownerMsg = useMsg(messages.owner)
	const memberMsg = useMsg(messages.member)
	const youMsg = useMsg(messages.you)

	const workspaceMembership = useValue(
		'workspaceMembership',
		() => app.getWorkspaceMembership(workspaceId),
		[app, workspaceId]
	)
	const currentFileId = useCurrentFileId()
	const navigate = useNavigate()

	// The overlay grid-centers the dialog, so it re-centers (and visibly jumps) whenever its
	// height changes between tabs. Anchor it near the top instead (Raycast-style): a stable
	// position that grows/shrinks downward as content changes. The max-height keeps a margin
	// below it so it never reaches the bottom of the viewport — past that the members list
	// scrolls (see .tabPage) while the name/invite/tabs stay put. vh keeps these correct
	// across window resizes.
	const anchorRef = useRef<HTMLDivElement>(null)
	const hasAnchoredRef = useRef(false)
	useLayoutEffect(() => {
		if (hasAnchoredRef.current) return
		const content = anchorRef.current?.closest('.tlui-dialog__content')
		if (!(content instanceof HTMLElement)) return
		hasAnchoredRef.current = true
		content.style.alignSelf = 'start'
		content.style.marginTop = '20vh'
		content.style.maxHeight = '70vh'
	})

	if (!workspaceMembership) return null
	const workspace = workspaceMembership.group
	if (!workspace) return null
	// The home workspace is a private, single-member space: it can be renamed but not shared,
	// joined, or deleted, so it shows the name field and a disabled "private workspace" invite
	// note — no shareable invite link, members list, or settings tabs.
	const isHomeWorkspace = workspaceId === app.getHomeWorkspaceId()

	const currentUser = workspaceMembership.groupMembers.find(
		(member) => member.userId === app.getUser().id
	)
	const role = currentUser?.role
	const ownersCount = workspaceMembership.groupMembers.filter((m) => m.role === 'owner').length
	// Leaving is allowed for everyone except the last owner — a workspace invariant
	// (it must always keep at least one owner), not a capability.
	const canLeave = role !== 'owner' || ownersCount > 1
	const canManageWorkspace = can(role, 'manageWorkspace')
	// Optional column: older cached rows without it (and the migration's default)
	// mean "enabled", so treat a missing value as true.
	const inviteLinkEnabled = workspace.inviteLinkEnabled ?? true
	const roleLabels: Record<Role, string> = { owner: ownerMsg, member: memberMsg }
	// Owners sort above members; within a role the current user is pinned to the top.
	const roleOrder: Record<Role, number> = { owner: 0, member: 1 }
	const roleOptions = (Object.keys(roleLabels) as Role[]).map((value) => ({
		value,
		label: roleLabels[value],
	}))

	const handleCopyInviteLink = async () => {
		if (copiedInviteLink) return
		if (!app.copyWorkspaceInvite(workspaceId, false)) return
		setCopiedInviteLink(true)
		setTimeout(() => setCopiedInviteLink(false), 1000)
	}

	const handleToggleInviteLink = (enabled: boolean) => {
		app.z.mutate.setWorkspaceInviteLinkEnabled({ id: workspaceId, enabled })
	}

	const handleRegenerateInviteLink = async () => {
		try {
			await app.z.mutate.regenerateWorkspaceInviteSecret({ id: workspaceId }).server
		} catch (error) {
			console.error('Error regenerating invite link:', error)
			app.showMutationRejectionToast((error as Error).message as ZErrorCode)
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

	const handleRemoveMember = async (targetUserId: string) => {
		try {
			await app.z.mutate.removeWorkspaceMember({ workspaceId, targetUserId }).client
		} catch (error) {
			console.error('Error removing member:', error)
			app.showMutationRejectionToast((error as Error).message as ZErrorCode)
		}
	}

	const openRegenerateConfirmDialog = () => {
		addDialog({
			component: ({ onClose }) => (
				<ConfirmDialog
					title={<F {...messages.regenerateInviteLink} />}
					description={<F {...messages.regenerateInviteLinkConfirm} />}
					confirmLabel={<F {...messages.regenerate} />}
					cancelLabel={<F {...messages.cancel} />}
					confirmType="danger"
					onConfirm={handleRegenerateInviteLink}
					onClose={onClose}
				/>
			),
		})
	}

	const openLeaveConfirmDialog = () => {
		addDialog({
			component: ({ onClose }) => (
				<ConfirmDialog
					title={<F {...messages.leaveWorkspace} />}
					description={<F {...messages.leaveWorkspaceConfirm} />}
					confirmLabel={<F {...messages.leave} />}
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
					title={<F {...messages.deleteWorkspace} />}
					description={<F {...messages.deleteWorkspaceConfirm} />}
					confirmLabel={<F {...messages.delete} />}
					cancelLabel={<F {...messages.cancel} />}
					confirmType="danger"
					onConfirm={handleDeleteWorkspace}
					onClose={onClose}
				/>
			),
		})
	}

	const openRemoveConfirmDialog = (member: { userId: string; userName: string }) => {
		addDialog({
			component: ({ onClose }) => (
				<ConfirmDialog
					title={<F {...messages.removeMember} />}
					description={<F {...messages.removeMemberConfirm} values={{ name: member.userName }} />}
					confirmLabel={<F {...messages.remove} />}
					cancelLabel={<F {...messages.cancel} />}
					confirmType="danger"
					onConfirm={() => handleRemoveMember(member.userId)}
					onClose={onClose}
				/>
			),
		})
	}

	const members = [...workspaceMembership.groupMembers].sort((a, b) => {
		const currentId = app.getUser().id
		// Owners first, then members; within a role, pin the current user to the top.
		if (a.role !== b.role) return roleOrder[a.role] - roleOrder[b.role]
		if (a.userId === currentId) return -1
		if (b.userId === currentId) return 1
		return 0
	})

	return (
		<_Tooltip.Provider>
			{/* Marker used to find the dialog content element and anchor its position (see above). */}
			<div ref={anchorRef} hidden />
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>
					<F {...messages.manageWorkspace} />
				</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody className={styles.workspaceSettingsBody}>
				{/* Shared header: name + invite link, shown above both tabs. */}
				<div className={styles.section}>
					<div className={styles.sectionLabel}>
						<F {...messages.name} />
					</div>
					{/* Renaming requires the manageWorkspace capability (enforced by the mutator). */}
					<TldrawUiInput
						className={styles.dialogInput}
						defaultValue={workspace.name}
						disabled={!canManageWorkspace}
						onValueChange={(value) => {
							const name = value.trim()
							if (name && name !== workspace.name) {
								app.z.mutate.updateWorkspace({ id: workspaceId, name })
							}
						}}
						placeholder={namePlaceholderMsg}
						maxLength={MAX_WORKSPACE_NAME_LENGTH}
						autoSelect
					/>
				</div>

				{/* The home workspace is private and can't be shared, so show a disabled invite
				    control with a note pointing the user to creating a shared workspace instead. */}
				{isHomeWorkspace && (
					<div className={styles.section}>
						<div className={styles.sectionLabel}>
							<F {...messages.inviteTeammates} />
						</div>
						<TlaButton iconRight="copy" variant="secondary" big disabled>
							<F {...messages.copyInviteLink} />
						</TlaButton>
						<p className={styles.sectionHelp}>
							<F {...messages.privateWorkspaceHelp} />
						</p>
					</div>
				)}

				{/* Invite link, members, and settings apply only to shared workspaces. */}
				{!isHomeWorkspace && (
					<>
						<div className={styles.section}>
							<div className={styles.sectionLabel}>
								<F {...messages.inviteTeammates} />
							</div>
							{inviteLinkEnabled ? (
								<TlaButton
									iconRight={copiedInviteLink ? 'check' : 'copy'}
									iconRightClassName={styles.copyInviteLinkIconRight}
									variant="primary"
									big
									onClick={handleCopyInviteLink}
								>
									<F {...messages.copyInviteLink} />
								</TlaButton>
							) : (
								<TlaButton variant="secondary" big disabled>
									<F {...messages.inviteDisabled} />
								</TlaButton>
							)}
						</div>

						<TlaMenuTabsRoot activeTab={activeTab} onTabChange={setActiveTab}>
							{/* The shared tabs inset their labels by the tab padding; pull the strip out
					    by that amount so the first tab's label lines up with the headings, button,
					    and member rows. The underline still spans the content width. */}
							<div className={styles.workspaceTabs}>
								<TlaMenuTabsTabs>
									<TlaMenuTabsTab id="members">
										<F {...messages.members} />
									</TlaMenuTabsTab>
									<TlaMenuTabsTab id="settings">
										<F {...messages.settings} />
									</TlaMenuTabsTab>
								</TlaMenuTabsTabs>
							</div>

							<TlaMenuTabsPage id="members">
								<div className={styles.tabPage} ref={scrollableRef}>
									<div className={styles.membersList}>
										{members.map((member) => {
											const isSelf = member.userId === app.getUser().id
											// Whether this member is an owner; used to hide non-owner roles from
											// viewers who can't manage the workspace.
											const memberIsOwner = can(member.role, 'manageWorkspace')
											// A workspace must keep at least one owner, so the last owner can't be
											// removed (this also covers an owner removing themselves).
											const canRemoveMember = !memberIsOwner || ownersCount > 1
											// For the same reason the last owner can't be demoted to member, so
											// disable that option rather than letting the change silently no-op.
											const memberRoleOptions = canRemoveMember
												? roleOptions
												: roleOptions.map((option) =>
														option.value === 'member' ? { ...option, disabled: true } : option
													)
											return (
												<div key={member.userId} className={styles.memberItem}>
													<div
														className={styles.memberAvatar}
														style={{ backgroundColor: member.userColor || '#ff6b35' }}
													>
														{member.userName.charAt(0).toUpperCase()}
													</div>
													<span className={styles.memberName}>
														{member.userName}
														{isSelf ? ` (${youMsg})` : ''}
													</span>
													{canManageWorkspace ? (
														<TlaMenuSelect
															id={`workspace-member-role-${member.userId}`}
															label={roleLabels[member.role]}
															value={member.role}
															usePortal
															options={memberRoleOptions}
															// Everyone — including yourself — can be removed; it's disabled when
															// removal would leave the workspace without an owner. On your own
															// row this is "Leave" and routes to the leave flow.
															actions={[
																{
																	id: 'remove',
																	label: isSelf ? (
																		<F {...messages.leave} />
																	) : (
																		<F {...messages.remove} />
																	),
																	destructive: true,
																	disabled: !canRemoveMember,
																	tooltip: canRemoveMember ? undefined : (
																		<F {...messages.mustKeepOwner} />
																	),
																	onSelect: () =>
																		isSelf
																			? openLeaveConfirmDialog()
																			: openRemoveConfirmDialog(member),
																},
															]}
															onChange={async (value) => {
																if (value === member.role) return
																try {
																	await app.z.mutate.setWorkspaceMemberRole({
																		workspaceId,
																		targetUserId: member.userId,
																		role: value,
																	}).client
																} catch (err) {
																	console.error('Failed to change member role', err)
																	app.showMutationRejectionToast(
																		(err as Error).message as ZErrorCode
																	)
																}
															}}
														/>
													) : memberIsOwner ? (
														<span className={styles.memberRole}>{roleLabels[member.role]}</span>
													) : null}
												</div>
											)
										})}
									</div>
								</div>
							</TlaMenuTabsPage>

							<TlaMenuTabsPage id="settings">
								<div className={styles.tabPage} ref={scrollableRef}>
									<div className={styles.settingsPage}>
										{canManageWorkspace && (
											<>
												<TlaMenuControl>
													<TlaMenuControlLabel htmlFor="workspace-invite-enabled-switch">
														<F {...messages.enableInviteLink} />
													</TlaMenuControlLabel>
													<TlaMenuSwitch
														id="workspace-invite-enabled-switch"
														checked={inviteLinkEnabled}
														onChange={handleToggleInviteLink}
													/>
												</TlaMenuControl>
												<button
													type="button"
													className={styles.inlineButton}
													onClick={openRegenerateConfirmDialog}
												>
													<F {...messages.regenerateInviteLink} />
												</button>
											</>
										)}
										{canLeave ? (
											<button
												type="button"
												className={styles.inlineButton}
												onClick={openLeaveConfirmDialog}
											>
												<F {...messages.leaveWorkspace} />
											</button>
										) : (
											<TldrawUiTooltip content={<F {...messages.mustKeepOwner} />}>
												<button type="button" className={styles.inlineButton} disabled>
													<F {...messages.leaveWorkspace} />
												</button>
											</TldrawUiTooltip>
										)}
										{canManageWorkspace && (
											<button
												type="button"
												className={`${styles.inlineButton} ${styles.inlineButtonDanger}`}
												onClick={openDeleteConfirmDialog}
											>
												<F {...messages.deleteWorkspace} />
											</button>
										)}
									</div>
								</div>
							</TlaMenuTabsPage>
						</TlaMenuTabsRoot>
					</>
				)}
			</TldrawUiDialogBody>
		</_Tooltip.Provider>
	)
}
