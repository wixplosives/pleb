const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, 'npm');

fs.rmdirSync(distPath, { recursive: true });
fs.mkdirSync(distPath, { recursive: true });
fs.copyFileSync(require.resolve('./package.json'), path.join(distPath, 'package.json'));
fs.writeFileSync(path.join(distPath, 'main.js'), `export default 'hello world';`);
