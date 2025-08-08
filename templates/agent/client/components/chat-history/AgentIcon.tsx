import { BrainIcon } from '../../icons/BrainIcon'
import { CursorIcon } from '../../icons/CursorIcon'
import { EllipsisIcon } from '../../icons/EllipsisIcon'
import { EyeIcon } from '../../icons/EyeIcon'
import { PencilIcon } from '../../icons/PencilIcon'
import { RefreshIcon } from '../../icons/RefreshIcon'
import { SearchIcon } from '../../icons/SearchIcon'
import { TargetIcon } from '../../icons/TargetIcon'
import { TrashIcon } from '../../icons/TrashIcon'

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
}

export type AgentIconType = keyof typeof AGENT_ICONS

export function AgentIcon({ type }: { type: AgentIconType }) {
	return AGENT_ICONS[type]
}
