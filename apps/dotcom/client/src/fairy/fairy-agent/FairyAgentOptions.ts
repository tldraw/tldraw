import { Editor } from 'tldraw'
import { FairyApp } from '../fairy-app/FairyApp'

export interface FairyAgentOptions {
	/** The editor to associate the agent with. */
	editor: Editor
	/** The fairy app to associate the agent with. */
	fairyApp: FairyApp
	/** A key used to differentiate the agent from other agents. */
	id: string
	/** A callback for when an error occurs. */
	onError(e: any): void
	/** A function to get the authentication token. */
	getToken?(): Promise<string | undefined>
}
