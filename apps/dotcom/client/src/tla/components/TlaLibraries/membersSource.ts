import type { TlaGroupUser } from '@tldraw/dotcom-shared'
import {
	LibraryItemRecordType,
	LibraryNotFoundError,
	LibraryPermissionError,
	LibraryRecordType,
	type LibrarySource,
	type TLLibrary,
	type TLLibraryAction,
	type TLLibraryId,
	type TLLibraryItem,
	type TLLibraryItemContent,
	type TLLibraryItemId,
	type TLLibraryOwner,
	type TLLibraryTarget,
} from '@tldraw/libraries'
import { computed, defineMessages, type TLImageAsset } from 'tldraw'
import type { TldrawApp } from '../../app/TldrawApp'
import { getInitial, getMemberContent, loadAvatarAsset } from './memberContent'

const messages = defineMessages({
	members: { defaultMessage: 'Members' },
})

/** A workspace member, as their membership row has them. */
export type Member = Pick<
	TlaGroupUser,
	'userId' | 'groupId' | 'userName' | 'userColor' | 'userAvatar' | 'createdAt'
>

// The workspace settings dialog's colour for a member without one.
const DEFAULT_MEMBER_COLOR = '#ff6b35'

const getLibraryId = (workspaceId: string) => LibraryRecordType.createId(`members-${workspaceId}`)

const getItemId = (member: Member) =>
	LibraryItemRecordType.createId(`member-${member.groupId}-${member.userId}`)

const escapeXml = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

/**
 * A member's initial on their colour, as the workspace settings dialog shows a member, for a member
 * without an avatar. An SVG data URL: made without loading or rendering anything, and fetchable
 * when an item is copied to another library, which stores its thumbnail.
 */
export function getInitialThumbnail(member: Pick<Member, 'userName' | 'userColor'>) {
	const color = escapeXml(member.userColor || DEFAULT_MEMBER_COLOR)
	const svg =
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
		`<circle cx="32" cy="32" r="32" fill="${color}"/>` +
		`<text x="32" y="32" dy=".35em" text-anchor="middle" fill="#fff" ` +
		`font-family="system-ui, sans-serif" font-size="30" font-weight="600">` +
		`${escapeXml(getInitial(member.userName))}</text></svg>`
	return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

/**
 * The members of each workspace the user shares with others, as one read-only "Members" library
 * owned by each workspace, its members sorted by name. Composed after the workspaces' own libraries,
 * it lists each workspace's members in that workspace's group, beside its libraries. Listed from the workspace memberships the
 * app syncs through Zero, so joins, leaves, renames and avatar changes show at once. The home
 * workspace is left out: its only member is the user.
 *
 * An item places the member's avatar, cropped to a circle, over their name, the name as it is when
 * placed. A member without an avatar is placed as their initial in a circle.
 */
export class TldrawAppMembersSource implements LibrarySource {
	readonly id = 'dotcom-members'

	private readonly assets = new Map<string, Promise<TLImageAsset>>()

	private readonly workspaces$ = computed('member workspaces', () => {
		const homeId = this.app.getHomeWorkspaceId()
		return this.app.getWorkspaceMemberships().flatMap((membership) =>
			membership.groupId !== homeId && membership.group
				? [
						{
							owner: { id: membership.groupId, name: membership.group.name },
							library: LibraryRecordType.create({
								id: getLibraryId(membership.groupId),
								name: this.app.msg(messages.members),
								ownerId: membership.groupId,
							}),
							members: [...membership.groupMembers].sort(
								(a, b) => a.userName.localeCompare(b.userName) || a.userId.localeCompare(b.userId)
							),
						},
					]
				: []
		)
	})

	private readonly items$ = computed('member items', () => {
		const items = new Map<TLLibraryId, TLLibraryItem[]>()
		for (const { library, members } of this.workspaces$.get()) {
			items.set(
				library.id,
				members.map((member) =>
					LibraryItemRecordType.create({
						id: getItemId(member),
						libraryId: library.id,
						name: member.userName,
						thumbnail: member.userAvatar || getInitialThumbnail(member),
						createdAt: member.createdAt,
					})
				)
			)
		}
		return items
	})

	constructor(
		private readonly app: Pick<TldrawApp, 'getHomeWorkspaceId' | 'getWorkspaceMemberships' | 'msg'>
	) {}

	getLibraries(): TLLibrary[] {
		return this.workspaces$.get().map(({ library }) => library)
	}

	getLibraryOwners(): TLLibraryOwner[] {
		return this.workspaces$.get().map(({ owner }) => owner)
	}

	getItems(libraryId: TLLibraryId): TLLibraryItem[] {
		return this.items$.get().get(libraryId) ?? []
	}

	async getItemContent(itemId: TLLibraryItemId): Promise<TLLibraryItemContent> {
		const member = this.workspaces$
			.get()
			.flatMap(({ members }) => members)
			.find((m) => getItemId(m) === itemId)
		if (!member) throw new LibraryNotFoundError(itemId)
		const avatar = member.userAvatar ? await this.getAvatarAsset(member) : undefined
		return { formatVersion: 1, content: getMemberContent(member, avatar) }
	}

	can(_action: TLLibraryAction, _target?: TLLibraryTarget) {
		return false
	}

	async createLibrary(): Promise<TLLibrary> {
		throw new LibraryPermissionError('createLibrary')
	}

	async renameLibrary(libraryId: TLLibraryId): Promise<void> {
		throw new LibraryPermissionError('renameLibrary', libraryId)
	}

	async deleteLibrary(libraryId: TLLibraryId): Promise<void> {
		throw new LibraryPermissionError('deleteLibrary', libraryId)
	}

	async addItem(libraryId: TLLibraryId): Promise<TLLibraryItem> {
		throw new LibraryPermissionError('addItem', libraryId)
	}

	async renameItem(itemId: TLLibraryItemId): Promise<void> {
		throw new LibraryPermissionError('renameItem', this.getItemLibraryId(itemId))
	}

	async deleteItem(itemId: TLLibraryItemId): Promise<void> {
		throw new LibraryPermissionError('deleteItem', this.getItemLibraryId(itemId))
	}

	private getItemLibraryId(itemId: TLLibraryItemId) {
		for (const [libraryId, items] of this.items$.get()) {
			if (items.some((item) => item.id === itemId)) return libraryId
		}
		return undefined
	}

	/** Fetched once per avatar; a fetch that fails is tried again next time. */
	private getAvatarAsset(member: Member) {
		let asset = this.assets.get(member.userAvatar)
		if (!asset) {
			asset = loadAvatarAsset(member)
			asset.catch(() => this.assets.delete(member.userAvatar))
			this.assets.set(member.userAvatar, asset)
		}
		return asset
	}
}
