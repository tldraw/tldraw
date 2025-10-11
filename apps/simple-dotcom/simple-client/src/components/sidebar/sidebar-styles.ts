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
	'h-9 flex items-center',
	'relative after:absolute after:top-0.5 after:bottom-0.5 after:left-1 after:right-1 after:rounded-xs',
	'after:z-0 after:pointer-events-none after:opacity-0 after:bg-foreground/5',
	''
)

export const SIDEBAR_ITEM_HOVERABLE = `${SIDEBAR_ITEM_BASE} hover:after:opacity-100 has-[*[data-state="open"]]:after:opacity-100`

export const SIDEBAR_ITEM_ACTIVE = `${SIDEBAR_ITEM_HOVERABLE} data-[active=true]:after:opacity-100`

export const ICON_BUTTON_HOVERABLE = `relative after:inset-0.5 after:rounded-xs after:z-0 after:pointer-events-none after:opacity-0 after:bg-foreground/5 hover:after:opacity-100`

export const SIDEBAR_MENU_BUTTON =
	'relative shrink-0 h-9 w-8 hover:z-2 cursor-pointer focus-visible:ring-0 hover:opacity-100 opacity-0 group-hover/item:opacity-60 group-hover/section:opacity-30 data-[state="open"]:opacity-100'
