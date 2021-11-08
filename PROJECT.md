# xeokit

## Project setup
```
npm install
```
## Project development
```
npm start
```
### Compiles and minifies for production
```
npm run build
```

### Link npm package for local development
1. In gemini-viewer's directory, run `npm run build` to generate dist directory
2. In gemini-viewer's directory, run `npm link`
3. In your project, run `npm link @pattern-x/gemini-viewer`
4. In your code, import what you need:
```
import { BimViewer } from "@pattern-x/gemini-viewer"
import { KeyBoardRotatePlugin } from "@pattern-x/gemini-viewer"
```

### Start demo
```
npm run demo
```
and visit [demo](localhost:3000/index.html)

