// Retire le squelette HTML de dist/index.html : la page partagée reçoit le sien à la publication.
import { readFileSync, writeFileSync } from 'node:fs'

const html = readFileSync('dist/index.html', 'utf8')
const head = html.slice(html.indexOf('<head>') + 6, html.indexOf('</head>'))
const body = html.slice(html.indexOf('<body>') + 6, html.lastIndexOf('</body>'))
const keep = head.replace(/<meta charset[^>]*>\s*/i, '').replace(/<meta name="viewport"[^>]*>\s*/i, '')
writeFileSync('dist/dini-prototype.html', `${keep}\n${body}`)
