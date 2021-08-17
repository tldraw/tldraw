/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import * as React from 'react'
import { openDB, DBSchema } from 'idb'
import type { TLDrawDocument } from '@tldraw/tldraw'

const VERSION = 4

interface TLDatabase extends DBSchema {
  documents: {
    key: string
    value: TLDrawDocument
  }
}

/**
 * Persist a value in indexdb. This hook is designed to be used primarily through
 * its methods, `setValue` and `forceUpdate`. The `setValue` method will update the
 * value in the database, howeever it will NOT cause the hook's component to update.
 * The `forceUpdate` method will cause the component to update with the latest value
 * in the database.
 *
 * ### Example
 *
 *```ts
 * const {status, value, setValue, forceUpdate} = usePersistence()
 *```
 */
export function usePersistence(id: string, doc: TLDrawDocument) {
  const [status, setStatus] = React.useState<'loading' | 'ready'>('loading')
  const [value, _setValue] = React.useState<TLDrawDocument | null>(null)

  // A function that other parts of the program can use to manually update
  // the state to the latest value in the database.
  const forceUpdate = React.useCallback(() => {
    _setValue(null)
    setStatus('loading')

    openDB<TLDatabase>('db', VERSION).then((db) =>
      db.get('documents', id).then((v) => {
        if (!v) throw Error(`Could not find document with id: ${id}`)
        _setValue(v)
        setStatus('ready')
      })
    )
  }, [id])

  // A function that other parts of the program can use to manually set the
  // value in the database.
  const setValue = React.useCallback(
    (doc: TLDrawDocument) => {
      openDB<TLDatabase>('db', VERSION).then((db) => db.put('documents', doc, id))
    },
    [id]
  )

  // Whenever the id or doc changes, save the new value to the database and update
  // the state.
  React.useEffect(() => {
    async function handleLoad() {
      const db = await openDB<TLDatabase>('db', VERSION, {
        upgrade(db, oldVersion, newVersion) {
          if (newVersion) {
            db.deleteObjectStore('documents')
            db.createObjectStore('documents')
          }
        },
      })

      let savedDoc: TLDrawDocument

      try {
        const restoredDoc = await db.get('documents', id)
        if (!restoredDoc) throw Error('No document')
        savedDoc = restoredDoc
        restoredDoc.pageStates = Object.fromEntries(
          Object.entries(restoredDoc.pageStates).map(([pageId, pageState]) => [
            pageId,
            {
              ...pageState,
              hoveredId: undefined,
              editingId: undefined,
            },
          ])
        )
      } catch (e) {
        await db.put('documents', doc, id)
        savedDoc = doc
      }

      _setValue(savedDoc)
      setStatus('ready')
    }

    handleLoad()
  }, [id, doc])

  return { value, status, setValue, forceUpdate }
}
