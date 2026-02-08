# Google Drive Configuration Import Fix

## Problem
The application was crashing with this error:
```
Error: Cannot find module './config'
Require stack:
- /root/git/betty/src/services/googleDriveService.js
- /root/git/betty/src/routes/googleDrive.js
- /root/git/betty/src/index.js
```

## Root Cause
In `src/services/googleDriveService.js` line 11, the config module was being imported with an incorrect relative path:
```javascript
const config = require('./config');
```

This path is relative to `src/services/googleDriveService.js`, which would look for the config file at `src/services/config` (incorrect location). The config file is actually located at `src/config.js`.

## Solution
Fixed the import statement in `src/services/googleDriveService.js:11` to use the correct relative path:
```javascript
const config = require('../config');
```

This path correctly resolves to `src/config.js` from the `src/services/` directory.

## Verification
All other service files in `src/services/` were already using the correct path (`../config`). After this fix, all services can successfully import the config module:

- ✅ authService.js
- ✅ vectorService.js  
- ✅ embeddingServerService.js
- ✅ llamaService.js
- ✅ documentService.js
- ✅ mongoService.js
- ✅ chunkingService.js
- ✅ ragService.js
- ✅ modelCatalogService.js
- ✅ googleDriveService.js (fixed)

## Files Changed
- `src/services/googleDriveService.js` (line 11)
