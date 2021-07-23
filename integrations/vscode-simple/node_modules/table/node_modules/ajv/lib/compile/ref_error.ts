import {resolveUrl, normalizeId, getFullPath} from "./resolve"

export default class MissingRefError extends Error {
  readonly missingRef: string
  readonly missingSchema: string

  constructor(baseId: string, ref: string, msg?: string) {
    super(msg || `can't resolve reference ${ref} from id ${baseId}`)
    this.missingRef = resolveUrl(baseId, ref)
    this.missingSchema = normalizeId(getFullPath(this.missingRef))
  }
}
