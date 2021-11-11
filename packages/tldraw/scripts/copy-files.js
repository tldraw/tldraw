/* eslint-disable */
const fs = require('fs')

const filesToCopy = ['CHANGELOG.md', 'LICENSE.md', 'card-repo.png']

filesToCopy.forEach((file) => {
  fs.copyFile(`../../${file}`, `./${file}`, (err) => {
    if (err) throw err
  })
})
