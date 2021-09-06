import { updateProject } from '-supabase/server-functions'
import { NextApiHandler } from 'next'

const UpdateProject: NextApiHandler<string> = async (req, res) => {
  const { document } = req.body

  updateProject(document)

  res.statusCode = 200
  res.send('Updated')
}

export default UpdateProject
