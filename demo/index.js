const express = require('express')
const app = express()
const port = 3001
const path = require('path')

const publicPath = path.join(__dirname, './public')
app.use('/', express.static(publicPath))

const distPath = path.join(__dirname, '../dist')
app.use('/dist', express.static(distPath))

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})