export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
	// Allows to automatically instantiate createClient with right options
	// instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
	__InternalSupabase: {
		PostgrestVersion: '13.0.5'
	}
	public: {
		Tables: {
			document_access_log: {
				Row: {
					accessed_at: string
					document_id: string
					id: string
					user_id: string
					workspace_id: string
				}
				Insert: {
					accessed_at?: string
					document_id: string
					id?: string
					user_id: string
					workspace_id: string
				}
				Update: {
					accessed_at?: string
					document_id?: string
					id?: string
					user_id?: string
					workspace_id?: string
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
						foreignKeyName: 'document_access_log_user_id_fkey'
						columns: ['user_id']
						isOneToOne: false
						referencedRelation: 'users'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'document_access_log_workspace_id_fkey'
						columns: ['workspace_id']
						isOneToOne: false
						referencedRelation: 'workspaces'
						referencedColumns: ['id']
					},
				]
			}
			documents: {
				Row: {
					archived_at: string | null
					created_at: string
					created_by: string
					folder_id: string | null
					id: string
					is_archived: boolean
					name: string
					r2_key: string | null
					sharing_mode: Database['public']['Enums']['document_sharing_mode']
					updated_at: string
					workspace_id: string
				}
				Insert: {
					archived_at?: string | null
					created_at?: string
					created_by: string
					folder_id?: string | null
					id?: string
					is_archived?: boolean
					name: string
					r2_key?: string | null
					sharing_mode?: Database['public']['Enums']['document_sharing_mode']
					updated_at?: string
					workspace_id: string
				}
				Update: {
					archived_at?: string | null
					created_at?: string
					created_by?: string
					folder_id?: string | null
					id?: string
					is_archived?: boolean
					name?: string
					r2_key?: string | null
					sharing_mode?: Database['public']['Enums']['document_sharing_mode']
					updated_at?: string
					workspace_id?: string
				}
				Relationships: [
					{
						foreignKeyName: 'documents_created_by_fkey'
						columns: ['created_by']
						isOneToOne: false
						referencedRelation: 'users'
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
						foreignKeyName: 'documents_workspace_id_fkey'
						columns: ['workspace_id']
						isOneToOne: false
						referencedRelation: 'workspaces'
						referencedColumns: ['id']
					},
				]
			}
			folders: {
				Row: {
					created_at: string
					created_by: string
					id: string
					name: string
					parent_folder_id: string | null
					updated_at: string
					workspace_id: string
				}
				Insert: {
					created_at?: string
					created_by: string
					id?: string
					name: string
					parent_folder_id?: string | null
					updated_at?: string
					workspace_id: string
				}
				Update: {
					created_at?: string
					created_by?: string
					id?: string
					name?: string
					parent_folder_id?: string | null
					updated_at?: string
					workspace_id?: string
				}
				Relationships: [
					{
						foreignKeyName: 'folders_created_by_fkey'
						columns: ['created_by']
						isOneToOne: false
						referencedRelation: 'users'
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
						foreignKeyName: 'folders_workspace_id_fkey'
						columns: ['workspace_id']
						isOneToOne: false
						referencedRelation: 'workspaces'
						referencedColumns: ['id']
					},
				]
			}
			invitation_links: {
				Row: {
					created_at: string
					created_by: string
					enabled: boolean
					id: string
					regenerated_at: string | null
					token: string
					workspace_id: string
				}
				Insert: {
					created_at?: string
					created_by: string
					enabled?: boolean
					id?: string
					regenerated_at?: string | null
					token: string
					workspace_id: string
				}
				Update: {
					created_at?: string
					created_by?: string
					enabled?: boolean
					id?: string
					regenerated_at?: string | null
					token?: string
					workspace_id?: string
				}
				Relationships: [
					{
						foreignKeyName: 'invitation_links_created_by_fkey'
						columns: ['created_by']
						isOneToOne: false
						referencedRelation: 'users'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'invitation_links_workspace_id_fkey'
						columns: ['workspace_id']
						isOneToOne: true
						referencedRelation: 'workspaces'
						referencedColumns: ['id']
					},
				]
			}
			presence: {
				Row: {
					cursor_position: Json | null
					document_id: string
					id: string
					last_seen_at: string
					session_id: string
					user_id: string | null
				}
				Insert: {
					cursor_position?: Json | null
					document_id: string
					id?: string
					last_seen_at?: string
					session_id: string
					user_id?: string | null
				}
				Update: {
					cursor_position?: Json | null
					document_id?: string
					id?: string
					last_seen_at?: string
					session_id?: string
					user_id?: string | null
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
			users: {
				Row: {
					created_at: string
					display_name: string | null
					email: string
					id: string
					name: string | null
					updated_at: string
				}
				Insert: {
					created_at?: string
					display_name?: string | null
					email: string
					id: string
					name?: string | null
					updated_at?: string
				}
				Update: {
					created_at?: string
					display_name?: string | null
					email?: string
					id?: string
					name?: string | null
					updated_at?: string
				}
				Relationships: []
			}
			workspace_members: {
				Row: {
					id: string
					joined_at: string
					role: Database['public']['Enums']['workspace_role']
					user_id: string
					workspace_id: string
				}
				Insert: {
					id?: string
					joined_at?: string
					role?: Database['public']['Enums']['workspace_role']
					user_id: string
					workspace_id: string
				}
				Update: {
					id?: string
					joined_at?: string
					role?: Database['public']['Enums']['workspace_role']
					user_id?: string
					workspace_id?: string
				}
				Relationships: [
					{
						foreignKeyName: 'workspace_members_user_id_fkey'
						columns: ['user_id']
						isOneToOne: false
						referencedRelation: 'users'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'workspace_members_workspace_id_fkey'
						columns: ['workspace_id']
						isOneToOne: false
						referencedRelation: 'workspaces'
						referencedColumns: ['id']
					},
				]
			}
			workspaces: {
				Row: {
					created_at: string
					deleted_at: string | null
					id: string
					is_deleted: boolean
					is_private: boolean
					name: string
					owner_id: string
					updated_at: string
				}
				Insert: {
					created_at?: string
					deleted_at?: string | null
					id?: string
					is_deleted?: boolean
					is_private?: boolean
					name: string
					owner_id: string
					updated_at?: string
				}
				Update: {
					created_at?: string
					deleted_at?: string | null
					id?: string
					is_deleted?: boolean
					is_private?: boolean
					name?: string
					owner_id?: string
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
		}
		Views: {
			[_ in never]: never
		}
		Functions: {
			cleanup_stale_presence: {
				Args: Record<PropertyKey, never>
				Returns: undefined
			}
		}
		Enums: {
			document_sharing_mode: 'private' | 'public_read_only' | 'public_editable'
			workspace_role: 'owner' | 'member'
		}
		CompositeTypes: {
			[_ in never]: never
		}
	}
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
	DefaultSchemaTableNameOrOptions extends
		| keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals
	}
		? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
				DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
		: never = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals
}
	? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
			DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
			Row: infer R
		}
		? R
		: never
	: DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
		? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
				Row: infer R
			}
			? R
			: never
		: never

export type TablesInsert<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema['Tables']
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
		: never = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
			Insert: infer I
		}
		? I
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
		? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
				Insert: infer I
			}
			? I
			: never
		: never

export type TablesUpdate<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema['Tables']
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
		: never = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
			Update: infer U
		}
		? U
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
		? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
				Update: infer U
			}
			? U
			: never
		: never

export type Enums<
	DefaultSchemaEnumNameOrOptions extends
		| keyof DefaultSchema['Enums']
		| { schema: keyof DatabaseWithoutInternals },
	EnumName extends DefaultSchemaEnumNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
		: never = never,
> = DefaultSchemaEnumNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals
}
	? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
	: DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
		? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
		: never

export type CompositeTypes<
	PublicCompositeTypeNameOrOptions extends
		| keyof DefaultSchema['CompositeTypes']
		| { schema: keyof DatabaseWithoutInternals },
	CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals
	}
		? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
		: never = never,
> = PublicCompositeTypeNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals
}
	? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
	: PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
		? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
		: never

export const Constants = {
	public: {
		Enums: {
			document_sharing_mode: ['private', 'public_read_only', 'public_editable'],
			workspace_role: ['owner', 'member'],
		},
	},
} as const
