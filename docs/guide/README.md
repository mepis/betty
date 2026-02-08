# Introduction

Betty is a Node.js REST API wrapper for llama.cpp that provides OpenAI-compatible endpoints with advanced features for production use.

## What is Betty?

Betty bridges the gap between llama.cpp and modern applications by providing:

- **RESTful API** - HTTP endpoints compatible with OpenAI's API specification
- **Process Management** - Automatic llama.cpp server lifecycle management
- **Advanced Features** - RAG, model management, authentication, and more
- **Web Interface** - Modern Vue.js frontend for easy interaction

## Why Betty?

While llama.cpp provides excellent local LLM inference, integrating it into applications can be challenging. Betty solves this by:

1. **Standardizing the Interface** - Use existing OpenAI client libraries
2. **Adding Production Features** - Authentication, error handling, logging
3. **Simplifying Model Management** - Download and switch models easily
4. **Enabling RAG** - Built-in document processing and vector search
5. **Providing a UI** - No need to build your own interface

## Architecture

```
┌─────────────────┐
│   Web Browser   │
│  (Vue.js App)   │
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────────┐
│   Express Server    │
│   (Port 3000)       │
├─────────────────────┤
│ • API Routes        │
│ • Authentication    │
│ • RAG System        │
│ • Model Manager     │
│ • MongoDB           │
└────────┬────────────┘
         │ HTTP Proxy
         ▼
┌─────────────────────┐
│  llama.cpp Server   │
│  (Port 8080)        │
│  [Child Process]    │
└─────────────────────┘
```

## Core Components

### Backend (Node.js/Express)

- **API Server** - Handles HTTP requests and proxies to llama.cpp
- **Authentication** - User management with bcrypt password hashing
- **Document Service** - PDF upload and processing
- **Vector Service** - Text chunking and embeddings
- **RAG Service** - Semantic search and context retrieval
- **Model Management** - Download and manage GGUF models
- **MongoDB Integration** - Store users, documents, and embeddings

### llama.cpp Server

- **Inference Engine** - Runs GGUF models for text generation
- **GPU Acceleration** - CUDA support for NVIDIA GPUs
- **Multi-GPU** - Distribute model across multiple GPUs

### Frontend (Vue.js)

- **Chat Interface** - Conversational UI with message history
- **Text Completions** - Direct prompt interface
- **Document Manager** - Upload and manage documents for RAG
- **Model Manager** - Download and switch between models
- **Settings Panel** - Configure API parameters
- **User Menu** - Login, logout, and profile

## Use Cases

Betty is ideal for:

- **Local AI Applications** - Run LLMs on your own hardware
- **RAG Systems** - Build question-answering over your documents
- **Prototyping** - Quickly test LLM-powered features
- **Privacy-Focused Apps** - Keep data on-premise
- **Development** - Test against a local OpenAI-compatible API
- **Research** - Experiment with different models and parameters

## What's Next?

- [Installation](/guide/installation.html) - Set up Betty on your system
- [Configuration](/guide/configuration.html) - Configure environment variables
- [Quick Start](/guide/quickstart.html) - Get up and running quickly
- [Frontend Guide](/guide/frontend.html) - Learn to use the web interface
