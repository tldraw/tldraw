import { MAX_WORKSPACE_NAME_LENGTH, Role, can } from '@tldraw/dotcom-shared'
import classNames from 'classnames'
import { Tooltip as _Tooltip } from 'radix-ui'
import { ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
	defineMessages,
	F,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogHeader,
	TldrawUiDialogFooter,
	TldrawUiDialogTitle,
	TldrawUiInput,
	TldrawUiIcon,
	TldrawUiTooltip,
	useDialogs,
	useTranslation,
	useValue,
} from 'tldraw'
import { routes } from '../../../routeDefs'
import { useApp } from '../../hooks/useAppState'
import { useCurrentFileId } from '../../hooks/useCurrentFileId'
import { useTldrawAppUiEvents } from '../../utils/app-ui-events'
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
import { TlaIcon } from '../TlaIcon/TlaIcon'
import { ConfirmDialog } from './ConfirmDialog'
import styles from './dialogs.module.css'

const messages = defineMessages({
	cancel: { defaultMessage: 'Cancel' },
	copyInviteLink: { defaultMessage: 'Copy invite link' },
	inviteLink: { defaultMessage: 'Invite link' },
	invitesDisabled: { defaultMessage: 'Invites are disabled' },
	deleteWorkspace: { defaultMessage: 'Delete workspace' },
	inviteTeammates: { defaultMessage: 'Invite teammates' },
	leave: { defaultMessage: 'Leave' },
	leaveWorkspace: { defaultMessage: 'Leave workspace' },
	member: { defaultMessage: 'Member' },
	mustKeepOwner: {
		defaultMessage: 'A workspace must keep at least one owner. Make someone else an owner first.',
	},
	namePlaceholder: { defaultMessage: 'Workspace name' },
	owner: { defaultMessage: 'Owner' },
	regenerateInviteLink: { defaultMessage: 'Regenerate invite link' },
	remove: { defaultMessage: 'Remove' },
	you: { defaultMessage: 'you' },
})

interface WorkspaceSettingsDialogProps {
	workspaceId: string
	onClose(): void
	layout?: 'tabs' | 'sections'
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

export function WorkspaceSettingsDialog({
	workspaceId,
	onClose,
	layout = 'tabs',
}: WorkspaceSettingsDialogProps) {
	const msg = useTranslation()
	const app = useApp()
	const { addDialog } = useDialogs()
	const trackEvent = useTldrawAppUiEvents()
	const [activeTab, setActiveTab] = useState('members')
	const [copiedInviteLink, setCopiedInviteLink] = useState(false)
	const [draftName, setDraftName] = useState<string | null>(null)
	const [isSavingName, setIsSavingName] = useState(false)

	const scrollableRef = useScrollbarWhenScrollable()

	const namePlaceholderMsg = msg(messages.namePlaceholder)

	const workspaceMembership = useValue(
		'workspaceMembership',
		() => app.getWorkspaceMembership(workspaceId),
		[app, workspaceId]
	)
	const currentFileId = useCurrentFileId()
	const navigate = useNavigate()

	// Keep the dialog's top edge stable when changing tabs or adding members changes its height.
	const anchorRef = useRef<HTMLDivElement>(null)
	useLayoutEffect(() => {
		const content = anchorRef.current?.closest('.tlui-dialog__content')
		if (!(content instanceof HTMLElement)) return
		content.style.alignSelf = 'start'
		content.style.marginTop = layout === 'sections' ? '8vh' : '20vh'
		content.style.maxHeight = layout === 'sections' ? '84vh' : '70vh'
		if (layout === 'sections') content.classList.add(styles.workspaceSettingsDialog)
		return () => content.classList.remove(styles.workspaceSettingsDialog)
	}, [layout])

	// The legacy input live-saves; the sections layout saves explicitly. Track one `rename-workspace`
	// analytics event per edit session. Capture the name on open in the effect closure and
	// compare it against the latest name when the dialog unmounts.
	const workspaceName = workspaceMembership?.group?.name ?? null
	const latestWorkspaceNameRef = useRef(workspaceName)
	if (workspaceName !== null) {
		latestWorkspaceNameRef.current = workspaceName
	}
	const trackEventRef = useRef(trackEvent)
	trackEventRef.current = trackEvent
	useEffect(() => {
		const initialWorkspaceName = workspaceName
		return () => {
			const latestWorkspaceName = latestWorkspaceNameRef.current
			if (
				initialWorkspaceName !== null &&
				latestWorkspaceName !== null &&
				latestWorkspaceName !== initialWorkspaceName
			) {
				trackEventRef.current('rename-workspace', { source: 'workspace-settings' })
			}
		}
		// We intentionally capture the workspace name from the dialog's initial render.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	if (!workspaceMembership) return null
	const workspace = workspaceMembership.group
	if (!workspace) return null
	// The home workspace is a private, single-member space: it can be renamed but not shared,
	// joined, or deleted, so it shows the name field and a disabled "private workspace" invite
	// note — no shareable invite link, members list, or settings tabs.
	const isHomeWorkspace = workspaceId === app.getHomeWorkspaceId()

	const currentUserId = app.getUser().id
	const role = workspaceMembership.groupMembers.find((m) => m.userId === currentUserId)?.role
	const ownersCount = workspaceMembership.groupMembers.filter((m) => m.role === 'owner').length
	// Leaving is allowed for everyone except the last owner — a workspace invariant
	// (it must always keep at least one owner), not a capability.
	const canLeave = role !== 'owner' || ownersCount > 1
	const canManageWorkspace = can(role, 'manageWorkspace')
	// Optional column: older cached rows without it (and the migration's default)
	// mean "enabled", so treat a missing value as true.
	const inviteLinkEnabled = workspace.inviteLinkEnabled ?? true
	const roleLabels: Record<Role, string> = {
		owner: msg(messages.owner),
		member: msg(messages.member),
	}
	// Owners sort above members; within a role the current user is pinned to the top.
	const roleOrder: Record<Role, number> = { owner: 0, member: 1 }
	const roleOptions = (Object.keys(roleLabels) as Role[]).map((value) => ({
		value,
		label: roleLabels[value],
	}))

	const inviteUrl = workspace.inviteSecret
		? routes.tlaInvite(workspace.inviteSecret, { asUrl: true })
		: ''
	const nameToSave = (draftName ?? workspace.name).trim()
	const handleSaveName = async () => {
		if (!canManageWorkspace || !nameToSave || nameToSave === workspace.name || isSavingName) return
		setIsSavingName(true)
		try {
			const res = await app.z.mutate.updateWorkspace({ id: workspaceId, name: nameToSave }).client
			if (res.type === 'error') {
				app.showMutationRejectionToast(res.error)
				return
			}
			setDraftName(null)
		} finally {
			setIsSavingName(false)
		}
	}

	const handleCopyInviteLink = async () => {
		if (copiedInviteLink) return
		if (!app.copyWorkspaceInvite(workspaceId, false)) return
		setCopiedInviteLink(true)
		setTimeout(() => setCopiedInviteLink(false), 1000)
	}

	const handleToggleInviteLink = async (enabled: boolean) => {
		const res = await app.z.mutate.setWorkspaceInviteLinkEnabled({ id: workspaceId, enabled })
			.client
		if (res.type === 'error') {
			app.showMutationRejectionToast(res.error)
			return
		}
		trackEvent('set-workspace-invite-link-enabled', { source: 'workspace-settings', enabled })
	}

	const handleRegenerateInviteLink = async () => {
		const res = await app.z.mutate.regenerateWorkspaceInviteSecret({ id: workspaceId }).server
		if (res.type === 'error') {
			app.showMutationRejectionToast(res.error)
			return
		}
		trackEvent('regenerate-workspace-invite-secret', { source: 'workspace-settings' })
	}

	// Read before the mutation: afterwards the file may already be gone from the local store.
	const isViewingFileInThisWorkspace = () =>
		!!currentFileId && app.getFile(currentFileId)?.owningGroupId === workspaceId

	const handleLeaveWorkspace = async () => {
		const isCurrentlyOnAFileInThisWorkspace = isViewingFileInThisWorkspace()
		const mutation = app.z.mutate.leaveWorkspace({ workspaceId })
		const clientRes = await mutation.client
		if (clientRes.type === 'error') {
			app.showMutationRejectionToast(clientRes.error)
			return
		}
		// The last-owner check runs against local rows, so two owners leaving at once both pass
		// locally and the server rejects one. Wait for it before navigating away.
		const serverRes = await mutation.server
		if (serverRes.type === 'error') {
			app.showMutationRejectionToast(serverRes.error)
			return
		}
		trackEvent('leave-workspace', { source: 'workspace-settings' })
		onClose()
		if (isCurrentlyOnAFileInThisWorkspace) {
			navigate('/')
		}
	}

	const handleDeleteWorkspace = async () => {
		const isCurrentlyOnAFileInThisWorkspace = isViewingFileInThisWorkspace()
		const res = await app.z.mutate.deleteWorkspace({ id: workspaceId }).client
		if (res.type === 'error') {
			app.showMutationRejectionToast(res.error)
			return
		}
		trackEvent('delete-workspace', { source: 'workspace-settings' })
		onClose()
		if (isCurrentlyOnAFileInThisWorkspace) {
			navigate('/')
		}
	}

	const handleRemoveMember = async (targetUserId: string) => {
		const res = await app.z.mutate.removeWorkspaceMember({ workspaceId, targetUserId }).client
		if (res.type === 'error') {
			app.showMutationRejectionToast(res.error)
			return
		}
		trackEvent('remove-workspace-member', { source: 'workspace-settings' })
	}

	const openRegenerateConfirmDialog = () => {
		addDialog({
			component: ({ onClose }) => (
				<ConfirmDialog
					title={<F {...messages.regenerateInviteLink} />}
					description={
						<F defaultMessage="Regenerating replaces the current invite link with a new one. Anyone using the old link will need the new one to join." />
					}
					confirmLabel={<F defaultMessage="Regenerate" />}
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
					description={<F defaultMessage="Are you sure you want to leave this workspace?" />}
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
					description={
						<F
							defaultMessage="Are you sure you want to delete <strong>{workspaceName}</strong>? This action cannot be undone."
							values={{
								workspaceName: workspace.name || namePlaceholderMsg,
								strong: (chunks) => <strong>{chunks}</strong>,
							}}
						/>
					}
					confirmLabel={<F defaultMessage="Delete" />}
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
					title={<F defaultMessage="Remove member" />}
					description={
						<F
							defaultMessage="Are you sure you want to remove {name} from this workspace?"
							values={{ name: member.userName }}
						/>
					}
					confirmLabel={<F {...messages.remove} />}
					cancelLabel={<F {...messages.cancel} />}
					confirmType="danger"
					onConfirm={() => handleRemoveMember(member.userId)}
					onClose={onClose}
				/>
			),
		})
	}

	// Owners first, then members; within a role, pin the current user to the top.
	const members = [...workspaceMembership.groupMembers].sort((a, b) => {
		if (a.role !== b.role) return roleOrder[a.role] - roleOrder[b.role]
		if (a.userId === currentUserId) return -1
		if (b.userId === currentUserId) return 1
		return 0
	})

	return (
		<_Tooltip.Provider>
			{/* Marker used to find the dialog content element and anchor its position (see above). */}
			<div ref={anchorRef} hidden />
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>
					<F defaultMessage="Manage workspace" />
				</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody
				className={classNames(styles.workspaceSettingsBody, {
					[styles.workspaceSettingsSections]: layout === 'sections',
				})}
			>
				<div className={styles.section}>
					<div className={styles.sectionLabel}>
						{layout === 'sections' ? (
							<F defaultMessage="Workspace name" />
						) : (
							<F defaultMessage="Name" />
						)}
					</div>
					<div className={layout === 'sections' ? styles.workspaceNameRow : undefined}>
						<TldrawUiInput
							className={styles.dialogInput}
							defaultValue={layout === 'tabs' ? workspace.name : undefined}
							value={layout === 'sections' ? (draftName ?? workspace.name) : undefined}
							aria-label={namePlaceholderMsg}
							data-testid="workspace-settings-name"
							disabled={!canManageWorkspace || isSavingName}
							onValueChange={(value) => {
								if (layout === 'sections') {
									setDraftName(value)
									return
								}
								const name = value.trim()
								if (name && name !== workspace.name) {
									app.z.mutate.updateWorkspace({ id: workspaceId, name })
								}
							}}
							onComplete={layout === 'sections' ? handleSaveName : undefined}
							onCancel={layout === 'sections' ? () => setDraftName(null) : undefined}
							placeholder={namePlaceholderMsg}
							maxLength={MAX_WORKSPACE_NAME_LENGTH}
							autoSelect
						/>
						{layout === 'sections' && canManageWorkspace && (
							<TlaButton
								className={styles.workspaceDone}
								disabled={!nameToSave || nameToSave === workspace.name || isSavingName}
								onClick={handleSaveName}
							>
								<F defaultMessage="Save" />
							</TlaButton>
						)}
					</div>
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
							<F defaultMessage="This is your private workspace. Create a new workspace to invite teammates." />
						</p>
					</div>
				)}

				{/* Invite link, members, and settings apply only to shared workspaces. */}
				{!isHomeWorkspace && (
					<>
						{layout === 'tabs' && (
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
										<F defaultMessage="Invites are disabled" />
									</TlaButton>
								)}
							</div>
						)}

						<TlaMenuTabsRoot activeTab={activeTab} onTabChange={setActiveTab}>
							{/* The shared tabs inset their labels by the tab padding; pull the strip out
					    by that amount so the first tab's label lines up with the headings, button,
					    and member rows. The underline still spans the content width. */}
							{layout === 'tabs' && (
								<div className={styles.workspaceTabs}>
									<TlaMenuTabsTabs>
										<TlaMenuTabsTab id="members">
											<F defaultMessage="Members" />
										</TlaMenuTabsTab>
										<TlaMenuTabsTab id="settings">
											<F defaultMessage="Settings" />
										</TlaMenuTabsTab>
									</TlaMenuTabsTabs>
								</div>
							)}

							<WorkspaceSettingsPage id="members" layout={layout}>
								<div className={styles.tabPage} ref={scrollableRef}>
									<div className={styles.membersList}>
										{members.map((member) => {
											const isSelf = member.userId === currentUserId
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
														style={{
															backgroundColor:
																layout === 'sections'
																	? `color-mix(in srgb, ${member.userColor || '#ff6b35'} 20%, var(--tl-color-panel))`
																	: member.userColor || '#ff6b35',
														}}
													>
														{layout === 'sections'
															? member.userName
																	.split(/\s+/)
																	.filter(Boolean)
																	.map((part) => part[0])
																	.slice(0, 2)
																	.join('')
																	.toUpperCase()
															: member.userName.charAt(0).toUpperCase()}
													</div>
													<span className={styles.memberName}>
														{member.userName}
														{isSelf &&
															(layout === 'sections' ? (
																<span className={styles.workspaceMemberCaption}>
																	<F defaultMessage="You" />
																</span>
															) : (
																` (${msg(messages.you)})`
															))}
													</span>
													{canManageWorkspace &&
													!(layout === 'sections' && isSelf && !canRemoveMember) ? (
														<TlaMenuSelect
															id={`workspace-member-role-${member.userId}`}
															label={roleLabels[member.role]}
															value={member.role}
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
																const res = await app.z.mutate.setWorkspaceMemberRole({
																	workspaceId,
																	targetUserId: member.userId,
																	role: value,
																}).client
																if (res.type === 'error') {
																	app.showMutationRejectionToast(res.error)
																	return
																}
																trackEvent('set-workspace-member-role', {
																	source: 'workspace-settings',
																	role: value,
																})
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
								{layout === 'sections' && (
									<TlaButton
										variant="secondary"
										icon={copiedInviteLink ? 'check' : 'plus-strong'}
										className={styles.workspaceInviteButton}
										disabled={!inviteLinkEnabled || !inviteUrl}
										title={msg(messages.copyInviteLink)}
										onClick={handleCopyInviteLink}
									>
										{copiedInviteLink ? (
											<F defaultMessage="Link copied" />
										) : (
											<F {...messages.inviteTeammates} />
										)}
									</TlaButton>
								)}
							</WorkspaceSettingsPage>

							{layout === 'sections' ? (
								<section className={styles.workspaceSettingsSection}>
									<div className={styles.workspaceInviteHeading}>
										<label htmlFor="workspace-invite-enabled-switch">
											<F {...messages.inviteLink} />
										</label>
										{canManageWorkspace && (
											<TlaMenuSwitch
												id="workspace-invite-enabled-switch"
												checked={inviteLinkEnabled}
												onChange={handleToggleInviteLink}
											/>
										)}
									</div>
									<p className={styles.workspaceInviteHelp}>
										<F defaultMessage="Anyone with this link can join this workspace." />
									</p>
									<div className={styles.workspaceInviteLinkRow}>
										<input
											readOnly
											aria-label={msg(messages.inviteLink)}
											value={inviteLinkEnabled ? inviteUrl : ''}
											disabled={!inviteLinkEnabled}
											placeholder={msg(messages.invitesDisabled)}
										/>
										<TlaButton
											variant="secondary"
											icon={copiedInviteLink ? 'check' : 'copy'}
											disabled={!inviteLinkEnabled || !inviteUrl}
											onClick={handleCopyInviteLink}
										>
											{copiedInviteLink ? (
												<F defaultMessage="Copied" />
											) : (
												<F defaultMessage="Copy link" />
											)}
										</TlaButton>
									</div>
									{canManageWorkspace && (
										<button
											type="button"
											className={classNames(styles.inlineButton, styles.workspaceRegenerate)}
											onClick={openRegenerateConfirmDialog}
										>
											<TlaIcon icon="refresh" />
											<F defaultMessage="Regenerate link" />
										</button>
									)}
								</section>
							) : (
								<WorkspaceSettingsPage id="settings" layout={layout}>
									<div className={styles.tabPage} ref={scrollableRef}>
										<div className={styles.settingsPage}>
											{canManageWorkspace && (
												<>
													<TlaMenuControl>
														<TlaMenuControlLabel htmlFor="workspace-invite-enabled-switch">
															<F defaultMessage="Enable invites" />
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
								</WorkspaceSettingsPage>
							)}
						</TlaMenuTabsRoot>
					</>
				)}
			</TldrawUiDialogBody>
			{layout === 'sections' && (
				<TldrawUiDialogFooter>
					<div className={styles.workspaceFooterActions}>
						{!isHomeWorkspace && canManageWorkspace && (
							<button
								type="button"
								className={classNames(
									styles.inlineButton,
									styles.inlineButtonDanger,
									styles.workspaceDestructive
								)}
								onClick={openDeleteConfirmDialog}
							>
								<TldrawUiIcon icon="trash" label="" small />
								<F {...messages.deleteWorkspace} />
							</button>
						)}
						{!isHomeWorkspace && canLeave && (
							<button
								type="button"
								className={classNames(styles.inlineButton, styles.workspaceDestructive)}
								onClick={openLeaveConfirmDialog}
							>
								<F {...messages.leaveWorkspace} />
							</button>
						)}
					</div>
					<TlaButton className={styles.workspaceDone} onClick={onClose}>
						<F defaultMessage="Done" />
					</TlaButton>
				</TldrawUiDialogFooter>
			)}
		</_Tooltip.Provider>
	)
}

function WorkspaceSettingsPage({
	id,
	layout,
	children,
}: {
	id: string
	layout: 'tabs' | 'sections'
	children: ReactNode
}) {
	if (layout === 'tabs') return <TlaMenuTabsPage id={id}>{children}</TlaMenuTabsPage>
	return (
		<section className={styles.workspaceSettingsSection}>
			<h3>
				{id === 'members' ? (
					<F defaultMessage="Members" />
				) : (
					<F defaultMessage="Workspace settings" />
				)}
			</h3>
			{children}
		</section>
	)
}
