import React from 'react'

export function useMultiplayerAssets() {
  const onAssetCreate = React.useCallback(
    async (file: File, id: string): Promise<string | false> => {
      const filename = encodeURIComponent(file.name)
      const res = await fetch(`/api/upload?file=${filename}`)
      const { url, fields } = await res.json()
      const formData = new FormData()
      Object.entries({ ...fields, file }).forEach(([key, value]) => {
        formData.append(key, value as any)
      })
      const upload = await fetch(url, {
        method: 'POST',
        body: formData,
        // CORS
      })
      if (upload.ok) {
        return url + '/' + filename
      } else {
        return false
      }
    },
    []
  )

  const onAssetDelete = React.useCallback(async (id: string): Promise<boolean> => {
    // noop
    return true
  }, [])

  return { onAssetCreate, onAssetDelete }
}
