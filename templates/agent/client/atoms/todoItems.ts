import { atom } from 'tldraw'
import { TodoItem } from '../../shared/types/TodoItem'
import { persistAtomInLocalStorage } from './persistAtomInLocalStorage'

export const $todoItems = atom<TodoItem[]>('todoItems', [])

persistAtomInLocalStorage($todoItems, 'todo-items')
