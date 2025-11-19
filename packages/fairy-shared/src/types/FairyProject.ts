import { FocusColor } from '../format/FocusColor'

export interface FairyProject {
	id: string
	title: string
	description: string
	color: FocusColor
	members: FairyProjectMember[]
	plan: string
}

export interface FairyProjectMember {
	id: string
	role: FairyProjectRole
}

export type FairyProjectRole = 'orchestrator' | 'drone'
