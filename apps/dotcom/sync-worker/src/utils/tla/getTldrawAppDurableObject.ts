import { APP_ID } from '../../TLAppDurableObject'
import { Environment } from '../../types'

export function getTldrawAppDurableObject(env: Environment) {
	return env.TLAPP_DO.get(env.TLAPP_DO.idFromName(APP_ID))
}
