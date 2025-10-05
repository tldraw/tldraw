import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DocumentViewClient from './document-view-client'

interface DocumentViewPageProps {
	params: Promise<{ documentId: string }>
}

async function getDocumentAccess(userId: string | null, documentId: string) {
	const supabase = await createClient()

	// Fetch document with workspace info
	const { data: document, error } = await supabase
		.from('documents')
		.select('*, workspaces!inner(*)')
		.eq('id', documentId)
		.single()

	if (error || !document) {
		return null
	}

	const workspace = (document as any).workspaces

	// Check if workspace is deleted
	if (workspace.is_deleted) {
		return null
	}

	// If user is not authenticated, check sharing mode
	if (!userId) {
		// Only allow access to public documents for unauthenticated users
		if (document.sharing_mode === 'private') {
			return { requiresAuth: true, document: null }
		}

		return {
			requiresAuth: false,
			document,
			workspace,
			accessType: 'guest' as const,
			canEdit: document.sharing_mode === 'public_editable',
		}
	}

	// Check if user is workspace owner or member
	const isOwner = workspace.owner_id === userId

	if (isOwner) {
		return {
			requiresAuth: false,
			document,
			workspace,
			accessType: 'member' as const,
			canEdit: true,
		}
	}

	const { data: membership } = await supabase
		.from('workspace_members')
		.select('role')
		.eq('workspace_id', workspace.id)
		.eq('user_id', userId)
		.single()

	if (membership) {
		return {
			requiresAuth: false,
			document,
			workspace,
			accessType: 'member' as const,
			canEdit: true,
		}
	}

	// User is not a member, check sharing mode
	if (document.sharing_mode === 'private') {
		return null // No access
	}

	// User is a guest
	return {
		requiresAuth: false,
		document,
		workspace,
		accessType: 'guest' as const,
		canEdit: document.sharing_mode === 'public_editable',
	}
}

export default async function DocumentViewPage({ params }: DocumentViewPageProps) {
	const { documentId } = await params

	// Get session (optional - guests can view public documents)
	const user = await getCurrentUser()

	const userId = user?.id || null

	// Get document access
	const accessData = await getDocumentAccess(userId, documentId)

	if (!accessData) {
		redirect('/403')
	}

	if (accessData.requiresAuth) {
		redirect(`/login?redirect=/d/${documentId}`)
	}

	// Log document access if user is authenticated
	if (userId && accessData.document) {
		const supabase = await createClient()
		await supabase.from('document_access_log').insert({
			user_id: userId,
			document_id: documentId,
			workspace_id: accessData.document.workspace_id,
			accessed_at: new Date().toISOString(),
		})
	}

	return (
		<DocumentViewClient
			document={accessData.document!}
			workspace={accessData.workspace!}
			accessType={accessData.accessType!}
			canEdit={accessData.canEdit!}
			userId={userId}
		/>
	)
}
