import * as React from 'react'
import {Link, Route, Routes} from 'react-router-dom'
import './styles.css'
import SVBBoard from "~SVBBoard";

// TODO: handle real board ids, e.g. /svb/342587249854
const pages: ({ path: string; component: any; title: string } | '---')[] = [
  { path: '/svb/1', component: SVBBoard, title: 'Board 1' },
  '---',
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
