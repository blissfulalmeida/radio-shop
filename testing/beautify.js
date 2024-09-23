const fs = require('fs');
const path = require('path');
const { beautifyHTML } = require('../src/components/util');

const plainHtmlText = fs.readFileSync(path.join(__dirname, '..', 'crawled', 'bets-2024-09-23T10:24:36.248Z.html'), 'utf8');
const beautifiedHTML = beautifyHTML(plainHtmlText);
fs.writeFileSync(path.join(__dirname, '..', 'crawled', 'bets-2024-09-23T10:24:36.248Z.beautified.html'), beautifiedHTML);
