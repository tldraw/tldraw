import { Data, Page, PageState, TLDocument } from 'types'
import { decompress, compress } from 'utils'
import state from './state'
import { uniqueId } from 'utils/utils'
import * as idb from 'idb-keyval'

const CURRENT_VERSION = 'code_slate_0.0.9'

function storageId(fileId: string, label: string, id?: string) {
  return [CURRENT_VERSION, fileId, label, id].filter(Boolean).join('_')
}

class Storage {
  previousSaveHandle?: any // FileSystemHandle

  firstLoad(data: Data, roomId = 'TESTING') {
    const lastOpenedFileId =
      roomId || localStorage.getItem(`${CURRENT_VERSION}_lastOpened`)

    // 1. Load Document from Local Storage
    // Using the "last opened file id" in local storage.
    if (lastOpenedFileId !== null) {
      // Load state from local storage
      const savedState = localStorage.getItem(
        storageId(lastOpenedFileId, 'document-state', lastOpenedFileId)
      )

      if (!savedState) {
        // If no state with that document was found, create a fresh random id.
        data.document.id = roomId ? roomId : uniqueId()
      } else {
        // If we did find a state and document, load it into state.
        const restoredState: Data = JSON.parse(decompress(savedState))

        // Lose the settings, these are meant to be stable
        delete restoredState.settings

        // Merge restored data into state.
        Object.assign(data, restoredState)
      }
    }

    this.load(data)
  }

  saveAppStateToLocalStorage = (data: Data) => {
    localStorage.setItem(
      storageId(data.document.id, 'document-state', data.document.id),
      compress(JSON.stringify(data))
    )
  }

  saveDocumentToLocalStorage(data: Data) {
    const document = this.getCompleteDocument(data, false)

    localStorage.setItem(
      storageId(data.document.id, 'document', data.document.id),
      compress(JSON.stringify(document))
    )

    localStorage.setItem(`${CURRENT_VERSION}_lastOpened`, data.document.id)
  }

  getCompleteDocument = (data: Data, preventUpdate: boolean) => {
    // Create a safely mutable copy of the data
    const document: TLDocument = { ...data.document }

    // Try to find the document's pages and page states in local storage.
    Object.keys(document.pages).forEach((pageId) => {
      const savedPage = localStorage.getItem(
        storageId(document.id, 'page', pageId)
      )

      if (savedPage !== null && preventUpdate !== true) {
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
    data.pageStates[restoredDocument.pageState.id] = restoredDocument.pageState

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
      } else {
        // Or else create a new one.
        data.pageStates[pageId] = {
          id: pageId,
          selectedIds: [],
          camera: {
            point: [0, 0],
            zoom: 1,
          },
        }
      }
    })

    // 3. Restore the last page state
    // Using the "last page state" in local storage.

    try {
      const savedPageState = localStorage.getItem(
        storageId(data.document.id, 'lastPageState', data.document.id)
      )
      const pageState = JSON.parse(decompress(savedPageState))

      if (!data.document.pages[pageState.id]) {
        throw new Error('Page state id not in document')
      }

      pageState.selectedIds = []
      data.pageStates[pageState.id] = pageState
      data.currentPageId = pageState.id
    } catch (e) {
      data.pageStates[data.currentPageId] = {
        id: data.currentPageId,
        selectedIds: [],
        camera: {
          point: [0, 0],
          zoom: 1,
        },
      }
    }

    // 4. Save the current app state / document
    // The document is now "full" and ready. Whether we've restored a
    // document or created a new one, save the entire current document.
    this.saveDocumentToLocalStorage(data)

    // 4.1
    // Also save the app state.
    this.saveAppStateToLocalStorage(data)

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

    // Load the current page
    this.loadPage(data, data.document.id, data.currentPageId)

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

    // Notify extension that something has changed. This ends up being called by
    // the history execute/redo/undo commands, so we put this here.
    //console.log(`"update" (webview <- iframe)`)
    if (window.self !== window.top) {
      const document = this.getCompleteDocument(data, true)
      window.parent.postMessage(
        {
          type: 'update',
          text: JSON.stringify({
            document,
            pageState: data.pageStates[data.currentPageId],
          }),
        },
        '*'
      )
    }

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
        selectedIds: [...currentPageState.selectedIds],
      })
    )
  }

  getPageFromLocalStorage(
    data: Data,
    fileId = data.document.id,
    pageId = data.currentPageId
  ): Page {
    if (typeof window === 'undefined') return
    if (typeof localStorage === 'undefined') return

    let page: Page

    try {
      const savedPage = localStorage.getItem(storageId(fileId, 'page', pageId))
      if (savedPage === null) {
        throw Error('That page is not in local storage.')
      }

      page = JSON.parse(decompress(savedPage))
    } catch (e) {
      throw Error('Could not load a page with the id ' + pageId)
    }

    return page
  }

  getPageStateFromLocalStorage(
    data: Data,
    fileId = data.document.id,
    pageId = data.currentPageId
  ): PageState {
    if (typeof window === 'undefined') return
    if (typeof localStorage === 'undefined') return

    let pageState: PageState

    try {
      const savedPageState = localStorage.getItem(
        storageId(fileId, 'pageState', pageId)
      )
      if (savedPageState === null) {
        throw Error('That page state is not in local storage.')
      }

      pageState = JSON.parse(decompress(savedPageState))
    } catch (e) {
      throw Error('Could not load a page state with the id ' + pageId)
    }

    return pageState
  }

  /**
   * Apply changes to a page in local storage.
   *
   * ### Example
   *
   *```ts
   * storage.renamePageInLocalStorage(data, 'fileId', 'pageId', 'newPageName')
   *```
   */
  renamePageInLocalStorage(
    data: Data,
    fileId = data.document.id,
    pageId = data.currentPageId,
    name: string
  ) {
    const page = this.getPageFromLocalStorage(data, fileId, pageId)

    page.name = name

    localStorage.setItem(
      storageId(fileId, 'page', pageId),
      compress(JSON.stringify(page))
    )
  }

  loadPage(data: Data, fileId = data.document.id, pageId = data.currentPageId) {
    if (typeof window === 'undefined') return
    if (typeof localStorage === 'undefined') return

    data.currentPageId = pageId

    try {
      // If we have a page in local storage, move it into state
      const savedPage = localStorage.getItem(storageId(fileId, 'page', pageId))

      if (savedPage === null) {
        // Why would the page be null?
        // TODO: Find out why the page would be null.
        throw new Error('Could not find that page')
      } else {
        data.document.pages[pageId] = JSON.parse(decompress(savedPage))
      }
    } catch (e) {
      if (fileId !== 'TESTING') {
        throw new Error('Could not load a page with the id ' + pageId)
      }

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
    } else {
      data.pageStates[pageId] = {
        id: pageId,
        camera: {
          point: [0, 0],
          zoom: 1,
        },
        selectedIds: [],
      }
    }

    // Save the last page state
    localStorage.setItem(
      storageId(fileId, 'lastPageState'),
      JSON.stringify(data.pageStates[pageId])
    )

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

  reset = () => {
    this.previousSaveHandle = undefined
  }

  saveToFileSystem = (data: Data) => {
    this.saveDataToFileSystem(data, false)
  }

  saveAsToFileSystem = (data: Data) => {
    this.saveDataToFileSystem(data, true)
  }

  saveDataToFileSystem = async (data: Data, saveAs: boolean) => {
    if (window.self !== window.top) {
      //console.log(`"save" (webview <- iframe)`)
      window.parent.postMessage({ type: 'save' }, '*')
      return
    }

    const isSavingAs = saveAs || !this.previousSaveHandle
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

    const documentName = data.document.name

    const fa = await import('browser-fs-access')

    fa.fileSave(
      blob,
      {
        fileName: `${
          isSavingAs
            ? documentName
            : this.previousSaveHandle?.name || 'My Document'
        }.tldr`,
        description: 'tldraw file',
        extensions: ['.tldr'],
      },
      isSavingAs ? undefined : this.previousSaveHandle,
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
