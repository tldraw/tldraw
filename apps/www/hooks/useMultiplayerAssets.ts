import { Utils } from '@tldraw/core'
import { TDAsset, TldrawApp } from '@tldraw/tldraw'
import { useCallback } from 'react'

export function useMultiplayerAssets() {
  const onAssetCreate = useCallback(
    // Send the asset to our upload endpoint, which in turn will send it to AWS and
    // respond with the URL of the uploaded file.
    async (app: TldrawApp, file: File, id: string): Promise<string | false> => {
      const filename = encodeURIComponent((id ?? Utils.uniqueId()) + file.name)

      const fileType = encodeURIComponent(file.type)

      const res = await fetch(`/api/upload?file=${filename}&fileType=${fileType}`)

      const { url, fields } = await res.json()

      const formData = new FormData()

      Object.entries({ ...fields, file }).forEach(([key, value]) => {
        formData.append(key, value as any)
      })

      const upload = await fetch(url, {
        method: 'POST',
        body: formData,
      })

      if (!upload.ok) return false

      return url + '/' + filename
    },
    []
  )

  const onAssetDelete = useCallback(async (app: TldrawApp, id: string): Promise<boolean> => {
    // noop
    return true
  }, [])

  return { onAssetCreate, onAssetDelete }
}
