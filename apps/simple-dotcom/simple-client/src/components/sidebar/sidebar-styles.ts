/**
 * Shared styles for sidebar items
 *
 * In Tailwind v4, the recommended approach for shared styles is to:
 * 1. Use utility classes directly (best)
 * 2. Extract to shared constants (for complex repeated patterns)
 * 3. Create wrapper components (for behavior + style)
 */

import { cn } from '@/lib/utils'

export const SIDEBAR_ITEM_BASE = cn(
	'h-10 px-2 flex items-center',
	'relative after:absolute after:inset-1 after:rounded-xs',
	'after:z-0 after:pointer-events-none after:opacity-0 after:bg-foreground/5 -my-1',
	'cursor-pointer'
)

export const SIDEBAR_ITEM_HOVERABLE = `${SIDEBAR_ITEM_BASE} hover:after:opacity-100`

export const SIDEBAR_ITEM_ACTIVE = `${SIDEBAR_ITEM_HOVERABLE} data-[active=true]:after:opacity-100`
