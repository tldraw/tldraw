// import { Utils } from '@tldraw/core'
// import type { TDDocument, TDPage } from '~types'
// import { action, makeAutoObservable } from 'mobx'
// import { Page, PageState } from '.'

// export class Document implements TDDocument {
//   id
//   version
//   name
//   pages
//   pageStates

//   constructor(opts = {} as Partial<TDDocument>) {
//     const { id, version, name, pages, pageStates } = { ...opts, ...Document.defaultProps }
//     this.id = id
//     this.version = version
//     this.name = name
//     this.pages = pages
//     this.pageStates = pageStates
//     makeAutoObservable(this)
//   }

//   @action update = (change: Partial<TDDocument>) => {
//     Object.assign(this, change)
//   }

//   static defaultProps: TDDocument = {
//     id: Utils.uniqueId(),
//     version: 16,
//     name: 'My Document',
//     pages: {
//       page: new Page({ id: 'page' }),
//     },
//     pageStates: {
//       page: new PageState({ id: 'page' }),
//     },
//   }
// }
