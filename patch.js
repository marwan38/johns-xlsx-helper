const fs = require('fs');

const pathToFileToPatch =
  'node_modules/@blueprintjs/core/lib/esm/common/configureDom4.js';

const file = fs.readFileSync(pathToFileToPatch, 'utf-8');
const updated = file.replace('require("dom4");', ' ');

fs.writeFileSync(pathToFileToPatch, updated);
