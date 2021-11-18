/* eslint-disable */
const fs = require('fs')

const filesToCopy = ['README.md']

filesToCopy.forEach((file) => {
  fs.copyFile(`../../${file}`, `./${file}`, (err) => {
    if (err) throw err
  })
})
