import { SESSION_STORAGE_KEYS } from '../utils/session-storage'
import { createInvitePage } from './createInvitePage'

export const Component = createInvitePage(SESSION_STORAGE_KEYS.GROUP_INVITE_TOKEN)
