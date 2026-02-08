# Frontend Guide

Betty includes a modern web interface built with Vue 3, Vite, and Tailwind CSS.

## Overview

The frontend provides:

- **Chat Interface** - Interactive chat with conversation history
- **Text Completions** - Direct prompt input for text generation
- **Document Management** - Upload and manage documents for RAG
- **Model Management** - Download and switch between models
- **Settings Panel** - Configure generation parameters
- **User Management** - Authentication and user profiles

## Accessing the Interface

Once Betty is running, open your browser to:

```
http://localhost:3000
```

## Chat View

The default view provides a ChatGPT-like interface.

### Features

**Send Messages**
- Type your message in the input box
- Press Enter or click Send
- Shift+Enter for new lines

**Conversation History**
- All messages are displayed in order
- Scroll to view older messages
- Markdown rendering for formatted responses

**Clear Chat**
- Click the trash icon to clear conversation
- Starts fresh context

**Settings**
- Click the gear icon to adjust parameters
- Changes apply to next message

### Chat Settings

- **Temperature** (0.0-2.0) - Controls creativity
- **Max Tokens** - Maximum response length
- **Top P** - Nucleus sampling threshold
- **Top K** - Top-k sampling limit
- **Repeat Penalty** - Reduces repetition

## Completions View

For direct text generation without chat format.

### How to Use

1. Click "Completions" in the sidebar
2. Enter your prompt
3. Adjust settings if needed
4. Click "Generate"

### Use Cases

- Text continuation
- Code generation
- Creative writing
- Bulk generation tasks

### Settings

Same as chat, plus:

- **Stop Sequences** - Strings that stop generation
- **Presence Penalty** - Encourages topic diversity
- **Frequency Penalty** - Reduces word repetition

## Documents View

Upload and manage documents for Retrieval-Augmented Generation (RAG).

::: warning Requirements
Documents require MongoDB to be configured and `ENABLE_RAG=true` in `.env`.
:::

### Uploading Documents

1. Click "Documents" in the sidebar
2. Click "Upload Document" or drag & drop
3. Select file(s) to upload
4. Wait for processing

**Supported Formats:**
- PDF (`.pdf`)
- Text files (`.txt`)
- Markdown (`.md`)
- Microsoft Word (`.docx`)
- HTML (`.html`)

### Document Processing

When uploaded, documents are:

1. **Extracted** - Text content extracted
2. **Chunked** - Split into manageable pieces
3. **Embedded** - Converted to vector embeddings
4. **Indexed** - Stored in MongoDB for retrieval

### Using Documents in Chat

1. Upload your documents
2. Go to Chat view
3. Enable "Use RAG" toggle
4. Ask questions about your documents

The system automatically:
- Finds relevant document chunks
- Includes them as context
- Cites sources in responses

### Managing Documents

**View Details**
- Click on a document card
- See metadata, chunks, embeddings

**Delete Documents**
- Click the trash icon on document card
- Confirm deletion

**Search Documents**
- Use the search bar to filter by name
- Filter by upload date or size

## Models View

Download and manage GGUF models from HuggingFace.

### Browsing Models

The interface shows:
- Available models from HuggingFace
- Installed models on your system
- Model details (size, quantization, parameters)

### Downloading Models

1. Click "Models" in the sidebar
2. Browse or search for a model
3. Click "Download"
4. Monitor download progress
5. Wait for completion

**Popular Models:**
- Llama 2 (7B, 13B, 70B)
- Mistral 7B
- CodeLlama
- TinyLlama (great for testing)

### Switching Models

1. Select a downloaded model
2. Click "Load Model"
3. Server restarts with new model
4. Wait for initialization

::: tip
Model switching restarts the llama.cpp server, which takes 30-60 seconds.
:::

### Model Information

Each model card shows:

- **Name** - Model identifier
- **Size** - File size on disk
- **Quantization** - Compression method (Q4_K_M, Q5_K_S, etc.)
- **Parameters** - Model size (7B, 13B, etc.)
- **Context Length** - Maximum context window
- **Status** - Downloaded, Active, Available

### Deleting Models

1. Click the trash icon on model card
2. Confirm deletion
3. Frees up disk space

## Settings Panel

Global application settings.

### Generation Settings

Configure default values for all requests:

- **Temperature**
- **Max Tokens**
- **Top P**
- **Top K**
- **Repeat Penalty**
- **Presence Penalty**
- **Frequency Penalty**

### System Settings

- **Theme** - Light/Dark mode
- **Auto-scroll** - Scroll to new messages
- **Show Timestamps** - Display message times
- **Enable Sound** - Notification sounds

### Advanced Settings

- **API Endpoint** - Change backend URL
- **Request Timeout** - Maximum wait time
- **Debug Mode** - Show detailed logs

### Saving Settings

Settings are saved to browser localStorage and persist across sessions.

## User Menu

Access user-specific features (when authentication is enabled).

### Login

1. Click "Login" in top-right
2. Enter username and password
3. Click "Sign In"

### User Profile

- View username and role
- Change password
- Manage API keys

### Logout

Click your username → "Logout"

## Keyboard Shortcuts

- **Enter** - Send message (in chat)
- **Shift+Enter** - New line
- **Ctrl/Cmd+K** - Focus search
- **Ctrl/Cmd+/** - Toggle sidebar
- **Esc** - Close dialogs

## Mobile Support

The interface is fully responsive:

- Touch-friendly controls
- Mobile-optimized layouts
- Swipe gestures for navigation

## Development Mode

Run the frontend in development mode:

```bash
cd frontend
npm run dev
```

This enables:
- Hot module replacement
- Vue devtools
- Detailed error messages

Access at: `http://localhost:5173`

## Building for Production

```bash
npm run build-frontend
```

Outputs optimized static files to `frontend/dist`.

## Customization

### Theming

Edit [frontend/tailwind.config.js](../frontend/tailwind.config.js):

```js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#your-color',
        // Add custom colors
      }
    }
  }
}
```

### Logo and Branding

Replace files in `frontend/public/`:
- `logo.svg` - Application logo
- `favicon.ico` - Browser icon

### Components

All components are in `frontend/src/components/`:
- `ChatMessage.vue` - Message display
- `ChatInput.vue` - Input box
- `ModelCard.vue` - Model display
- `DocumentCard.vue` - Document display
- etc.

## Troubleshooting

### Frontend won't connect to backend

- Verify backend is running on port 3000
- Check browser console for errors
- Ensure CORS is enabled in `.env`

### Document upload fails

- Check MongoDB is running
- Verify `ENABLE_RAG=true`
- Check file size under `MAX_FILE_SIZE`

### Model download stuck

- Check internet connection
- Verify HuggingFace is accessible
- Check disk space

## Next Steps

- [API Reference](/api/) - REST API documentation
- [RAG Guide](/advanced/rag.html) - Deep dive into document retrieval
- [Model Management](/advanced/model-management.html) - Advanced model configuration
