/* eslint-disable */
const fs = require('fs')

const filesToCopy = ['README.md', 'CHANGELOG.md', 'LICENSE.md', 'card-repo.png']

filesToCopy.forEach((file) => {
  fs.copyFile(`../../${file}`, `./${file}`, (err) => {
    if (err) throw err
  })
})
