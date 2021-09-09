import * as React from 'react'
import { Switch, Route, Link } from 'react-router-dom'
import Basic from './basic'
import Controlled from './controlled'
import Imperative from './imperative'
import Embedded from './embedded'
import ChangingId from './changing-id'
import './styles.css'

export default function App(): JSX.Element {
  return (
    <main>
      <Switch>
        <Route path="/basic">
          <Basic />
        </Route>
        <Route path="/controlled">
          <Controlled />
        </Route>
        <Route path="/imperative">
          <Imperative />
        </Route>
        <Route path="/changing-id">
          <ChangingId />
        </Route>
        <Route path="/embedded">
          <Embedded />
        </Route>
        <Route path="/">
          <ul>
            <li>
              <Link to="/basic">basic</Link>
            </li>
            <li>
              <Link to="/controlled">controlled</Link>
            </li>
            <li>
              <Link to="/imperative">imperative</Link>
            </li>
            <li>
              <Link to="/changing-id">changing id</Link>
            </li>
            <li>
              <Link to="/embedded">embedded</Link>
            </li>
          </ul>
        </Route>
      </Switch>
    </main>
  )
}
