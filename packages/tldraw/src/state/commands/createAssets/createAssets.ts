import type { TldrawApp } from '~state'
import type { TDAsset, TldrawCommand } from '~types'

export function createAssets(app: TldrawApp, assets: TDAsset[]): TldrawCommand {
  return {
    id: 'create_page',
    before: {}, // this doesn't have to be undoable, assets are purged elsewhere
    after: {
      document: {
        assets: { ...app.document.assets, ...Object.fromEntries(assets.map((a) => [a.id, a])) },
      },
    },
  }
}
