import { ComponentType } from 'react'
import { LoadingScreen } from '../../TldrawEditor'

/** @public */
export type TLLoadingScreenComponent = ComponentType<object>

/** @public */
export const DefaultLoadingScreen: TLLoadingScreenComponent = () => {
	return <LoadingScreen>Connecting...</LoadingScreen>
}
