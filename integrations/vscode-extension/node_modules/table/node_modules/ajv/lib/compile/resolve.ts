import type {AnySchema, AnySchemaObject} from "../types"
import type Ajv from "../ajv"
import {eachItem} from "./util"
import * as equal from "fast-deep-equal"
import * as traverse from "json-schema-traverse"
import * as URI from "uri-js"

// the hash of local references inside the schema (created by getSchemaRefs), used for inline resolution
export type LocalRefs = {[Ref in string]?: AnySchemaObject}

// TODO refactor to use keyword definitions
const SIMPLE_INLINED = new Set([
  "type",
  "format",
  "pattern",
  "maxLength",
  "minLength",
  "maxProperties",
  "minProperties",
  "maxItems",
  "minItems",
  "maximum",
  "minimum",
  "uniqueItems",
  "multipleOf",
  "required",
  "enum",
  "const",
])

export function inlineRef(schema: AnySchema, limit: boolean | number = true): boolean {
  if (typeof schema == "boolean") return true
  if (limit === true) return !hasRef(schema)
  if (!limit) return false
  return countKeys(schema) <= limit
}

const REF_KEYWORDS = new Set([
  "$ref",
  "$recursiveRef",
  "$recursiveAnchor",
  "$dynamicRef",
  "$dynamicAnchor",
])

function hasRef(schema: AnySchemaObject): boolean {
  for (const key in schema) {
    if (REF_KEYWORDS.has(key)) return true
    const sch = schema[key]
    if (Array.isArray(sch) && sch.some(hasRef)) return true
    if (typeof sch == "object" && hasRef(sch)) return true
  }
  return false
}

function countKeys(schema: AnySchemaObject): number {
  let count = 0
  for (const key in schema) {
    if (key === "$ref") return Infinity
    count++
    if (SIMPLE_INLINED.has(key)) continue
    if (typeof schema[key] == "object") {
      eachItem(schema[key], (sch) => (count += countKeys(sch)))
    }
    if (count === Infinity) return Infinity
  }
  return count
}

export function getFullPath(id = "", normalize?: boolean): string {
  if (normalize !== false) id = normalizeId(id)
  const p = URI.parse(id)
  return _getFullPath(p)
}

export function _getFullPath(p: URI.URIComponents): string {
  return URI.serialize(p).split("#")[0] + "#"
}

const TRAILING_SLASH_HASH = /#\/?$/
export function normalizeId(id: string | undefined): string {
  return id ? id.replace(TRAILING_SLASH_HASH, "") : ""
}

export function resolveUrl(baseId: string, id: string): string {
  id = normalizeId(id)
  return URI.resolve(baseId, id)
}

const ANCHOR = /^[a-z_][-a-z0-9._]*$/i

export function getSchemaRefs(this: Ajv, schema: AnySchema): LocalRefs {
  if (typeof schema == "boolean") return {}
  const {schemaId} = this.opts
  const schId = normalizeId(schema[schemaId])
  const baseIds: {[JsonPtr in string]?: string} = {"": schId}
  const pathPrefix = getFullPath(schId, false)
  const localRefs: LocalRefs = {}
  const schemaRefs: Set<string> = new Set()

  traverse(schema, {allKeys: true}, (sch, jsonPtr, _, parentJsonPtr) => {
    if (parentJsonPtr === undefined) return
    const fullPath = pathPrefix + jsonPtr
    let baseId = baseIds[parentJsonPtr]
    if (typeof sch[schemaId] == "string") baseId = addRef.call(this, sch[schemaId])
    addAnchor.call(this, sch.$anchor)
    addAnchor.call(this, sch.$dynamicAnchor)
    baseIds[jsonPtr] = baseId

    function addRef(this: Ajv, ref: string): string {
      ref = normalizeId(baseId ? URI.resolve(baseId, ref) : ref)
      if (schemaRefs.has(ref)) throw ambiguos(ref)
      schemaRefs.add(ref)
      let schOrRef = this.refs[ref]
      if (typeof schOrRef == "string") schOrRef = this.refs[schOrRef]
      if (typeof schOrRef == "object") {
        checkAmbiguosRef(sch, schOrRef.schema, ref)
      } else if (ref !== normalizeId(fullPath)) {
        if (ref[0] === "#") {
          checkAmbiguosRef(sch, localRefs[ref], ref)
          localRefs[ref] = sch
        } else {
          this.refs[ref] = fullPath
        }
      }
      return ref
    }

    function addAnchor(this: Ajv, anchor: unknown): void {
      if (typeof anchor == "string") {
        if (!ANCHOR.test(anchor)) throw new Error(`invalid anchor "${anchor}"`)
        addRef.call(this, `#${anchor}`)
      }
    }
  })

  return localRefs

  function checkAmbiguosRef(sch1: AnySchema, sch2: AnySchema | undefined, ref: string): void {
    if (sch2 !== undefined && !equal(sch1, sch2)) throw ambiguos(ref)
  }

  function ambiguos(ref: string): Error {
    return new Error(`reference "${ref}" resolves to more than one schema`)
  }
}
