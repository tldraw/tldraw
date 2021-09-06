import { TLDrawProject } from '-types'
import { TLDrawDocument, defaultDocument } from '@tldraw/tldraw'
import { supabase } from '-supabase/client'

/**
 * Create a new shared project. Visits to the project URL will display the project.
 * @param doc The tldraw document.
 * @returns
 */
export async function createProject(doc: TLDrawDocument) {
  return supabase.from<TLDrawProject>('projects').insert([{ id: doc.id, document: doc }])
}

/**
 * Get a shared project from the database based on a tldraw document.
 * @param doc The tldraw document.
 * @returns
 */
export async function fetchProject(id: string) {
  const { data, error } = await supabase.from<TLDrawProject>('projects').select('*').eq('id', id)
  const project = data[0]

  if (error) {
    console.log(error)
  }

  if (!data[0]) {
    const project = { ...defaultDocument, id }
    const result = await createProject(project)
    console.log(result)

    console.log('not found on server, returning')
    return project
  }

  console.log('returning data found on server')
  return project
}

/**
 * Update a shared project.
 * @param doc The tldraw document.
 * @returns
 */
export async function updateProject(doc: TLDrawDocument) {
  return supabase.from<TLDrawProject>('projects').update({ document: doc }).eq('id', doc.id)
}

/**
 * Delete (unshare) a shared project. Visits to the project URL will no longer return the project.
 * @param id The document's id.
 * @returns
 */
export async function deleteProject(id: string) {
  return supabase.from<TLDrawProject>('projects').delete().eq('id', id)
}
