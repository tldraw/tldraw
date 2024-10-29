import { APP_ID, TLAppDurableObject } from '../../TLAppDurableObject'
import { Environment } from '../../types'

export function getTldrawAppDurableObject(env: Environment) {
	return env.TLAPP_DO.get(env.TLAPP_DO.idFromName(APP_ID)) as unknown as TLAppDurableObject
}
