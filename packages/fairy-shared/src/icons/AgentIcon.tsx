import { BrainIcon } from './BrainIcon'
import { ChevronDownIcon } from './ChevronDownIcon'
import { ChevronRightIcon } from './ChevronRightIcon'
import { CrossIcon } from './CrossIcon'
import { CursorIcon } from './CursorIcon'
import { EllipsisIcon } from './EllipsisIcon'
import { EyeIcon } from './EyeIcon'
import { NoteIcon } from './NoteIcon'
import { PencilIcon } from './PencilIcon'
import { RefreshIcon } from './RefreshIcon'
import { SearchIcon } from './SearchIcon'
import { TargetIcon } from './TargetIcon'
import { TrashIcon } from './TrashIcon'

const AGENT_ICONS = {
	brain: <BrainIcon />,
	pencil: <PencilIcon />,
	trash: <TrashIcon />,
	refresh: <RefreshIcon />,
	search: <SearchIcon />,
	eye: <EyeIcon />,
	cursor: <CursorIcon />,
	target: <TargetIcon />,
	ellipsis: <EllipsisIcon />,
	note: <NoteIcon />,
	cross: <CrossIcon />,
	'chevron-down': <ChevronDownIcon />,
	'chevron-right': <ChevronRightIcon />,
}

export type AgentIconType = keyof typeof AGENT_ICONS

export function AgentIcon({ type }: { type: AgentIconType }) {
	return AGENT_ICONS[type]
}
