import { Editor } from 'tldraw'
import { TldrawApp } from '../../../tla/app/TldrawApp'

export interface FairyAgentOptions {
	/** The editor to associate the agent with. */
	editor: Editor
	/** The app to associate the agent with. */
	app: TldrawApp
	/** A key used to differentiate the agent from other agents. */
	id: string
	/** A callback for when an error occurs. */
	onError(e: any): void
	/** A function to get the authentication token. */
	getToken?(): Promise<string | undefined>
}
