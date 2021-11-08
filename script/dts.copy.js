const cpFile = require('cp-file');

(async () => {
	await cpFile('build/gemini-viewer.d.ts', 'dist/gemini-viewer.d.ts');
})();