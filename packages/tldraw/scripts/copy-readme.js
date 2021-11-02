/* eslint-disable */
const fs = require('fs')

const filesToCopy = ['README.md', 'card-repo.png']

filesToCopy.forEach((file) => {
  fs.copyFile(`../../${file}`, `./dist/${file}`, (err) => {
    if (err) throw err
  })
})
