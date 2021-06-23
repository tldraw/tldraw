import { Data, PageState, TLDocument } from 'types'
import { decompress, compress, setToArray } from 'utils/utils'
import state from './state'
import { uniqueId } from 'utils/utils'
import * as idb from 'idb-keyval'

const CURRENT_VERSION = 'code_slate_0.0.8'

function storageId(fileId: string, label: string, id?: string) {
  return [CURRENT_VERSION, fileId, label, id].filter(Boolean).join('_')
}

class Storage {
  previousSaveHandle?: any // FileSystemHandle

  constructor() {
    // this.loadPreviousHandle() // Still needs debugging
  }

  firstLoad(data: Data) {
    const lastOpenedFileId = localStorage.getItem(
      `${CURRENT_VERSION}_lastOpened`
    )

    // 1. Load Document from Local Storage
    // Using the "last opened file id" in local storage.
    if (lastOpenedFileId !== null) {
      // Load document from local storage
      const savedDocument = localStorage.getItem(
        storageId(lastOpenedFileId, 'document', lastOpenedFileId)
      )

      if (savedDocument === null) {
        // If no document found, create a fresh random id.
        data.document.id = uniqueId()
      } else {
        // If we did find a document, load it into state.
        const restoredDocument: TLDocument = JSON.parse(
          decompress(savedDocument)
        )

        // Merge restored data into state.
        data.document = restoredDocument
      }
    }

    try {
      this.load(data)
    } catch (error) {
      console.error(error)
    }
  }

  saveDocumentToLocalStorage(data: Data) {
    const document = this.getCompleteDocument(data)

    localStorage.setItem(
      storageId(data.document.id, 'document', data.document.id),
      compress(JSON.stringify(document))
    )
  }

  getCompleteDocument = (data: Data) => {
    // Create a safely mutable copy of the data
    const document: TLDocument = { ...data.document }

    // Try to find the document's pages and page states in local storage.
    Object.keys(document.pages).forEach((pageId) => {
      const savedPage = localStorage.getItem(
        storageId(document.id, 'page', pageId)
      )

      if (savedPage !== null) {
        document.pages[pageId] = JSON.parse(decompress(savedPage))
      }
    })

    return document
  }

  savePageState = (data: Data) => {
    localStorage.setItem(
      storageId(data.document.id, 'lastPageState', data.document.id),
      JSON.stringify(data.pageStates[data.currentPageId])
    )
  }

  loadDocumentFromJson(data: Data, json: string) {
    const restoredDocument: { document: TLDocument; pageState: PageState } =
      JSON.parse(json)

    data.document = restoredDocument.document

    // Save pages to local storage, possibly overwriting unsaved local copies
    Object.values(data.document.pages).forEach((page) => {
      localStorage.setItem(
        storageId(data.document.id, 'page', page.id),
        compress(JSON.stringify(page))
      )
    })

    localStorage.setItem(
      storageId(data.document.id, 'lastPageState', data.document.id),
      JSON.stringify(restoredDocument.pageState)
    )

    // Save the new file as the last opened document id
    localStorage.setItem(`${CURRENT_VERSION}_lastOpened`, data.document.id)

    this.load(data)
  }

  load(data: Data) {
    // Once we've loaded data either from local storage or json, run through these steps.
    data.pageStates = {}

    // 2. Load Pages from Local Storage
    // Try to find the document's pages and page states in local storage.
    Object.keys(data.document.pages).forEach((pageId) => {
      const savedPage = localStorage.getItem(
        storageId(data.document.id, 'page', pageId)
      )

      if (savedPage !== null) {
        // If we've found a page in local storage, set it into state.
        data.document.pages[pageId] = JSON.parse(decompress(savedPage))
      }

      const savedPageState = localStorage.getItem(
        storageId(data.document.id, 'pageState', pageId)
      )

      if (savedPageState !== null) {
        // If we've found a page state in local storage, set it into state.
        data.pageStates[pageId] = JSON.parse(decompress(savedPageState))
        data.pageStates[pageId].selectedIds = new Set([])
      } else {
        // Or else create a new one.
        data.pageStates[pageId] = {
          id: pageId,
          selectedIds: new Set([]),
          camera: {
            point: [0, 0],
            zoom: 1,
          },
        }
      }
    })

    // 3. Restore the last page state
    // Using the "last page state" in local storage.
    const savedPageState = localStorage.getItem(
      storageId(data.document.id, 'lastPageState', data.document.id)
    )

    if (savedPageState !== null) {
      const pageState = JSON.parse(decompress(savedPageState))
      pageState.selectedIds = new Set([])
      data.pageStates[pageState.id] = pageState
      data.currentPageId = pageState.id
    }

    // 4. Save the current document
    // The document is now "full" and ready. Whether we've restored a
    // document or created a new one, save the entire current document.
    localStorage.setItem(
      storageId(data.document.id, 'document', data.document.id),
      compress(JSON.stringify(data.document))
    )

    // 4.1
    // Also save out copies of each page separately.
    Object.values(data.document.pages).forEach((page) => {
      // Save page
      localStorage.setItem(
        storageId(data.document.id, 'page', page.id),
        compress(JSON.stringify(page))
      )
    })

    // Save the last page state
    const currentPageState = data.pageStates[data.currentPageId]

    localStorage.setItem(
      storageId(data.document.id, 'lastPageState', data.document.id),
      JSON.stringify(currentPageState)
    )

    // Finally, save the current document id as the "last opened" document id.
    localStorage.setItem(`${CURRENT_VERSION}_lastOpened`, data.document.id)

    // 5. Prepare the new state.
    // Clear out the other pages from state.
    Object.values(data.document.pages).forEach((page) => {
      if (page.id !== data.currentPageId) {
        page.shapes = {}
      }
    })

    // Update camera for the new page state
    document.documentElement.style.setProperty(
      '--camera-zoom',
      data.pageStates[data.currentPageId].camera.zoom.toString()
    )
  }
  /* ---------------------- Pages --------------------- */

  async loadPreviousHandle() {
    const handle = await idb.get('previous_handle')

    if (handle !== undefined) {
      this.previousSaveHandle = handle
    }
  }

  savePage(data: Data, fileId = data.document.id, pageId = data.currentPageId) {
    const page = data.document.pages[pageId]

    // Save page

    localStorage.setItem(
      storageId(fileId, 'page', pageId),
      compress(JSON.stringify(page))
    )

    // Save page state
    const currentPageState = data.pageStates[pageId]

    localStorage.setItem(
      storageId(fileId, 'pageState', pageId),
      JSON.stringify({
        ...currentPageState,
        selectedIds: setToArray(currentPageState.selectedIds),
      })
    )
  }

  loadPage(data: Data, fileId = data.document.id, pageId = data.currentPageId) {
    if (typeof window === 'undefined') return
    if (typeof localStorage === 'undefined') return

    data.currentPageId = pageId

    // Get saved page from local storage
    const savedPage = localStorage.getItem(storageId(fileId, 'page', pageId))

    if (savedPage !== null) {
      // If we have a page, move it into state
      data.document.pages[pageId] = JSON.parse(decompress(savedPage))
    } else {
      // If we don't have a page, create a new page
      data.document.pages[pageId] = {
        id: pageId,
        type: 'page',
        childIndex: Object.keys(data.document.pages).length,
        name: 'New Page',
        shapes: {},
      }
    }

    // Get saved page state from local storage
    const savedPageState = localStorage.getItem(
      storageId(fileId, 'pageState', pageId)
    )

    if (savedPageState !== null) {
      // If we have a page, move it into state
      const restored: PageState = JSON.parse(savedPageState)
      data.pageStates[pageId] = restored
      data.pageStates[pageId].selectedIds = new Set(restored.selectedIds)
    } else {
      data.pageStates[pageId] = {
        id: pageId,
        camera: {
          point: [0, 0],
          zoom: 1,
        },
        selectedIds: new Set([]),
      }
    }

    // Save the last page state
    localStorage.setItem(
      storageId(fileId, 'lastPageState'),
      JSON.stringify(data.pageStates[pageId])
    )

    // Prepare new state

    // Now clear out the other pages from state.
    Object.values(data.document.pages).forEach((page) => {
      if (page.id !== data.currentPageId) {
        page.shapes = {}
      }
    })

    // Update camera for the new page state
    document.documentElement.style.setProperty(
      '--camera-zoom',
      data.pageStates[data.currentPageId].camera.zoom.toString()
    )
  }

  /* ------------------- File System ------------------ */

  saveToFileSystem = (data: Data) => {
    this.saveDocumentToLocalStorage(data)
    this.saveDataToFileSystem(data, data.document.id, false)
  }

  saveAsToFileSystem = (data: Data) => {
    this.saveDocumentToLocalStorage(data)
    this.saveDataToFileSystem(data, uniqueId(), true)
  }

  saveDataToFileSystem = async (
    data: Data,
    fileId: string,
    saveAs: boolean
  ) => {
    const document = this.getCompleteDocument(data)

    // Then save to file system
    const blob = new Blob(
      [
        compress(
          JSON.stringify({
            document,
            pageState: data.pageStates[data.currentPageId],
          })
        ),
      ],
      {
        type: 'application/vnd.tldraw+json',
      }
    )

    const fa = await import('browser-fs-access')

    fa.fileSave(
      blob,
      {
        fileName: `${
          saveAs
            ? data.document.name
            : this.previousSaveHandle?.name || 'My Document'
        }.tldr`,
        description: 'tldraw file',
        extensions: ['.tldr'],
      },
      saveAs ? undefined : this.previousSaveHandle,
      true
    )
      .then((handle) => {
        this.previousSaveHandle = handle
        state.send('SAVED_FILE_TO_FILE_SYSTEM')
        idb.set('previous_handle', handle)
      })
      .catch((e) => {
        state.send('CANCELLED_SAVE', { reason: e.message })
      })
  }

  async loadDocumentFromFilesystem() {
    const fa = await import('browser-fs-access')

    fa.fileOpen({
      description: 'tldraw files',
    })
      .then((blob) =>
        getTextFromBlob(blob).then((json) => {
          // Save blob for future saves
          this.previousSaveHandle = blob.handle

          state.send('LOADED_FROM_FILE', { json: decompress(json) })
        })
      )
      .catch((e) => {
        state.send('CANCELLED_SAVE', { reason: e.message })
      })
  }
}

const storage = new Storage()

export default storage

async function getTextFromBlob(blob: Blob): Promise<string> {
  // Return blob as text if a text file.
  if ('text' in Blob) return blob.text()

  // Return blob as text if a text file.
  return new Promise((resolve) => {
    const reader = new FileReader()

    reader.onloadend = () => {
      if (reader.readyState === FileReader.DONE) {
        resolve(reader.result as string)
      }
    }

    reader.readAsText(blob, 'utf8')
  })
}
