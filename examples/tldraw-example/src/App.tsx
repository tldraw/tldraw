import * as React from 'react'
import { Link, Route, Routes } from 'react-router-dom'
import CustomCursorsExample from '~custom-cursors'
import Export from '~export'
import IFrame from '~iframe'
import Api from './api'
import ApiControl from './api-control'
import Basic from './basic'
import ChangingId from './changing-id'
import DarkMode from './dark-mode'
import Develop from './develop'
import Embedded from './embedded'
import FileSystem from './file-system'
import LoadingFiles from './loading-files'
import { Multiplayer } from './multiplayer'
import NoSizeEmbedded from './no-size-embedded'
import Persisted from './persisted'
import PropsControl from './props-control'
import ReadOnly from './readonly'
import Scroll from './scroll'
import './styles.css'
import UIOptions from './ui-options'

const pages: ({ path: string; component: any; title: string } | '---')[] = [
  { path: '/develop', component: Develop, title: 'Develop' },
  '---',
  { path: '/basic', component: Basic, title: 'Basic' },
  { path: '/dark-mode', component: DarkMode, title: 'Dark mode' },
  { path: '/ui-options', component: UIOptions, title: 'Custom UI' },
  { path: '/persisted', component: Persisted, title: 'Persisting state with an ID' },
  { path: '/loading-files', component: LoadingFiles, title: 'Using the file system' },
  { path: '/file-system', component: FileSystem, title: 'Loading files' },
  { path: '/api', component: Api, title: 'Using the TldrawApp API' },
  { path: '/readonly', component: ReadOnly, title: 'Readonly mode' },
  { path: '/controlled', component: PropsControl, title: 'Controlled via props' },
  { path: '/imperative', component: ApiControl, title: 'Controlled via the TldrawApp API' },
  { path: '/changing-id', component: ChangingId, title: 'Changing ID' },
  { path: '/custom-cursors', component: CustomCursorsExample, title: 'Custom Cursors' },
  { path: '/embedded', component: Embedded, title: 'Embedded' },
  {
    path: '/no-size-embedded',
    component: NoSizeEmbedded,
    title: 'Embedded (without explicit size)',
  },
  { path: '/export', component: Export, title: 'Export' },
  { path: '/scroll', component: Scroll, title: 'In a scrolling container' },
  { path: '/multiplayer', component: Multiplayer, title: 'Multiplayer' },
  { path: '/iframe', component: IFrame, title: 'IFrame' },
]

export default function App() {
  return (
    <main>
      <Routes>
        {pages.map((page) =>
          page === '---' ? null : (
            <Route key={page.path} path={page.path} element={<page.component />} />
          )
        )}

        <Route
          path="/"
          element={
            <div>
              <img className="hero" src="./card-repo.png" />
              <ul className="links">
                {pages.map((page, i) =>
                  page === '---' ? (
                    <hr key={i} />
                  ) : (
                    <li key={i}>
                      <Link to={page.path}>{page.title}</Link>
                    </li>
                  )
                )}
              </ul>
            </div>
          }
        />
      </Routes>
    </main>
  )
}
