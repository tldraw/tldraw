import { AtIcon } from './AtIcon'
import { BrainIcon } from './BrainIcon'
import { ChevronDownIcon } from './ChevronDownIcon'
import { ChevronRightIcon } from './ChevronRightIcon'
import { CommentIcon } from './CommentIcon'
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
	'chevron-down': <ChevronDownIcon />,
	'chevron-right': <ChevronRightIcon />,
	at: <AtIcon />,
	brain: <BrainIcon />,
	comment: <CommentIcon />,
	cross: <CrossIcon />,
	cursor: <CursorIcon />,
	ellipsis: <EllipsisIcon />,
	eye: <EyeIcon />,
	note: <NoteIcon />,
	pencil: <PencilIcon />,
	refresh: <RefreshIcon />,
	search: <SearchIcon />,
	target: <TargetIcon />,
	trash: <TrashIcon />,
}

export type AgentIconType = keyof typeof AGENT_ICONS

export function AgentIcon({ type }: { type: AgentIconType }) {
	return AGENT_ICONS[type]
}
