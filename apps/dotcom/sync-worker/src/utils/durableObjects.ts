import { ROOM_PREFIX } from '@tldraw/dotcom-shared'
import { TLFileDurableObject } from '../TLFileDurableObject'
import type { TLFileEffectProcessor } from '../TLFileEffectProcessor'
import { TLLoggerDurableObject } from '../TLLoggerDurableObject'
import { Environment } from '../types'

export function getFileEffectProcessor(env: Environment) {
	return env.TL_FILE_EFFECTS.get(env.TL_FILE_EFFECTS.idFromName('0'), {
		locationHint: 'weur',
	}) as any as TLFileEffectProcessor
}

export function getLogger(env: Environment) {
	return env.TL_LOGGER.get(env.TL_LOGGER.idFromName('logger')) as any as TLLoggerDurableObject
}

export function getRoomDurableObject(env: Environment, roomId: string) {
	return env.TLDR_DOC.get(
		env.TLDR_DOC.idFromName(`/${ROOM_PREFIX}/${roomId}`)
	) as any as TLFileDurableObject
}
