/**
 * Shared styles for sidebar items
 *
 * In Tailwind v4, the recommended approach for shared styles is to:
 * 1. Use utility classes directly (best)
 * 2. Extract to shared constants (for complex repeated patterns)
 * 3. Create wrapper components (for behavior + style)
 */

export const SIDEBAR_ITEM_BASE = 'h-8 border flex items-center'
export const SIDEBAR_ITEM_HOVERABLE = `${SIDEBAR_ITEM_BASE} hover:bg-foreground/5`
export const SIDEBAR_ITEM_ACTIVE = `${SIDEBAR_ITEM_HOVERABLE} data-[active=true]:bg-foreground/10`
