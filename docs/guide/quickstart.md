# Quick Start

Get up and running with Betty in minutes.

## Prerequisites

- Betty installed and configured (see [Installation](/guide/installation.html))
- A GGUF model downloaded
- Server running (`npm run prod` or `npm start`)

## Using the Web Interface

The easiest way to start using Betty is through the web interface.

1. **Open your browser** to [http://localhost:3000](http://localhost:3000)

2. **Start chatting** - The chat interface is ready to use immediately

3. **Try text completions** - Click "Completions" in the sidebar for direct prompt input

4. **Adjust settings** - Click the settings icon to configure temperature, tokens, etc.

That's it! No API keys or authentication required for basic usage.

## Using the REST API

### 1. Health Check

Verify the server is running:

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "llamaServer": {
    "isRunning": true,
    "baseUrl": "http://localhost:8080",
    "pid": 12345
  },
  "uptime": 123.456
}
```

### 2. Text Completion

Generate text from a prompt:

```bash
curl -X POST http://localhost:3000/v1/completions \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "The capital of France is",
    "max_tokens": 50,
    "temperature": 0.7
  }'
```

Response:
```json
{
  "id": "cmpl-1234567890",
  "object": "text_completion",
  "created": 1234567890,
  "model": "llama",
  "choices": [
    {
      "text": " Paris, which is located in the northern part of the country.",
      "index": 0,
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 6,
    "completion_tokens": 15,
    "total_tokens": 21
  }
}
```

### 3. Chat Completion

Have a conversation:

```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "What is the capital of France?"}
    ],
    "max_tokens": 100,
    "temperature": 0.8
  }'
```

Response:
```json
{
  "id": "chatcmpl-1234567890",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "llama",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "The capital of France is Paris. It's a beautiful city known for its art, culture, and iconic landmarks like the Eiffel Tower."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 25,
    "completion_tokens": 32,
    "total_tokens": 57
  }
}
```

### 4. Generate Embeddings

Create vector embeddings for semantic search:

```bash
curl -X POST http://localhost:3000/v1/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "input": "The quick brown fox jumps over the lazy dog"
  }'
```

Response:
```json
{
  "object": "list",
  "data": [
    {
      "object": "embedding",
      "embedding": [0.123, -0.456, 0.789, ...],
      "index": 0
    }
  ],
  "model": "llama",
  "usage": {
    "prompt_tokens": 9,
    "total_tokens": 9
  }
}
```

## Using OpenAI Client Libraries

Betty is compatible with OpenAI's official client libraries.

### Python Example

```python
from openai import OpenAI

# Point to your local Betty server
client = OpenAI(
    base_url="http://localhost:3000/v1",
    api_key="not-needed"  # Required by client but not validated
)

# Chat completion
response = client.chat.completions.create(
    model="llama",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Explain quantum computing in simple terms."}
    ],
    max_tokens=200,
    temperature=0.7
)

print(response.choices[0].message.content)

# Text completion
response = client.completions.create(
    model="llama",
    prompt="Write a haiku about programming:",
    max_tokens=50
)

print(response.choices[0].text)

# Embeddings
response = client.embeddings.create(
    model="llama",
    input="Hello, world!"
)

print(response.data[0].embedding)
```

### JavaScript/TypeScript Example

```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'http://localhost:3000/v1',
  apiKey: 'not-needed'
});

// Chat completion
const chatCompletion = await openai.chat.completions.create({
  model: 'llama',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Explain quantum computing in simple terms.' }
  ],
  max_tokens: 200,
  temperature: 0.7
});

console.log(chatCompletion.choices[0].message.content);

// Text completion
const completion = await openai.completions.create({
  model: 'llama',
  prompt: 'Write a haiku about programming:',
  max_tokens: 50
});

console.log(completion.choices[0].text);

// Embeddings
const embedding = await openai.embeddings.create({
  model: 'llama',
  input: 'Hello, world!'
});

console.log(embedding.data[0].embedding);
```

### cURL Examples

```bash
# Multi-turn conversation
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Hi! My name is Alice."},
      {"role": "assistant", "content": "Hello Alice! Nice to meet you."},
      {"role": "user", "content": "What is my name?"}
    ]
  }'

# With stop sequences
curl -X POST http://localhost:3000/v1/completions \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "List three programming languages:\n1.",
    "max_tokens": 100,
    "stop": ["\n\n", "4."]
  }'

# Multiple embeddings
curl -X POST http://localhost:3000/v1/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "input": ["Hello world", "Goodbye world", "Another sentence"]
  }'
```

## Common Parameters

### Temperature (0.0 - 2.0)

Controls randomness in generation:
- `0.0` - Deterministic (same output each time)
- `0.7` - Balanced creativity (recommended)
- `1.5` - Very creative/random

### Top P (0.0 - 1.0)

Nucleus sampling - considers tokens with top P probability:
- `0.9` - Recommended default
- `1.0` - Consider all tokens
- Lower values = more focused outputs

### Max Tokens

Maximum tokens to generate:
- `50` - Short responses
- `200` - Paragraph
- `1000` - Long form content

### Repeat Penalty (1.0 - 2.0)

Penalizes repeated tokens:
- `1.0` - No penalty
- `1.1` - Slight penalty (recommended)
- `1.5` - Strong penalty (may affect quality)

## Next Steps

- [Frontend Guide](/guide/frontend.html) - Learn all web interface features
- [API Reference](/api/) - Complete API documentation
- [Advanced Features](/advanced/) - RAG, model management, authentication
- [Troubleshooting](/guide/troubleshooting.html) - Common issues and solutions
