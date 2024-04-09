import { App, Octokit } from 'octokit'

export type Ctx = {
	app: App
	octokit: Octokit
	installationToken: string
	installationId: number
}
