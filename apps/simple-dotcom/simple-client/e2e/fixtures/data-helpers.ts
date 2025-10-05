import type { SupabaseClient } from '@supabase/supabase-js'

export type CreateWorkspaceOptions = {
	supabase: SupabaseClient
	ownerId: string
	name?: string
	isPrivate?: boolean
	members?: Array<{
		userId: string
		role?: 'owner' | 'member'
	}>
}

export type CreateDocumentOptions = {
	supabase: SupabaseClient
	workspaceId: string
	createdBy: string
	name?: string
	folderId?: string | null
	sharingMode?: 'private' | 'public_read_only' | 'public_editable'
	logAccessForUserId?: string
	accessedAt?: string
}

function defaultWorkspaceName() {
	return `Workspace ${Date.now()}`
}

function defaultDocumentName() {
	return `Document ${Date.now()}`
}

export class TestDataBuilder {
	constructor(private readonly supabase: SupabaseClient) {}

	async createWorkspace({
		supabase = this.supabase,
		ownerId,
		name = defaultWorkspaceName(),
		isPrivate = false,
		members = [],
	}: Omit<CreateWorkspaceOptions, 'supabase'> & { supabase?: SupabaseClient }) {
		const { data: workspace, error } = await supabase
			.from('workspaces')
			.insert({
				owner_id: ownerId,
				name,
				is_private: isPrivate,
			})
			.select()
			.single()

		if (error || !workspace) {
			throw new Error(`Failed to create workspace: ${error?.message ?? 'Unknown error'}`)
		}

		const membershipRows = [
			{ workspace_id: workspace.id, user_id: ownerId, role: 'owner' as const },
			...members.map((member) => ({
				workspace_id: workspace.id,
				user_id: member.userId,
				role: member.role ?? 'member',
			})),
		]

		const uniqueMemberships = membershipRows.filter(
			(row, index, self) =>
				self.findIndex(
					(other) => other.workspace_id === row.workspace_id && other.user_id === row.user_id
				) === index
		)

		if (uniqueMemberships.length > 0) {
			const { error: membershipError } = await supabase
				.from('workspace_members')
				.insert(uniqueMemberships)

			if (membershipError && membershipError.code !== '23505') {
				throw new Error(
					`Failed to add workspace members: ${membershipError.message ?? 'unknown membership error'}`
				)
			}
		}

		return workspace
	}

	async createDocument({
		supabase = this.supabase,
		workspaceId,
		createdBy,
		name = defaultDocumentName(),
		folderId = null,
		sharingMode = 'private',
		logAccessForUserId,
		accessedAt,
	}: Omit<CreateDocumentOptions, 'supabase'> & { supabase?: SupabaseClient }) {
		const { data: document, error } = await supabase
			.from('documents')
			.insert({
				workspace_id: workspaceId,
				created_by: createdBy,
				name,
				folder_id: folderId,
				sharing_mode: sharingMode,
			})
			.select()
			.single()

		if (error || !document) {
			throw new Error(`Failed to create document: ${error?.message ?? 'Unknown error'}`)
		}

		if (logAccessForUserId) {
			await supabase.from('document_access_log').insert({
				document_id: document.id,
				workspace_id: workspaceId,
				user_id: logAccessForUserId,
				accessed_at: accessedAt ?? new Date().toISOString(),
			})
		}

		return document
	}

	async addWorkspaceMember(
		workspaceId: string,
		userId: string,
		role: 'owner' | 'member' = 'member'
	) {
		const { error } = await this.supabase
			.from('workspace_members')
			.insert({ workspace_id: workspaceId, user_id: userId, role })

		if (error && error.code !== '23505') {
			throw new Error(`Failed to add workspace member: ${error.message}`)
		}
	}
}
