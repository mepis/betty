# Google Drive Memory Error Fixes

## Summary of Changes

### 1. Fixed Infinite Loop in `getFolderPath` Method
**Issue**: The while loop condition didn't properly check for `null` or `undefined` values, causing infinite recursion.

**Fix**: Added type check in the while loop:
```javascript
while (currentId && currentId !== 'root' && typeof currentId === 'string')
```

### 2. Increased Node.js Memory Limit
**Issue**: JavaScript heap out of memory errors due to insufficient memory allocation.

**Fix**: Updated package.json scripts to include `--max-old-space-size=4096`:
```javascript
"start": "node --max-old-space-size=4096 src/index.js",
"dev": "nodemon --exec \"node --max-old-space-size=4096\" src/index.js",
"prod": "vuepress build docs && cd frontend && npm install && npm run build && cd .. && node --max-old-space-size=4096 src/index.js"
```

### 3. Implemented Lazy Loading for googleapis Library
**Issue**: Potential memory issues during early initialization of the googleapis library.

**Fix**: Added lazy loading pattern:
```javascript
let googleLib = null;

function getGoogleLib() {
  if (!googleLib) {
    googleLib = require('googleapis');
  }
  return googleLib;
}
```

### 4. Fixed Circular Dependency Issue
**Issue**: `ReferenceError: mongoService is not defined` when saving credentials.

**Fix**: Added proper import statement at the top of googleDriveService.js:
```javascript
const mongoService = require('./mongoService');
```

## Files Modified

1. `/root/git/betty/src/services/googleDriveService.js`
   - Fixed infinite loop in `getFolderPath` method
   - Added lazy loading for googleapis library
   - Added mongoService import

2. `/root/git/betty/package.json`
   - Updated start, dev, and prod scripts with memory limits

## Testing the Fix

The server should now:
1. Handle Google Drive OAuth flow without memory errors
2. Properly load the googleapis library when needed
3. Correctly walk folder hierarchies without infinite loops
4. Have sufficient memory allocation for normal operations

Note: If you encounter CUDA GPU memory errors, those are related to the llama.cpp model loading and are separate from the JavaScript memory issues fixed here.
