# Create-Tldraw Package Context

## Overview

The `create-tldraw` package is a CLI tool for scaffolding new tldraw projects. It provides an interactive command-line interface that helps developers quickly bootstrap tldraw applications with various framework templates and configurations.

## Architecture

### CLI Entry Point

```bash
#!/usr/bin/env node
# cli.cjs entry point loads the bundled CLI application from dist-cjs/main.cjs
npx create-tldraw [directory] [options]
```

The CLI uses a two-stage loading system:

- `cli.cjs`: Simple entry point that requires the compiled CommonJS bundle
- `dist-cjs/main.cjs`: Actual CLI implementation bundled via esbuild

### Core Components

#### Interactive CLI Interface (`main.ts`)

Primary CLI application with rich interactive prompts:

```typescript
async function main() {
	intro(`Let's build a tldraw app!`)

	const template = await templatePicker(args.template)
	const name = await namePicker(maybeTargetDir)

	await ensureEmpty(targetDir, args.overwrite)
	await downloadTemplate(template, targetDir)
	await renameTemplate(name, targetDir)

	outro(doneMessage.join('\n'))
}
```

**CLI Features:**

- **Interactive Mode**: Guided project setup with prompts and spinners
- **Argument Mode**: Direct template specification via flags
- **Directory Handling**: Smart target directory management with safety checks
- **Package Manager Detection**: Automatic npm/yarn/pnpm detection and command generation
- **Progress Indication**: Visual feedback with spinners and status messages
- **Error Recovery**: Graceful handling of cancellation and failures

#### Template System (`templates.ts`)

Structured template definitions for different use cases:

```typescript
interface Template {
	repo: string // GitHub repository reference
	name: string // Human-readable template name
	description: string // Template description for UI
	category: 'framework' | 'app' // Template categorization
	order: number // Display order preference (required)
}

const TEMPLATES: Templates = {
	framework: [
		{
			repo: 'tldraw/vite-template',
			name: 'Vite + tldraw',
			description:
				'The easiest way to get started with tldraw. Built with Vite, React, and TypeScript.',
			category: 'framework',
			order: 1,
		},
		{
			repo: 'tldraw/nextjs-template',
			name: 'Next.js + tldraw',
			description: 'tldraw in a Next.js app, with TypeScript.',
			category: 'framework',
			order: 2,
		},
	],
	app: [
		{
			repo: 'tldraw/tldraw-sync-cloudflare',
			name: 'Multiplayer sync',
			description:
				'Self-hosted tldraw with realtime multiplayer, powered by tldraw sync and Cloudflare Durable Objects.',
			category: 'app',
			order: 1,
		},
	],
}
```

#### Utility Functions (`utils.ts`)

Essential CLI utilities for project setup:

```typescript
// Directory Management
function isDirEmpty(path: string): boolean
function emptyDir(dir: string): void
function formatTargetDir(targetDir: string): string

// Package Naming
function isValidPackageName(projectName: string): boolean
function toValidPackageName(projectName: string): string
function pathToName(path: string): string

// Package Manager Detection
function getPackageManager(): 'npm' | 'pnpm' | 'yarn'
function getInstallCommand(manager: PackageManager): string
function getRunCommand(manager: PackageManager, command: string): string

// Error Handling
async function uncancel<T>(promise: Promise<T | symbol>): Promise<T>
```

#### Custom ANSI Text Wrapping (`wrap-ansi.ts`)

Custom implementation for terminal text wrapping that handles ANSI escape sequences:

```typescript
// Wraps text while preserving ANSI color codes and escape sequences
function wrapAnsi(input: string, columns: number): string
```

This custom implementation ensures that colored text in CLI prompts and messages wraps correctly without breaking ANSI formatting codes, providing consistent visual presentation across different terminal widths.

### Template Management

#### Template Selection UI (`group-select.ts`)

Enhanced group-based selection interface with custom rendering:

```typescript
// Custom grouped selection prompt with category headers
const template = await groupSelect({
	message: 'Select a template',
	options: [
		...formatTemplates(TEMPLATES.framework, 'Frameworks'),
		...formatTemplates(TEMPLATES.app, 'Apps'),
	],
})

function formatTemplates(templates: Template[], groupLabel: string) {
	return templates
		.sort((a, b) => a.order - b.order)
		.map((template) => ({
			label: template.name,
			hint: template.description,
			value: template,
			group: groupLabel,
		}))
}
```

The grouped selection system provides:

- **Category Grouping**: Templates organized by framework vs application type
- **Visual Hierarchy**: Group headers with consistent styling
- **Detailed Descriptions**: Helpful hints for each template option
- **Keyboard Navigation**: Standard CLI navigation patterns

#### Template Download System

GitHub-based template retrieval with comprehensive error handling:

```typescript
async function downloadTemplate(template: Template, targetDir: string) {
	const s = spinner()
	s.start(`Downloading github.com/${template.repo}...`)

	try {
		const url = `https://github.com/${template.repo}/archive/refs/heads/main.tar.gz`
		const tarResponse = await fetch(url)

		if (!tarResponse.ok) {
			throw new Error(`Failed to download: ${tarResponse.statusText}`)
		}

		const extractor = tar.extract({
			cwd: targetDir,
			strip: 1, // Remove top-level directory from archive
		})

		await new Promise<void>((resolve, reject) => {
			Readable.fromWeb(tarResponse.body).pipe(extractor).on('end', resolve).on('error', reject)
		})

		s.stop(`Downloaded github.com/${template.repo}`)
	} catch (error) {
		s.stop(`Failed to download github.com/${template.repo}`)
		throw error
	}
}
```

**Error Handling Features:**

- **Network Failure Recovery**: Graceful handling of download failures
- **Invalid Repository Detection**: Clear error messages for missing repos
- **Progress Indication**: Real-time download status with spinners
- **Cleanup on Failure**: Automatic cleanup of partially downloaded content

### Project Customization

#### Package.json Customization

Automatic project personalization with preserved licensing:

```typescript
async function renameTemplate(name: string, targetDir: string) {
	const packageJsonPath = resolve(targetDir, 'package.json')
	const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))

	// Customize package metadata while preserving license
	packageJson.name = name
	delete packageJson.author // Remove template author
	delete packageJson.homepage // Remove template homepage
	// Note: license field is preserved from original template

	writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, '\t') + '\n')
}
```

The package.json customization preserves template licensing while personalizing the project metadata for the new owner.

#### Smart Naming System

Intelligent package name generation with npm compliance:

```typescript
// Path to valid npm package name conversion
function pathToName(path: string): string {
	return toValidPackageName(basename(formatTargetDir(resolve(path))))
}

function toValidPackageName(projectName: string): string {
	return projectName
		.trim()
		.toLowerCase()
		.replace(/\s+/g, '-') // Spaces to hyphens
		.replace(/^[._]/, '') // Remove leading dots/underscores
		.replace(/[^a-z\d\-~]+/g, '-') // Invalid chars to hyphens
}
```

### CLI Command Interface

#### Command-Line Arguments

Flexible argument handling for different usage patterns:

```bash
# Interactive mode (default)
npx create-tldraw

# Direct template specification
npx create-tldraw my-app --template vite-template

# Overwrite existing directory
npx create-tldraw my-app --overwrite

# Help information
npx create-tldraw --help
```

**Argument Processing:**

```typescript
const args = parseArgs(process.argv.slice(2), {
	alias: {
		h: 'help',
		t: 'template',
		o: 'overwrite',
	},
	boolean: ['help', 'overwrite'],
	string: ['template'],
})
```

#### Interactive Prompts

Rich CLI experience using @clack/prompts with custom enhancements:

```typescript
// Template selection with grouped options and visual hierarchy
const template = await groupSelect({
	message: 'Select a template',
	options: [
		{ label: 'Vite + tldraw', hint: 'The easiest way to get started', group: 'Frameworks' },
		{ label: 'Next.js + tldraw', hint: 'tldraw in a Next.js app', group: 'Frameworks' },
		{ label: 'Multiplayer sync', hint: 'Self-hosted realtime collaboration', group: 'Apps' },
	],
})

// Project naming with validation and smart defaults
const name = await text({
	message: 'Name your package',
	placeholder: defaultName,
	validate: (value) => {
		if (value && !isValidPackageName(value)) {
			return `Invalid package name: ${value}`
		}
	},
})
```

### Directory Management

#### Smart Directory Handling

Intelligent handling of target directories with safety checks:

```typescript
async function ensureEmpty(targetDir: string, overwriteArg: boolean) {
	if (isDirEmpty(targetDir)) {
		mkdirSync(targetDir, { recursive: true })
		return
	}

	// Interactive overwrite confirmation with multiple options
	const overwrite = overwriteArg
		? 'yes'
		: await select({
				message: `Target directory "${targetDir}" is not empty.`,
				options: [
					{ label: 'Cancel', value: 'no' },
					{ label: 'Remove existing files and continue', value: 'yes' },
					{ label: 'Ignore existing files and continue', value: 'ignore' },
				],
			})

	if (overwrite === 'yes') {
		emptyDir(targetDir) // Preserves .git directory
	}
}
```

**Directory Safety Features:**

- **Git Repository Preservation**: `.git` directories are never deleted
- **Interactive Confirmation**: User must explicitly confirm destructive operations
- **Flexible Options**: Cancel, overwrite, or merge with existing content
- **Recursive Creation**: Automatically creates parent directories as needed

### Package Manager Integration

#### Universal Package Manager Support

Automatic detection and appropriate command generation:

```typescript
function getPackageManager(): 'npm' | 'pnpm' | 'yarn' {
	const userAgent = process.env.npm_config_user_agent
	if (!userAgent) return 'npm'

	const manager = userAgent.split(' ')[0].split('/')[0]
	if (manager === 'pnpm') return 'pnpm'
	if (manager === 'yarn') return 'yarn'
	return 'npm'
}

function getInstallCommand(manager: PackageManager): string {
	switch (manager) {
		case 'pnpm':
			return 'pnpm install'
		case 'yarn':
			return 'yarn'
		case 'npm':
			return 'npm install'
	}
}

function getRunCommand(manager: PackageManager, command: string): string {
	switch (manager) {
		case 'pnpm':
			return `pnpm ${command}`
		case 'yarn':
			return `yarn ${command}`
		case 'npm':
			return `npm run ${command}`
	}
}
```

### Error Handling

#### Comprehensive Error Management

Graceful error handling throughout the CLI with user-friendly messaging:

```typescript
// Cancellation handling with cleanup
async function uncancel<T>(promise: Promise<T | symbol>): Promise<T> {
	const result = await promise
	if (isCancel(result)) {
		outro(`Operation cancelled`)
		process.exit(1)
	}
	return result as T
}

// Main error boundary with debug mode
main().catch((err) => {
	if (DEBUG) {
		console.error('Debug information:')
		console.error(err)
	}
	outro(`Something went wrong. Please try again.`)
	process.exit(1)
})

// Download error handling with retry suggestions
try {
	await downloadTemplate(template, targetDir)
} catch (err) {
	outro(`Failed to download template. Please check your internet connection and try again.`)
	throw err
}
```

**Error Recovery Strategies:**

- **Graceful Degradation**: Meaningful error messages without technical details
- **Debug Mode**: Detailed error information when DEBUG environment variable is set
- **Operation Cleanup**: Automatic cleanup of partial operations on failure
- **User Guidance**: Actionable suggestions for resolving common issues

## Build System

### esbuild Bundle Configuration

Optimized TypeScript to CommonJS compilation for Node.js distribution:

```bash
# scripts/build.sh
esbuild src/main.ts \
  --bundle \
  --platform=node \
  --target=node18 \
  --format=cjs \
  --outfile=dist-cjs/main.cjs \
  --external:@clack/prompts \
  --external:tar
```

**Build Features:**

- **Single Bundle**: All TypeScript source compiled to one CommonJS file
- **External Dependencies**: CLI dependencies remain as external requires
- **Node.js Target**: Optimized for Node.js 18+ runtime environments
- **Development Watch**: `scripts/dev.sh` provides watch mode for development

### Distribution Strategy

Optimized package structure for CLI distribution:

```json
{
	"bin": "./cli.cjs", // CLI entry point
	"files": ["dist-cjs/", "./cli.cjs"], // Files included in npm package
	"scripts": {
		"build": "./scripts/build.sh", // Production build
		"dev": "./scripts/dev.sh", // Development mode with watch
		"prepublishOnly": "yarn build" // Ensure build before publish
	}
}
```

### Development Workflow

#### Development Scripts

Streamlined development experience:

```bash
# Development with automatic rebuild
./scripts/dev.sh    # Watches TypeScript files and rebuilds on changes

# Production build
./scripts/build.sh  # Creates optimized CommonJS bundle

# Local testing
node cli.cjs        # Test CLI locally after build
```

#### TypeScript Compilation Pipeline

```
src/
├── main.ts          → Entry point and CLI orchestration
├── templates.ts     → Template definitions and management
├── utils.ts         → Shared utilities and validation
├── group-select.ts  → Custom grouped selection UI
└── wrap-ansi.ts     → ANSI text wrapping functionality
     ↓ (esbuild bundle)
dist-cjs/
└── main.cjs         → Single bundled CommonJS output
```

## Testing Configuration

### Jest Setup

Comprehensive test configuration for CLI validation:

```json
{
	"testEnvironment": "node",
	"testMatch": ["<rootDir>/src/**/*.test.ts"],
	"transform": {
		"^.+\\.ts$": "ts-jest"
	},
	"collectCoverage": true,
	"coverageDirectory": "coverage",
	"coverageReporters": ["text", "html"]
}
```

**Testing Patterns:**

- **Unit Tests**: Individual function validation (utils, naming, validation)
- **Integration Tests**: Template download and project setup workflows
- **CLI Tests**: Command-line interface and argument parsing
- **Mock Templates**: Test template system without external dependencies

## Template Categories

### Framework Templates

Ready-to-use integrations with popular frameworks:

#### Vite Template (`tldraw/vite-template`)

- **Purpose**: Fastest way to start with tldraw
- **Tech Stack**: Vite + React + TypeScript
- **Use Case**: Simple drawing applications, rapid prototyping
- **Build Time**: ~10 seconds for initial setup
- **Development**: Hot module replacement with Vite dev server

#### Next.js Template (`tldraw/nextjs-template`)

- **Purpose**: Full-stack applications with tldraw
- **Tech Stack**: Next.js + React + TypeScript
- **Use Case**: Production web applications, SSR/SSG requirements
- **Features**: App Router, optimized builds, deployment ready

### Application Templates

Complete application examples with advanced features:

#### Multiplayer Sync (`tldraw/tldraw-sync-cloudflare`)

- **Purpose**: Real-time collaborative drawing
- **Tech Stack**: tldraw + sync + Cloudflare Durable Objects
- **Features**: Multiplayer, persistence, scalable infrastructure
- **Use Case**: Collaborative whiteboarding, team drawing sessions
- **Deployment**: Cloudflare Workers with Durable Objects backend

## Usage Patterns

### Basic Project Creation

```bash
# Interactive mode with full guidance
npx create-tldraw

# Quick setup with specific template
npx create-tldraw my-drawing-app --template vite-template

# Overwrite existing directory safely
npx create-tldraw ./existing-dir --overwrite
```

### Advanced Usage Patterns

```bash
# Corporate environments with specific package managers
PNPM_CONFIG_USER_AGENT=pnpm npx create-tldraw my-app

# Automated CI/CD pipeline usage
npx create-tldraw ci-app --template nextjs-template --overwrite

# Development workflow integration
npx create-tldraw && cd $(ls -t | head -1) && npm run dev
```

### Post-Creation Workflow

```bash
cd my-tldraw-app
npm install           # Detected package manager command
npm run dev          # Start development server
npm run build        # Create production build
npm run typecheck    # Validate TypeScript
```

## Template Development

### Automatic Template Generation

Templates are automatically discovered and validated:

```typescript
// Template validation ensures all required fields are present
function validateTemplate(template: Template): boolean {
	return !!(
		template.repo &&
		template.name &&
		template.description &&
		template.category &&
		typeof template.order === 'number'
	)
}

// Automatic template list generation from repository metadata
async function generateTemplateList() {
	const frameworks = await discoverTemplates('framework')
	const apps = await discoverTemplates('app')
	return { framework: frameworks, app: apps }
}
```

### Template Requirements

Standards for template repositories:

- **package.json**: Valid npm package with required scripts
- **README.md**: Comprehensive setup and usage instructions
- **TypeScript Configuration**: Strict TypeScript setup preferred
- **Development Scripts**: Standard `dev`, `build`, `typecheck` scripts
- **License**: Clear licensing for template usage
- **Dependencies**: Current tldraw version and compatible dependencies

### Quality Assurance

Automated validation for template integrity:

- **Repository Access**: Verify GitHub repository is public and accessible
- **Package Validation**: Ensure package.json meets npm standards
- **Build Verification**: Template must build successfully after setup
- **Dependency Audit**: Check for security vulnerabilities in dependencies
- **Documentation Review**: README must include setup and usage instructions

## Development Features

### Enhanced CLI Experience

Visual feedback and user guidance throughout the process:

```typescript
import { intro, outro, select, spinner, text } from '@clack/prompts'

// Welcome message with branding
intro(`Let's build a tldraw app!`)

// Progress indication with detailed status
const s = spinner()
s.start(`Downloading github.com/${template.repo}...`)
await downloadTemplate(template, targetDir)
s.stop(`Downloaded github.com/${template.repo}`)

// Success message with next steps
const installCmd = getInstallCommand(getPackageManager())
const runCmd = getRunCommand(getPackageManager(), 'dev')
outro(`Done! Now run:\n\n  cd ${targetDir}\n  ${installCmd}\n  ${runCmd}`)
```

### Smart Defaults and Validation

Intelligent default value generation and input validation:

```typescript
// Smart project naming from current directory
const defaultName = pathToName(process.cwd())

// Package manager detection from environment
const manager = getPackageManager()

// Template ordering by popularity and ease of use
templates.sort((a, b) => a.order - b.order)

// Comprehensive package name validation
function isValidPackageName(projectName: string): boolean {
	return /^(?:@[a-z\d\-*~][a-z\d\-*._~]*\/)?[a-z\d\-~][a-z\d\-._~]*$/.test(projectName)
}

// Directory safety validation
function isDirEmpty(path: string): boolean {
	if (!existsSync(path)) return true
	const files = readdirSync(path)
	return files.length === 0 || (files.length === 1 && files[0] === '.git')
}
```

## Key Benefits

### Developer Experience

- **Zero Configuration**: Works immediately with sensible defaults
- **Framework Flexibility**: Support for React, Next.js, and Vue ecosystems
- **Interactive Guidance**: Step-by-step project setup with visual feedback
- **Universal Compatibility**: Works with npm, yarn, and pnpm package managers
- **Error Prevention**: Comprehensive validation and safety checks

### Template Ecosystem

- **Curated Quality**: Official templates demonstrate best practices
- **Feature Examples**: Specialized templates for multiplayer, AI integration
- **Extensible Architecture**: Easy addition of new templates
- **Automatic Updates**: Template list stays current with repository changes
- **Community Driven**: Clear contribution model for new template types

### Production Readiness

- **TypeScript First**: All templates include strict TypeScript configuration
- **Modern Tooling**: Latest build tools, development servers, and frameworks
- **Deployment Ready**: Templates include production build and deployment guides
- **Testing Integration**: Pre-configured testing frameworks and example tests
- **Performance Optimized**: Build configurations optimized for production use

### Maintenance and Reliability

- **Automated Validation**: Template repositories automatically validated for integrity
- **Version Consistency**: Templates maintained to work with current tldraw releases
- **Comprehensive Testing**: CLI functionality covered by automated test suite
- **Documentation**: Each template includes detailed setup and customization guides
- **Error Recovery**: Graceful handling of network issues, user cancellation, and edge cases
