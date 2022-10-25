import * as React from 'react'
import { Route, Routes } from 'react-router-dom'
import './styles.css'
import {Tldraw} from "@tldraw/tldraw";

export default function App() {
  return (
    <main>
      <Routes>
        <Route
          path="/"
          element={
            <div className="tldraw">
              <Tldraw />
            </div>
          }
        />
      </Routes>
    </main>
  )
}
