import { Ctx } from './ctx'
import { getAppOctokit, getInstallationToken } from './octokit'

export async function getCtxForOrg(orgName: string): Promise<Ctx> {
	const app = getAppOctokit()

	for await (const { installation } of app.eachInstallation.iterator()) {
		if (!installation.account) continue
		if (!('login' in installation.account)) continue
		if (installation.account.login !== orgName) continue

		return {
			app,
			installationId: installation.id,
			octokit: await app.getInstallationOctokit(installation.id),
			installationToken: await getInstallationToken(app, installation.id),
		}
	}

	throw new Error(`No installation found for org ${orgName}`)
}
