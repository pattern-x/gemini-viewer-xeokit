var dts = require('dts-bundle');

dts.bundle({
    name: "gemini-viewer",
    main: "build/index.d.ts",
    baseDir: "build",
    // out: "dist/[name].d.ts"
});