import { existsSync } from 'fs'
import { readdir, readFile, rm, writeFile } from 'fs/promises'
import { join, relative } from 'path'
import { exec } from './lib/exec'
import { readJsonIfExists, REPO_ROOT } from './lib/file'
import { makeEnv } from './lib/makeEnv'
import { nicelog } from './lib/nicelog'
import { EXPORT_CONFIG_KEY, PackageJson, TemplateDeployConfig } from './lib/types'

const TEMPLATE_DIR = join(REPO_ROOT, 'templates')

/**
 * Like `makeEnv`, but also rejects empty values. Github expands an unconfigured secret or variable
 * to the empty string rather than leaving it unset, so `makeEnv` alone would let a missing license
 * key through and we'd deploy unlicensed demos on a green CI run — the exact thing this script
 * exists to prevent.
 */
function requireEnv<const Keys extends readonly string[]>(keys: Keys) {
	const env = makeEnv(keys)
	const emptyVars = keys.filter((key) => env[key as keyof typeof env] === '')
	if (emptyVars.length > 0) {
		throw new Error(`Empty environment variables: ${emptyVars.join(', ')}`)
	}
	return env
}

// The license key for the *.templates.tldraw.dev demos. This is the one place it lives: every
// template demo is built here, in CI, with this value. Don't set it in the cloudflare or vercel
// dashboards — a key configured there is invisible to this repo and silently expires.
//
// The templates themselves never reference it. tldraw's LicenseProvider picks it up from the build
// environment (see getLicenseKeyFromEnv in packages/editor/src/lib/license/LicenseProvider.tsx), so
// the exported public templates stay free of our key.
const env = requireEnv(['TEMPLATES_TLDRAW_LICENSE_KEY'])

const licenseEnv = {
	// vite templates
	VITE_TLDRAW_LICENSE_KEY: env.TEMPLATES_TLDRAW_LICENSE_KEY,
	// next.js templates
	NEXT_PUBLIC_TLDRAW_LICENSE_KEY: env.TEMPLATES_TLDRAW_LICENSE_KEY,
}

async function main() {
	const templateName = process.argv[2]
	if (!templateName) {
		nicelog('Usage: tsx deploy-template.ts <template-name>')
		process.exit(1)
	}

	const possibleTemplates = (await readdir(TEMPLATE_DIR, { withFileTypes: true }))
		.filter((d) => d.isDirectory())
		.map((d) => d.name)

	if (!possibleTemplates.includes(templateName)) {
		nicelog(`Template "${templateName}" not found.`)
		nicelog(`Possible templates: ${possibleTemplates.join(', ')}`)
		process.exit(1)
	}

	const templateDir = join(TEMPLATE_DIR, templateName)
	const packageJsonRaw = await readJsonIfExists(join(templateDir, 'package.json'))
	if (!packageJsonRaw) {
		nicelog('No package.json found')
		process.exit(1)
	}

	const packageJson = PackageJson.validate(packageJsonRaw)
	const deployConfig = packageJson[EXPORT_CONFIG_KEY]?.deploy
	if (!deployConfig) {
		nicelog(`Template "${templateName}" has no deploy config. Skipping.`)
		process.exit(0)
	}

	switch (deployConfig.target) {
		case 'cloudflare':
			await deployToCloudflare(templateName, templateDir)
			break
		case 'vercel':
			await deployToVercel(templateName, templateDir, deployConfig)
			break
	}

	nicelog(`Deployed ${templateName} to https://${deployConfig.host}`)
}

async function deployToCloudflare(templateName: string, templateDir: string) {
	const cloudflareEnv = requireEnv(['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN'])

	nicelog(`Building ${templateName}...`)
	await exec('yarn', ['run', 'build'], {
		pwd: templateDir,
		env: { ...licenseEnv, NODE_ENV: 'production' },
	})

	// The route (including the custom domain) comes from the template's own wrangler.toml, which
	// ships to users too — so the deploy target is described in one place rather than here.
	nicelog(`Deploying ${templateName} to cloudflare...`)
	await exec('yarn', ['wrangler', 'deploy'], {
		pwd: templateDir,
		env: {
			...cloudflareEnv,
			NODE_ENV: 'production',
			// wrangler needs CI=1 set to prevent it from trying to do interactive prompts
			CI: '1',
		},
	})
}

async function deployToVercel(
	templateName: string,
	templateDir: string,
	deployConfig: TemplateDeployConfig
) {
	if (!deployConfig.projectIdVar) {
		throw new Error(`Template "${templateName}" is deployed to vercel but has no projectIdVar.`)
	}

	const vercelEnv = requireEnv(['VERCEL_ORG_ID', 'VERCEL_TOKEN', deployConfig.projectIdVar])
	const projectId = vercelEnv[deployConfig.projectIdVar as keyof typeof vercelEnv]

	// Every vercel command runs from the repo root. `vercel build` resolves the sources as
	// `cwd + the project's rootDirectory setting`, while `pull` and `deploy --prebuilt` treat cwd
	// as-is — so the repo root is the only cwd all three agree on.
	const vercelCli = (command: string, args: string[]) =>
		exec(
			'yarn',
			[
				'run',
				'-T',
				'vercel',
				command,
				'--token',
				vercelEnv.VERCEL_TOKEN,
				'--scope',
				vercelEnv.VERCEL_ORG_ID,
				...args,
			],
			{
				pwd: REPO_ROOT,
				env: {
					...licenseEnv,
					VERCEL_ORG_ID: vercelEnv.VERCEL_ORG_ID,
					VERCEL_PROJECT_ID: projectId,
					// the setup action already ran `yarn install`; don't let the builder do it again
					VERCEL_INSTALL_COMPLETED: '1',
				},
			}
		)

	// `vercel build` reads the linked project from `<cwd>/.vercel` rather than from the env vars, so
	// clear out whatever the previously deployed template left behind.
	const vercelDir = join(REPO_ROOT, '.vercel')
	await rm(vercelDir, { recursive: true, force: true })

	nicelog(`Building ${templateName} for vercel...`)
	await vercelCli('pull', ['--yes', '--environment', 'production'])

	const projectJson = await readJsonIfExists(join(vercelDir, 'project.json'))
	const rootDirectory = (projectJson as any)?.settings?.rootDirectory
	const expectedRootDirectory = relative(REPO_ROOT, templateDir)
	if (rootDirectory !== expectedRootDirectory) {
		throw new Error(
			`Vercel project for "${templateName}" has root directory "${rootDirectory}", expected "${expectedRootDirectory}".`
		)
	}

	await stripLicenseKeyFromPulledEnv(join(vercelDir, '.env.production.local'))
	await vercelCli('build', ['--prod'])

	nicelog(`Deploying ${templateName} to vercel...`)
	const out = await vercelCli('deploy', ['--yes', '--prebuilt', '--prod'])
	const deploymentUrl = out.match(/Production: (https:\/\/\S*)/)?.[1]
	if (!deploymentUrl) {
		throw new Error(`Could not find deployment URL in vercel output ${out}`)
	}

	await vercelCli('alias', ['set', deploymentUrl, deployConfig.host])
}

/**
 * `vercel pull` writes the project's dashboard environment variables to `.env.production.local`,
 * and `vercel build` loads that file — so a license key still configured in the dashboard would
 * shadow the one we pass in. Drop it, so the key can only ever come from CI.
 */
async function stripLicenseKeyFromPulledEnv(envFile: string) {
	if (!existsSync(envFile)) return

	const contents = await readFile(envFile, 'utf-8')
	const stripped = contents
		.split('\n')
		.filter((line) => !/^\s*[A-Z_]*TLDRAW_LICENSE_KEY\s*=/.test(line))
		.join('\n')

	if (stripped !== contents) {
		nicelog('Ignoring the license key configured in the vercel dashboard.')
		await writeFile(envFile, stripped)
	}
}

main().catch((err) => {
	console.error(err)
	process.exit(1)
})
