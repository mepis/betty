---
home: true
title: Home
heroImage: /logo.svg
actions:
  - text: Get Started
    link: /guide/
    type: primary
  - text: API Reference
    link: /api/
    type: secondary
features:
  - title: OpenAI Compatible
    details: Drop-in replacement for OpenAI API with support for completions, chat, and embeddings endpoints.
  - title: RAG Support
    details: Built-in Retrieval-Augmented Generation with document management and vector embeddings.
  - title: Model Management
    details: Download, manage, and switch between multiple GGUF models with an intuitive interface.
  - title: GPU Acceleration
    details: Full CUDA support with multi-GPU configuration for maximum performance.
  - title: Web Interface
    details: Modern Vue.js frontend with chat interface, document management, and settings.
  - title: Authentication
    details: Secure user authentication and role-based access control for production deployments.
footer: MIT Licensed | Copyright © 2026
---

# Betty - llama.cpp REST API

A powerful Node.js REST API wrapper for llama.cpp that provides OpenAI-compatible endpoints with advanced features like RAG, model management, and a beautiful web interface.

## Key Features

- **OpenAI-Compatible API** - Use with existing OpenAI client libraries
- **Chat & Completions** - Full support for text generation and chat conversations
- **RAG System** - Document upload, chunking, embedding, and retrieval
- **Model Management** - Download and manage GGUF models from HuggingFace
- **GPU Support** - CUDA acceleration with multi-GPU configuration
- **Web Interface** - Modern Vue.js frontend with Tailwind CSS
- **Authentication** - User management and role-based access control
- **Production Ready** - Comprehensive error handling and logging

## Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/betty.git
cd betty

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Build llama.cpp
cd llama.cpp
cmake -B build -DGGML_CUDA=ON
cmake --build build --config Release -j $(nproc)
cd ..

# Start the server
npm run prod
```

Visit [http://localhost:3000](http://localhost:3000) to access the web interface.

## Documentation

- [Installation Guide](/guide/installation.html) - Detailed setup instructions
- [Configuration](/guide/configuration.html) - Environment variables and settings
- [API Reference](/api/) - Complete API documentation
- [Advanced Topics](/advanced/) - RAG, GPU config, deployment

## Community

- [GitHub Issues](https://github.com/yourusername/betty/issues)
- [Discussions](https://github.com/yourusername/betty/discussions)

## License

[MIT](https://github.com/yourusername/betty/blob/main/LICENSE)
