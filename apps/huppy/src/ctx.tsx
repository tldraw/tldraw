import { App, Octokit } from 'octokit'

export interface Ctx {
	app: App
	octokit: Octokit
	installationToken: string
	installationId: number
}
