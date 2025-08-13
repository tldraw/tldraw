# Create-Tldraw Package Context

## Overview
The `create-tldraw` package is a CLI tool for scaffolding new tldraw projects. It provides an interactive command-line interface that helps developers quickly bootstrap tldraw applications with various framework templates and configurations.

## Architecture

### CLI Entry Point
```bash
#!/usr/bin/env node
# cli.cjs entry point loads the bundled CLI application
npx create-tldraw [directory] [options]
```

### Core Components

#### Interactive CLI Interface (`main.ts`)
Primary CLI application with rich interactive prompts:
```typescript
async function main() {
  intro(`Let's build a tldraw app!`)
  
  const template = await templatePicker(args.template)
  const name = await namePicker(maybeTargetDir)
  
  await ensureDirectoryEmpty(targetDir, args.overwrite)
  await downloadTemplate(template, targetDir)
  await renameTemplate(name, targetDir)
  
  outro(doneMessage.join('\n'))
}
```

**CLI Features:**
- **Interactive Mode**: Guided project setup with prompts
- **Argument Mode**: Direct template specification via flags
- **Directory Handling**: Smart target directory management  
- **Package Manager Detection**: Automatic npm/yarn/pnpm detection

#### Template System (`templates.ts`)
Structured template definitions for different use cases:
```typescript
interface Template {
  repo: string              // GitHub repository reference
  name: string             // Human-readable template name
  description: string      // Template description for UI
  category: 'framework' | 'app'  // Template categorization
  order?: number          // Display order preference
}

const TEMPLATES: Templates = {
  framework: [
    {
      repo: 'tldraw/vite-template',
      name: 'Vite + tldraw',
      description: 'The easiest way to get started with tldraw. Built with Vite, React, and TypeScript.',
      category: 'framework',
      order: 1
    },
    {
      repo: 'tldraw/nextjs-template', 
      name: 'Next.js + tldraw',
      description: 'tldraw in a Next.js app, with TypeScript.',
      category: 'framework',
      order: 2
    },
    {
      repo: 'tldraw/vue-template',
      name: 'Vue.js + tldraw',
      description: 'tldraw in a Vue.js app, built with Vite and TypeScript.',
      category: 'framework'
    }
  ],
  app: [
    {
      repo: 'tldraw/tldraw-sync-cloudflare',
      name: 'Multiplayer sync',
      description: 'Self-hosted tldraw with realtime multiplayer, powered by tldraw sync and Cloudflare Durable Objects.',
      category: 'app',
      order: 1
    },
    {
      repo: 'tldraw/ai-template',
      name: 'AI starter kit', 
      description: 'tldraw + the @tldraw/ai module, built with Vite and TypeScript. Includes a Cloudflare Worker for OpenAI API.',
      category: 'app'
    }
  ]
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

### Template Management

#### Template Selection UI
Enhanced group-based selection interface:
```typescript
// group-select.ts - Custom grouped selection prompt
const template = await groupSelect({
  message: 'Select a template',
  options: [
    ...formatTemplates(TEMPLATES.framework, 'Frameworks'),
    ...formatTemplates(TEMPLATES.app, 'Apps')
  ]
})

function formatTemplates(templates: Template[], groupLabel: string) {
  return templates.map(template => ({
    label: template.name,
    hint: template.description,
    value: template,
    group: groupLabel
  }))
}
```

#### Template Download System
GitHub-based template retrieval and extraction:
```typescript
async function downloadTemplate(template: Template, targetDir: string) {
  const url = `https://github.com/${template.repo}/archive/refs/heads/main.tar.gz`
  const tarResponse = await fetch(url)
  
  const extractor = tar.extract({
    cwd: targetDir,
    strip: 1  // Remove top-level directory from archive
  })
  
  await new Promise<void>((resolve, reject) => {
    Readable.fromWeb(tarResponse.body)
      .pipe(extractor)
      .on('end', resolve)
      .on('error', reject)
  })
}
```

### Project Customization

#### Package.json Customization
Automatic project personalization:
```typescript
async function renameTemplate(name: string, targetDir: string) {
  const packageJson = JSON.parse(readFileSync(resolve(targetDir, 'package.json'), 'utf-8'))
  
  // Customize package metadata
  packageJson.name = name
  delete packageJson.author    // Remove template author
  delete packageJson.homepage  // Remove template homepage
  delete packageJson.license   // Remove template license
  
  writeFileSync(resolve(targetDir, 'package.json'), JSON.stringify(packageJson, null, '\t') + '\n')
}
```

#### Smart Naming System
Intelligent package name generation:
```typescript
// Path to valid npm package name conversion
function pathToName(path: string): string {
  return toValidPackageName(basename(formatTargetDir(resolve(path))))
}

function toValidPackageName(projectName: string): string {
  return projectName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')           // Spaces to hyphens
    .replace(/^[._]/, '')           // Remove leading dots/underscores
    .replace(/[^a-z\d\-~]+/g, '-')  // Invalid chars to hyphens
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
    o: 'overwrite'
  },
  boolean: ['help', 'overwrite'],
  string: ['template']
})
```

#### Interactive Prompts
Rich CLI experience using @clack/prompts:
```typescript
// Template selection with grouped options
const template = await groupSelect({
  message: 'Select a template',
  options: [
    { label: 'Vite + tldraw', hint: 'Easiest way to get started', group: 'Frameworks' },
    { label: 'Next.js + tldraw', hint: 'tldraw in Next.js app', group: 'Frameworks' },
    { label: 'Multiplayer sync', hint: 'Realtime collaboration', group: 'Apps' }
  ]
})

// Project naming with validation
const name = await text({
  message: 'Name your package',
  placeholder: defaultName,
  validate: (value) => {
    if (value && !isValidPackageName(value)) {
      return `Invalid package name: ${value}`
    }
  }
})
```

### Directory Management

#### Smart Directory Handling
Intelligent handling of target directories:
```typescript
async function ensureDirectoryEmpty(targetDir: string, overwriteArg: boolean) {
  if (isDirEmpty(targetDir)) {
    mkdirSync(targetDir, { recursive: true })
    return
  }
  
  // Interactive overwrite confirmation
  const overwrite = overwriteArg ? 'yes' : await select({
    message: `Target directory "${targetDir}" is not empty.`,
    options: [
      { label: 'Cancel', value: 'no' },
      { label: 'Remove existing files and continue', value: 'yes' },
      { label: 'Ignore existing files and continue', value: 'ignore' }
    ]
  })
  
  if (overwrite === 'yes') {
    emptyDir(targetDir)  // Preserves .git directory
  }
}
```

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
    case 'pnpm': return 'pnpm install'
    case 'yarn': return 'yarn'  
    case 'npm': return 'npm install'
  }
}
```

### Error Handling

#### Graceful Error Management
Comprehensive error handling throughout the CLI:
```typescript
// Cancellation handling
async function uncancel<T>(promise: Promise<T | symbol>): Promise<T> {
  const result = await promise
  if (isCancel(result)) {
    outro(`it's cancelled`)
    process.exit(1)
  }
  return result as T
}

// Main error boundary
main().catch((err) => {
  if (DEBUG) console.error(err)
  outro(`it's bad`)
  process.exit(1)
})
```

## Template Categories

### Framework Templates
Ready-to-use integrations with popular frameworks:

#### Vite Template (`tldraw/vite-template`)
- **Purpose**: Fastest way to start with tldraw
- **Tech Stack**: Vite + React + TypeScript
- **Use Case**: Simple drawing applications, prototyping

#### Next.js Template (`tldraw/nextjs-template`) 
- **Purpose**: Full-stack applications with tldraw
- **Tech Stack**: Next.js + React + TypeScript
- **Use Case**: Production web applications, SSR requirements

#### Vue Template (`tldraw/vue-template`)
- **Purpose**: tldraw integration with Vue ecosystem
- **Tech Stack**: Vue.js + Vite + TypeScript
- **Use Case**: Vue-based applications, Vue developer preference

### Application Templates
Complete application examples with advanced features:

#### Multiplayer Sync (`tldraw/tldraw-sync-cloudflare`)
- **Purpose**: Real-time collaborative drawing
- **Tech Stack**: tldraw + sync + Cloudflare Durable Objects
- **Features**: Multiplayer, persistence, scalable infrastructure
- **Use Case**: Collaborative whiteboarding, team drawing sessions

#### AI Starter Kit (`tldraw/ai-template`)
- **Purpose**: AI-powered drawing applications
- **Tech Stack**: tldraw + @tldraw/ai + OpenAI + Cloudflare Workers
- **Features**: AI content generation, intelligent drawing assistance
- **Use Case**: AI-enhanced creativity tools, smart drawing apps

## Build System

### Distribution Strategy
Optimized for CLI distribution and execution:
```json
{
  "bin": "./cli.cjs",           // CLI entry point
  "files": ["dist-cjs", "./cli.cjs"],  // Distributed files
  "scripts": {
    "build": "./scripts/build.sh",     // Bundle TypeScript to CommonJS
    "dev": "./scripts/dev.sh"          // Development mode
  }
}
```

### TypeScript Compilation
Source TypeScript compiled to CommonJS for Node.js compatibility:
```
src/
├── main.ts          → dist-cjs/main.cjs
├── templates.ts     → (bundled into main.cjs)
├── utils.ts         → (bundled into main.cjs)
└── group-select.ts  → (bundled into main.cjs)
```

## Usage Patterns

### Basic Project Creation
```bash
# Interactive mode
npx create-tldraw

# Specify directory and template
npx create-tldraw my-drawing-app --template vite-template

# Quick setup with overwrite
npx create-tldraw ./existing-dir --overwrite
```

### Advanced Usage
```bash
# List available templates
npx create-tldraw --help

# Create multiplayer app
npx create-tldraw collaborative-whiteboard --template tldraw-sync-cloudflare

# Create AI-powered app  
npx create-tldraw smart-canvas --template ai-template
```

### Post-Creation Workflow
```bash
cd my-tldraw-app
npm install     # or yarn/pnpm based on detection
npm run dev     # Start development server
```

## Template Development

### Adding New Templates
Process for extending template collection:
1. **Create Repository**: New GitHub repo with tldraw template
2. **Update Templates**: Add to `TEMPLATES` configuration
3. **Regenerate**: Run template refresh script
4. **Test**: Verify CLI can download and setup template

### Template Requirements
Standards for template repositories:
- **package.json**: Valid npm package configuration
- **README.md**: Setup and usage instructions
- **Development Scripts**: Standard npm scripts (dev, build, etc.)
- **TypeScript**: Preferred for type safety
- **Example Code**: Working tldraw integration examples

## Development Features

### CLI Experience
Enhanced user experience with visual feedback:
```typescript
import { intro, outro, select, spinner, text } from '@clack/prompts'

// Progress indication
const s = spinner()
s.start(`Downloading github.com/${template.repo}...`)
// ... download logic
s.stop(`Downloaded github.com/${template.repo}`)

// User-friendly messaging
intro(`Let's build a tldraw app!`)
outro(`Done! Now run:\n   cd ${targetDir}\n   ${installCommand}\n   ${runCommand}`)
```

### Smart Defaults
Intelligent default value generation:
```typescript
// Default project name from directory
const defaultName = pathToName(process.cwd())

// Package manager detection from environment
const manager = getPackageManager() // npm/yarn/pnpm

// Template ordering by popularity/ease
templates.sort((a, b) => (a.order || 999) - (b.order || 999))
```

### Validation System
Input validation and error prevention:
```typescript
// Package name validation
function isValidPackageName(projectName: string): boolean {
  return /^(?:@[a-z\d\-*~][a-z\d\-*._~]*\/)?[a-z\d\-~][a-z\d\-._~]*$/.test(projectName)
}

// Directory safety checks
function isDirEmpty(path: string): boolean {
  const files = readdirSync(path)
  return files.length === 0 || (files.length === 1 && files[0] === '.git')
}
```

## Error Handling

### Graceful Failures
Comprehensive error handling with user-friendly messages:
```typescript
// Download failures
try {
  await downloadTemplate(template, targetDir)
} catch (err) {
  s.stop(`Failed to download github.com/${template.repo}`)
  throw err
}

// User cancellation
if (isCancel(result)) {
  outro(`it's cancelled`)
  process.exit(1)
}

// General errors
main().catch((err) => {
  if (DEBUG) console.error(err)
  outro(`it's bad`)
  process.exit(1)
})
```

### Recovery Strategies
Safe operation with cleanup on failures:
```typescript
// Preserve .git directory when cleaning
function emptyDir(dir: string) {
  for (const file of readdirSync(dir)) {
    if (file === '.git') continue  // Preserve git history
    rmSync(resolve(dir, file), { recursive: true, force: true })
  }
}
```

## Key Benefits

### Developer Onboarding
- **Zero Configuration**: Works out of the box with sensible defaults
- **Framework Choice**: Support for popular React frameworks
- **Interactive Guidance**: Step-by-step project setup
- **Package Manager Agnostic**: Works with npm, yarn, and pnpm

### Template Ecosystem
- **Curated Examples**: Official templates for common use cases
- **Best Practices**: Templates demonstrate proper tldraw integration
- **Feature Examples**: Specialized templates for multiplayer, AI, etc.
- **Extensible**: Easy to add new templates for emerging patterns

### Production Ready
- **TypeScript First**: All templates include TypeScript configuration
- **Modern Tooling**: Latest build tools and development servers
- **Deployment Ready**: Templates include production build configurations
- **Testing Setup**: Test frameworks and configurations included

### Maintenance
- **Automated Updates**: Template list auto-generated from repositories
- **Version Consistency**: Templates stay current with tldraw releases
- **Community Driven**: Easy contribution model for new templates
- **Documentation**: Each template includes setup and usage guides