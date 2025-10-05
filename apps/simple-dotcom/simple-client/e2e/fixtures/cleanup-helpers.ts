import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Comprehensive cleanup utilities for E2E test data isolation.
 * Ensures tests start from a clean state and leave no orphaned data.
 */

export type CleanupResult = {
	success: boolean
	errors: string[]
	deletedCounts: {
		users: number
		workspaces: number
		workspaceMembers: number
		documents: number
		folders: number
		invitationLinks: number
		presence: number
		documentAccessLog: number
	}
}

/**
 * Delete all test data for a specific user ID.
 * Cascades through all related tables in the correct order.
 */
export async function cleanupUserData(
	supabase: SupabaseClient,
	userId: string
): Promise<CleanupResult> {
	const result: CleanupResult = {
		success: true,
		errors: [],
		deletedCounts: {
			users: 0,
			workspaces: 0,
			workspaceMembers: 0,
			documents: 0,
			folders: 0,
			invitationLinks: 0,
			presence: 0,
			documentAccessLog: 0,
		},
	}

	try {
		// 1. Delete presence records (no FK dependencies)
		const presenceResult = await supabase.from('presence').delete().eq('user_id', userId)
		if (presenceResult.error) {
			result.errors.push(`Failed to delete presence: ${presenceResult.error.message}`)
			result.success = false
		} else {
			result.deletedCounts.presence = presenceResult.count || 0
		}

		// 2. Delete document access log entries
		const accessLogResult = await supabase
			.from('document_access_log')
			.delete()
			.eq('user_id', userId)
		if (accessLogResult.error) {
			result.errors.push(`Failed to delete access log: ${accessLogResult.error.message}`)
			result.success = false
		} else {
			result.deletedCounts.documentAccessLog = accessLogResult.count || 0
		}

		// 3. Get all workspaces where user is owner (to cascade delete documents/folders)
		const { data: ownedWorkspaces, error: workspacesError } = await supabase
			.from('workspaces')
			.select('id')
			.eq('owner_id', userId)

		if (workspacesError) {
			result.errors.push(`Failed to query workspaces: ${workspacesError.message}`)
			result.success = false
		} else if (ownedWorkspaces && ownedWorkspaces.length > 0) {
			const workspaceIds = ownedWorkspaces.map((w) => w.id)

			// 4. Delete documents in owned workspaces
			const documentsResult = await supabase
				.from('documents')
				.delete()
				.in('workspace_id', workspaceIds)
			if (documentsResult.error) {
				result.errors.push(`Failed to delete documents: ${documentsResult.error.message}`)
				result.success = false
			} else {
				result.deletedCounts.documents = documentsResult.count || 0
			}

			// 5. Delete folders in owned workspaces
			const foldersResult = await supabase.from('folders').delete().in('workspace_id', workspaceIds)
			if (foldersResult.error) {
				result.errors.push(`Failed to delete folders: ${foldersResult.error.message}`)
				result.success = false
			} else {
				result.deletedCounts.folders = foldersResult.count || 0
			}

			// 6. Delete invitation links for owned workspaces
			const invitesResult = await supabase
				.from('invitation_links')
				.delete()
				.in('workspace_id', workspaceIds)
			if (invitesResult.error) {
				result.errors.push(`Failed to delete invitation links: ${invitesResult.error.message}`)
				result.success = false
			} else {
				result.deletedCounts.invitationLinks = invitesResult.count || 0
			}

			// 7. Delete workspace members for owned workspaces
			const membersResult = await supabase
				.from('workspace_members')
				.delete()
				.in('workspace_id', workspaceIds)
			if (membersResult.error) {
				result.errors.push(`Failed to delete workspace members: ${membersResult.error.message}`)
				result.success = false
			} else {
				result.deletedCounts.workspaceMembers = membersResult.count || 0
			}

			// 8. Delete owned workspaces
			const workspacesDeleteResult = await supabase
				.from('workspaces')
				.delete()
				.in('id', workspaceIds)
			if (workspacesDeleteResult.error) {
				result.errors.push(`Failed to delete workspaces: ${workspacesDeleteResult.error.message}`)
				result.success = false
			} else {
				result.deletedCounts.workspaces = workspacesDeleteResult.count || 0
			}
		}

		// 9. Delete workspace memberships where user is a member (but not owner)
		const otherMembershipsResult = await supabase
			.from('workspace_members')
			.delete()
			.eq('user_id', userId)
		if (otherMembershipsResult.error) {
			result.errors.push(
				`Failed to delete other memberships: ${otherMembershipsResult.error.message}`
			)
			result.success = false
		}
		// Note: Already counted above, so we don't add to deletedCounts here

		// 10. Finally, delete the user from Better Auth users table
		const userResult = await supabase.from('users').delete().eq('id', userId)
		if (userResult.error) {
			result.errors.push(`Failed to delete user: ${userResult.error.message}`)
			result.success = false
		} else {
			result.deletedCounts.users = userResult.count || 0
		}
	} catch (error) {
		result.success = false
		result.errors.push(`Unexpected error during cleanup: ${error}`)
	}

	return result
}

/**
 * Delete test users by email pattern (e.g., all users with test-* emails).
 * Useful for cleanup after test runs.
 *
 * Uses RPC function for more efficient cleanup when available.
 */
export async function cleanupTestUsersByPattern(
	supabase: SupabaseClient,
	emailPattern: string
): Promise<CleanupResult> {
	// Try using RPC function first (more efficient for bulk deletes)
	try {
		const { data, error } = await supabase.rpc('cleanup_test_data', {
			email_pattern: emailPattern,
		})

		if (!error && data) {
			return {
				success: data.success,
				errors: data.error ? [data.error] : [],
				deletedCounts: {
					users: data.deleted_counts?.users || 0,
					workspaces: data.deleted_counts?.workspaces || 0,
					workspaceMembers: data.deleted_counts?.workspace_members || 0,
					documents: data.deleted_counts?.documents || 0,
					folders: data.deleted_counts?.folders || 0,
					invitationLinks: data.deleted_counts?.invitation_links || 0,
					presence: data.deleted_counts?.presence || 0,
					documentAccessLog: data.deleted_counts?.document_access_log || 0,
				},
			}
		}

		// If RPC failed, fall back to manual cleanup
		console.log('RPC cleanup failed, falling back to manual cleanup:', error?.message)
	} catch (_rpcError) {
		console.log('RPC not available, using manual cleanup')
	}

	// Fallback: manual cleanup by querying and deleting users individually
	const aggregateResult: CleanupResult = {
		success: true,
		errors: [],
		deletedCounts: {
			users: 0,
			workspaces: 0,
			workspaceMembers: 0,
			documents: 0,
			folders: 0,
			invitationLinks: 0,
			presence: 0,
			documentAccessLog: 0,
		},
	}

	try {
		// Find all test users matching the pattern
		const { data: testUsers, error: queryError } = await supabase
			.from('users')
			.select('id, email')
			.like('email', emailPattern)

		if (queryError) {
			aggregateResult.errors.push(`Failed to query test users: ${queryError.message}`)
			aggregateResult.success = false
			return aggregateResult
		}

		if (!testUsers || testUsers.length === 0) {
			return aggregateResult
		}

		// Clean up each user individually
		for (const user of testUsers) {
			const cleanupResult = await cleanupUserData(supabase, user.id)

			// Aggregate counts
			aggregateResult.deletedCounts.users += cleanupResult.deletedCounts.users
			aggregateResult.deletedCounts.workspaces += cleanupResult.deletedCounts.workspaces
			aggregateResult.deletedCounts.workspaceMembers += cleanupResult.deletedCounts.workspaceMembers
			aggregateResult.deletedCounts.documents += cleanupResult.deletedCounts.documents
			aggregateResult.deletedCounts.folders += cleanupResult.deletedCounts.folders
			aggregateResult.deletedCounts.invitationLinks += cleanupResult.deletedCounts.invitationLinks
			aggregateResult.deletedCounts.presence += cleanupResult.deletedCounts.presence
			aggregateResult.deletedCounts.documentAccessLog +=
				cleanupResult.deletedCounts.documentAccessLog

			if (!cleanupResult.success) {
				aggregateResult.success = false
				aggregateResult.errors.push(
					`Errors cleaning user ${user.email}: ${cleanupResult.errors.join(', ')}`
				)
			}
		}
	} catch (error) {
		aggregateResult.success = false
		aggregateResult.errors.push(`Unexpected error during pattern cleanup: ${error}`)
	}

	return aggregateResult
}

/**
 * Assert cleanup was successful and log detailed information.
 * Throws an error with actionable logging if cleanup fails.
 */
export function assertCleanupSuccess(result: CleanupResult, context: string) {
	if (!result.success) {
		const errorMessage = [
			`❌ Cleanup failed for ${context}`,
			'Errors:',
			...result.errors.map((e) => `  - ${e}`),
			'',
			'Deleted counts:',
			...Object.entries(result.deletedCounts).map(([table, count]) => `  - ${table}: ${count}`),
		].join('\n')

		throw new Error(errorMessage)
	}

	// Log success for visibility
	console.log(`✅ Cleanup successful for ${context}`)
	const totalDeleted = Object.values(result.deletedCounts).reduce((sum, count) => sum + count, 0)
	if (totalDeleted > 0) {
		console.log(
			`   Deleted ${totalDeleted} records:`,
			Object.entries(result.deletedCounts)
				.filter(([, count]) => count > 0)
				.map(([table, count]) => `${table}:${count}`)
				.join(', ')
		)
	}
}
