import { atom } from 'tldraw'
import { TodoItem } from '../../shared/types/TodoItem'

export const $todoItems = atom<TodoItem[]>('todoItems', [])
