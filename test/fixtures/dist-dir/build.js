const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, 'npm');

if (fs.existsSync(distPath)) {
  fs.rmSync(distPath, { force: true, recursive: true });
}
fs.mkdirSync(distPath, { recursive: true });
fs.copyFileSync(require.resolve('./package.json'), path.join(distPath, 'package.json'));
fs.writeFileSync(path.join(distPath, 'main.js'), `module.exports = 'hello world';`);
