export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
	graphql_public: {
		Tables: {
			[_ in never]: never
		}
		Views: {
			[_ in never]: never
		}
		Functions: {
			graphql: {
				Args: {
					extensions?: Json
					operationName?: string
					query?: string
					variables?: Json
				}
				Returns: Json
			}
		}
		Enums: {
			[_ in never]: never
		}
		CompositeTypes: {
			[_ in never]: never
		}
	}
	public: {
		Tables: {
			audit_logs: {
				Row: {
					action: string
					created_at: string
					document_id: string | null
					id: string
					metadata: Json | null
					user_id: string
					workspace_id: string
				}
				Insert: {
					action: string
					created_at?: string
					document_id?: string | null
					id?: string
					metadata?: Json | null
					user_id: string
					workspace_id: string
				}
				Update: {
					action?: string
					created_at?: string
					document_id?: string | null
					id?: string
					metadata?: Json | null
					user_id?: string
					workspace_id?: string
				}
				Relationships: [
					{
						foreignKeyName: 'audit_logs_user_id_fkey'
						columns: ['user_id']
						isOneToOne: false
						referencedRelation: 'users'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'audit_logs_workspace_id_fkey'
						columns: ['workspace_id']
						isOneToOne: false
						referencedRelation: 'workspaces'
						referencedColumns: ['id']
					},
				]
			}
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
					deleted_at: string | null
					folder_id: string | null
					id: string
					is_archived: boolean
					name: string
					r2_key: string | null
					sharing_mode: Database['public']['Enums']['sharing_mode']
					updated_at: string
					workspace_id: string
				}
				Insert: {
					archived_at?: string | null
					created_at?: string
					created_by: string
					deleted_at?: string | null
					folder_id?: string | null
					id?: string
					is_archived?: boolean
					name: string
					r2_key?: string | null
					sharing_mode?: Database['public']['Enums']['sharing_mode']
					updated_at?: string
					workspace_id: string
				}
				Update: {
					archived_at?: string | null
					created_at?: string
					created_by?: string
					deleted_at?: string | null
					folder_id?: string | null
					id?: string
					is_archived?: boolean
					name?: string
					r2_key?: string | null
					sharing_mode?: Database['public']['Enums']['sharing_mode']
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
					superseded_by_token_id: string | null
					token: string
					workspace_id: string
				}
				Insert: {
					created_at?: string
					created_by: string
					enabled?: boolean
					id?: string
					regenerated_at?: string | null
					superseded_by_token_id?: string | null
					token: string
					workspace_id: string
				}
				Update: {
					created_at?: string
					created_by?: string
					enabled?: boolean
					id?: string
					regenerated_at?: string | null
					superseded_by_token_id?: string | null
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
						foreignKeyName: 'invitation_links_superseded_by_token_id_fkey'
						columns: ['superseded_by_token_id']
						isOneToOne: false
						referencedRelation: 'invitation_links'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'invitation_links_workspace_id_fkey'
						columns: ['workspace_id']
						isOneToOne: false
						referencedRelation: 'workspaces'
						referencedColumns: ['id']
					},
				]
			}
			presence: {
				Row: {
					created_at: string
					cursor_data: Json | null
					document_id: string
					last_seen_at: string
					session_id: string
					user_id: string | null
				}
				Insert: {
					created_at?: string
					cursor_data?: Json | null
					document_id: string
					last_seen_at?: string
					session_id?: string
					user_id?: string | null
				}
				Update: {
					created_at?: string
					cursor_data?: Json | null
					document_id?: string
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
					id?: string
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
			can_access_document: {
				Args: { document_uuid: string; user_uuid: string }
				Returns: boolean
			}
			can_edit_document: {
				Args: { document_uuid: string; user_uuid: string }
				Returns: boolean
			}
			check_workspace_member_limit: {
				Args: { workspace_uuid: string }
				Returns: boolean
			}
			cleanup_stale_presence: {
				Args: Record<PropertyKey, never>
				Returns: undefined
			}
			cleanup_test_data: {
				Args: { email_pattern?: string }
				Returns: Json
			}
			generate_invite_token: {
				Args: Record<PropertyKey, never>
				Returns: string
			}
			get_workspace_member_count: {
				Args: { workspace_uuid: string }
				Returns: number
			}
			gtrgm_compress: {
				Args: { '': unknown }
				Returns: unknown
			}
			gtrgm_decompress: {
				Args: { '': unknown }
				Returns: unknown
			}
			gtrgm_in: {
				Args: { '': unknown }
				Returns: unknown
			}
			gtrgm_options: {
				Args: { '': unknown }
				Returns: undefined
			}
			gtrgm_out: {
				Args: { '': unknown }
				Returns: unknown
			}
			is_workspace_member: {
				Args: { user_uuid: string; workspace_uuid: string }
				Returns: boolean
			}
			is_workspace_owner: {
				Args: { user_uuid: string; workspace_uuid: string }
				Returns: boolean
			}
			set_limit: {
				Args: { '': number }
				Returns: number
			}
			show_limit: {
				Args: Record<PropertyKey, never>
				Returns: number
			}
			show_trgm: {
				Args: { '': string }
				Returns: string[]
			}
			transfer_workspace_ownership: {
				Args: {
					p_current_owner_id: string
					p_new_owner_id: string
					p_workspace_id: string
				}
				Returns: Json
			}
		}
		Enums: {
			sharing_mode: 'private' | 'public_read_only' | 'public_editable'
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
	graphql_public: {
		Enums: {},
	},
	public: {
		Enums: {
			sharing_mode: ['private', 'public_read_only', 'public_editable'],
			workspace_role: ['owner', 'member'],
		},
	},
} as const
