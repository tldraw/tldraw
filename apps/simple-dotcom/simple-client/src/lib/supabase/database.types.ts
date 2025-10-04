// Database Types
// Generated TypeScript types for Supabase database schema
// These will be auto-generated using: supabase gen types typescript

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
	public: {
		Tables: {
			users: {
				Row: {
					id: string
					email: string
					display_name: string | null
					name: string | null
					created_at: string
					updated_at: string
				}
				Insert: {
					id?: string
					email: string
					display_name?: string | null
					name?: string | null
					created_at?: string
					updated_at?: string
				}
				Update: {
					id?: string
					email?: string
					display_name?: string | null
					name?: string | null
					created_at?: string
					updated_at?: string
				}
				Relationships: []
			}
			workspaces: {
				Row: {
					id: string
					owner_id: string
					name: string
					is_private: boolean
					is_deleted: boolean
					deleted_at: string | null
					created_at: string
					updated_at: string
				}
				Insert: {
					id?: string
					owner_id: string
					name: string
					is_private?: boolean
					is_deleted?: boolean
					deleted_at?: string | null
					created_at?: string
					updated_at?: string
				}
				Update: {
					id?: string
					owner_id?: string
					name?: string
					is_private?: boolean
					is_deleted?: boolean
					deleted_at?: string | null
					created_at?: string
					updated_at?: string
				}
				Relationships: [
					{
						foreignKeyName: 'workspaces_owner_id_fkey'
						columns: ['owner_id']
						isOneToOne: false
						referencedRelation: 'users'
						referencedColumns: ['id']
					},
				]
			}
			workspace_members: {
				Row: {
					id: string
					workspace_id: string
					user_id: string
					workspace_role: 'owner' | 'member'
					joined_at: string
				}
				Insert: {
					id?: string
					workspace_id: string
					user_id: string
					workspace_role?: 'owner' | 'member'
					joined_at?: string
				}
				Update: {
					id?: string
					workspace_id?: string
					user_id?: string
					workspace_role?: 'owner' | 'member'
					joined_at?: string
				}
				Relationships: [
					{
						foreignKeyName: 'workspace_members_workspace_id_fkey'
						columns: ['workspace_id']
						isOneToOne: false
						referencedRelation: 'workspaces'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'workspace_members_user_id_fkey'
						columns: ['user_id']
						isOneToOne: false
						referencedRelation: 'users'
						referencedColumns: ['id']
					},
				]
			}
			invitation_links: {
				Row: {
					id: string
					workspace_id: string
					token: string
					enabled: boolean
					created_by: string
					created_at: string
					regenerated_at: string | null
				}
				Insert: {
					id?: string
					workspace_id: string
					token: string
					enabled?: boolean
					created_by: string
					created_at?: string
					regenerated_at?: string | null
				}
				Update: {
					id?: string
					workspace_id?: string
					token?: string
					enabled?: boolean
					created_by?: string
					created_at?: string
					regenerated_at?: string | null
				}
				Relationships: [
					{
						foreignKeyName: 'invitation_links_workspace_id_fkey'
						columns: ['workspace_id']
						isOneToOne: true
						referencedRelation: 'workspaces'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'invitation_links_created_by_fkey'
						columns: ['created_by']
						isOneToOne: false
						referencedRelation: 'users'
						referencedColumns: ['id']
					},
				]
			}
			folders: {
				Row: {
					id: string
					workspace_id: string
					parent_folder_id: string | null
					name: string
					created_by: string
					created_at: string
					updated_at: string
				}
				Insert: {
					id?: string
					workspace_id: string
					parent_folder_id?: string | null
					name: string
					created_by: string
					created_at?: string
					updated_at?: string
				}
				Update: {
					id?: string
					workspace_id?: string
					parent_folder_id?: string | null
					name?: string
					created_by?: string
					created_at?: string
					updated_at?: string
				}
				Relationships: [
					{
						foreignKeyName: 'folders_workspace_id_fkey'
						columns: ['workspace_id']
						isOneToOne: false
						referencedRelation: 'workspaces'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'folders_parent_folder_id_fkey'
						columns: ['parent_folder_id']
						isOneToOne: false
						referencedRelation: 'folders'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'folders_created_by_fkey'
						columns: ['created_by']
						isOneToOne: false
						referencedRelation: 'users'
						referencedColumns: ['id']
					},
				]
			}
			documents: {
				Row: {
					id: string
					workspace_id: string
					folder_id: string | null
					name: string
					created_by: string
					sharing_mode: 'private' | 'public_read_only' | 'public_editable'
					is_archived: boolean
					archived_at: string | null
					r2_key: string | null
					created_at: string
					updated_at: string
				}
				Insert: {
					id?: string
					workspace_id: string
					folder_id?: string | null
					name: string
					created_by: string
					sharing_mode?: 'private' | 'public_read_only' | 'public_editable'
					is_archived?: boolean
					archived_at?: string | null
					r2_key?: string | null
					created_at?: string
					updated_at?: string
				}
				Update: {
					id?: string
					workspace_id?: string
					folder_id?: string | null
					name?: string
					created_by?: string
					sharing_mode?: 'private' | 'public_read_only' | 'public_editable'
					is_archived?: boolean
					archived_at?: string | null
					r2_key?: string | null
					created_at?: string
					updated_at?: string
				}
				Relationships: [
					{
						foreignKeyName: 'documents_workspace_id_fkey'
						columns: ['workspace_id']
						isOneToOne: false
						referencedRelation: 'workspaces'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'documents_folder_id_fkey'
						columns: ['folder_id']
						isOneToOne: false
						referencedRelation: 'folders'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'documents_created_by_fkey'
						columns: ['created_by']
						isOneToOne: false
						referencedRelation: 'users'
						referencedColumns: ['id']
					},
				]
			}
			document_access_log: {
				Row: {
					id: string
					document_id: string
					workspace_id: string
					user_id: string
					accessed_at: string
				}
				Insert: {
					id?: string
					document_id: string
					workspace_id: string
					user_id: string
					accessed_at?: string
				}
				Update: {
					id?: string
					document_id?: string
					workspace_id?: string
					user_id?: string
					accessed_at?: string
				}
				Relationships: [
					{
						foreignKeyName: 'document_access_log_document_id_fkey'
						columns: ['document_id']
						isOneToOne: false
						referencedRelation: 'documents'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'document_access_log_workspace_id_fkey'
						columns: ['workspace_id']
						isOneToOne: false
						referencedRelation: 'workspaces'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'document_access_log_user_id_fkey'
						columns: ['user_id']
						isOneToOne: false
						referencedRelation: 'users'
						referencedColumns: ['id']
					},
				]
			}
			presence: {
				Row: {
					session_id: string
					document_id: string
					user_id: string | null
					display_name: string | null
					cursor_position: Json | null
					last_seen_at: string
				}
				Insert: {
					session_id?: string
					document_id: string
					user_id?: string | null
					display_name?: string | null
					cursor_position?: Json | null
					last_seen_at?: string
				}
				Update: {
					session_id?: string
					document_id?: string
					user_id?: string | null
					display_name?: string | null
					cursor_position?: Json | null
					last_seen_at?: string
				}
				Relationships: [
					{
						foreignKeyName: 'presence_document_id_fkey'
						columns: ['document_id']
						isOneToOne: false
						referencedRelation: 'documents'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'presence_user_id_fkey'
						columns: ['user_id']
						isOneToOne: false
						referencedRelation: 'users'
						referencedColumns: ['id']
					},
				]
			}
		}
		Views: {}
		Functions: {}
		Enums: {
			workspace_role: 'owner' | 'member'
			sharing_mode: 'private' | 'public_read_only' | 'public_editable'
		}
		CompositeTypes: {}
	}
}
