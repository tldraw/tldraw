# Licensing

This document explains how tldraw is licensed and what licenses apply to different parts of the codebase.

The tldraw repository uses a dual-licensing model:

- **tldraw License**: A proprietary license for the core SDK packages that requires a license key for production use
- **MIT License**: A permissive open-source license for utility packages and templates

## The tldraw license

The core SDK is provided under the [tldraw license](https://github.com/tldraw/tldraw/blob/main/LICENSE.md). This license allows:

**Permissions:**

- Use in development environments
- Modify the software to suit your needs
- Bundle the software with your own projects
- Submit modifications back to tldraw

**Conditions:**

- Production use requires a commercial license or trial license
- You must not disable or interfere with license key enforcement
- You must not remove copyright notices
- You must include a copy of the license in any distribution
- You can only distribute the software as part of another application, not standalone

### License types

| License type               | Duration                              | Watermark | Grace period |
| -------------------------- | ------------------------------------- | --------- | ------------ |
| **Commercial (Annual)**    | 1 year                                | No        | 30 days      |
| **Commercial (Perpetual)** | Forever (up to max supported version) | No        | 30 days      |
| **Evaluation/Trial**       | Limited period                        | No        | None         |
| **Watermark license**      | Varies                                | Yes       | 30 days      |

### Development vs production

The license differentiates between environments:

- **Development environment**: HTTP on localhost, or `NODE_ENV !== 'production'`. No license key required.
- **Production environment**: HTTPS on non-localhost domains. Requires a valid license key.

Without a valid license key in production, the SDK displays a "Made with tldraw" watermark.

### Getting a license

- Visit [tldraw.dev](https://tldraw.dev) to learn about licensing options
- Contact [sales@tldraw.com](mailto:sales@tldraw.com) for commercial licensing or trial requests

## Package licenses

### Packages under tldraw license

These packages require a license for production use:

| Package                      | npm name            | Description                             |
| ---------------------------- | ------------------- | --------------------------------------- |
| `packages/tldraw`            | `tldraw`            | Complete SDK with UI, shapes, and tools |
| `packages/editor`            | `@tldraw/editor`    | Core editor engine                      |
| `packages/sync`              | `@tldraw/sync`      | Multiplayer sync SDK                    |
| `packages/sync-core`         | `@tldraw/sync-core` | Core sync functionality                 |
| `packages/assets`            | `@tldraw/assets`    | Icons, fonts, and translations          |
| `packages/namespaced-tldraw` | `@tldraw/tldraw`    | Namespaced version of tldraw            |

### Packages under MIT license

These packages are freely available under the MIT license:

| Package                | npm name              | Description                     |
| ---------------------- | --------------------- | ------------------------------- |
| `packages/utils`       | `@tldraw/utils`       | Shared utility functions        |
| `packages/store`       | `@tldraw/store`       | Reactive client-side database   |
| `packages/state`       | `@tldraw/state`       | Reactive signals library        |
| `packages/state-react` | `@tldraw/state-react` | React bindings for signals      |
| `packages/tlschema`    | `@tldraw/tlschema`    | Type definitions and validators |
| `packages/validate`    | `@tldraw/validate`    | Lightweight validation library  |

## Application licenses

| Application             | License | Description                     |
| ----------------------- | ------- | ------------------------------- |
| `apps/docs`             | MIT     | Documentation site (tldraw.dev) |
| `apps/examples`         | MIT     | SDK examples and demos          |
| `apps/vscode/extension` | MIT     | VSCode extension                |
| `apps/vscode/editor`    | MIT     | VSCode extension editor         |

## Template licenses

All templates are provided under the MIT license:

| Template                    | Description               |
| --------------------------- | ------------------------- |
| `templates/vite`            | Vite starter template     |
| `templates/nextjs`          | Next.js starter template  |
| `templates/sync-cloudflare` | Cloudflare sync template  |
| `templates/vue`             | Vue.js starter template   |
| `templates/agent`           | AI agent template         |
| `templates/chat`            | Chat application template |
| `templates/branching-chat`  | Branching chat template   |
| `templates/workflow`        | Workflow template         |
| `templates/shader`          | Shader template           |

## Using the license key

To use tldraw in production without the watermark, pass your license key to the `Tldraw` component:

```tsx
import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

export default function App() {
	return <Tldraw licenseKey="your-license-key" />
}
```

The license key is validated against:

- The domain(s) it was issued for
- The expiration date
- The license type and flags

## Watermark behavior

| Scenario                                  | Watermark shown          |
| ----------------------------------------- | ------------------------ |
| Development environment (localhost, HTTP) | No                       |
| Production with valid license             | No                       |
| Production with valid watermark license   | Yes                      |
| Production with no license key            | Yes                      |
| Production with invalid/expired license   | Yes (after grace period) |

## Additional resources

- [tldraw license text](https://github.com/tldraw/tldraw/blob/main/LICENSE.md)
- [tldraw.dev pricing](https://tldraw.dev#pricing)
- [Trademark guidelines](https://github.com/tldraw/tldraw/blob/main/TRADEMARKS.md)
- [Contributor license agreement](https://tldraw.dev/legal/contributor-license-agreement)
