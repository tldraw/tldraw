import { readdir } from 'fs/promises'
import { join } from 'path'
import { exec } from './lib/exec'
import { readJsonIfExists, REPO_ROOT } from './lib/file'
import { makeEnv } from './lib/makeEnv'
import { nicelog } from './lib/nicelog'
import { EXPORT_CONFIG_KEY, PackageJson, TemplateDeployConfig } from './lib/types'

const TEMPLATE_DIR = join(REPO_ROOT, 'templates')

// The license key for the *.templates.tldraw.dev demos. This is the one place it lives: every
// template demo is built here, in CI, with this value. Don't set it in the cloudflare or vercel
// dashboards — a key configured there is invisible to this repo and silently expires.
//
// The templates themselves never reference it. tldraw's LicenseProvider picks it up from the build
// environment (see getLicenseKeyFromEnv in packages/editor/src/lib/license/LicenseProvider.tsx), so
// the exported public templates stay free of our key.
const env = makeEnv(['TEMPLATES_TLDRAW_LICENSE_KEY'])

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
	const cloudflareEnv = makeEnv(['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN'])

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

	const vercelEnv = makeEnv(['VERCEL_ORG_ID', 'VERCEL_TOKEN', deployConfig.projectIdVar])
	const projectId = vercelEnv[deployConfig.projectIdVar as keyof typeof vercelEnv]

	const vercelCli = (command: string, args: string[]) =>
		exec('yarn', ['run', '-T', 'vercel', command, '--token', vercelEnv.VERCEL_TOKEN, ...args], {
			pwd: templateDir,
			env: {
				...licenseEnv,
				VERCEL_ORG_ID: vercelEnv.VERCEL_ORG_ID,
				VERCEL_PROJECT_ID: projectId,
			},
		})

	nicelog(`Building ${templateName} for vercel...`)
	await vercelCli('pull', ['--yes', '--environment', 'production'])
	await vercelCli('build', ['--prod'])

	nicelog(`Deploying ${templateName} to vercel...`)
	const out = await vercelCli('deploy', ['--yes', '--prebuilt', '--prod'])
	const deploymentUrl = out.match(/Production: (https:\/\/\S*)/)?.[1]
	if (!deploymentUrl) {
		throw new Error(`Could not find deployment URL in vercel output ${out}`)
	}

	await vercelCli('alias', ['set', deploymentUrl, deployConfig.host])
}

main().catch((err) => {
	console.error(err)
	process.exit(1)
})
