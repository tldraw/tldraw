import { Editor } from 'tldraw'
import { FairyConfig } from '../../FairyConfig'

export interface FairyAgentOptions {
	/** The fairy configuration associated with this agent. */
	fairyConfig: FairyConfig
	/** The editor to associate the agent with. */
	editor: Editor
	/** A key used to differentiate the agent from other agents. */
	id: string
	/** A callback for when an error occurs. */
	onError(e: any): void
	/** A function to get the authentication token. */
	getToken?(): Promise<string | undefined>
}
