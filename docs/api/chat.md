# Chat Completions API

Generate conversational responses using a message-based format.

## Endpoint

```
POST /v1/chat/completions
```

## Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `messages` | array | Yes | Array of message objects |
| `model` | string | No | Model identifier (always "llama") |
| `max_tokens` | integer | No | Maximum tokens to generate (default: 512) |
| `temperature` | float | No | Sampling temperature 0-2 (default: 0.8) |
| `top_p` | float | No | Nucleus sampling 0-1 (default: 0.9) |
| `top_k` | integer | No | Top-k sampling (default: 40) |
| `repeat_penalty` | float | No | Penalize repetition 1-2 (default: 1.1) |
| `presence_penalty` | float | No | Presence penalty -2 to 2 (default: 0) |
| `frequency_penalty` | float | No | Frequency penalty -2 to 2 (default: 0) |
| `stop` | string or array | No | Stop sequences |
| `n` | integer | No | Number of completions (default: 1) |
| `stream` | boolean | No | Stream responses (default: false) |

### Message Object

```json
{
  "role": "system" | "user" | "assistant",
  "content": "Message text"
}
```

## Response

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
        "content": "Paris is the capital of France."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 20,
    "completion_tokens": 10,
    "total_tokens": 30
  }
}
```

## Examples

### Simple Chat

```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "What is the capital of France?"}
    ]
  }'
```

### With System Message

```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "system", "content": "You are a helpful assistant that speaks like a pirate."},
      {"role": "user", "content": "Tell me about the ocean."}
    ],
    "max_tokens": 150
  }'
```

### Multi-Turn Conversation

```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "My name is Alice."},
      {"role": "assistant", "content": "Hello Alice! Nice to meet you."},
      {"role": "user", "content": "What is my name?"}
    ]
  }'
```

### Streaming Response

```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Write a short poem about code."}
    ],
    "stream": true
  }'
```

Response (Server-Sent Events):
```
data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1234567890,"model":"llama","choices":[{"index":0,"delta":{"role":"assistant","content":""},"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1234567890,"model":"llama","choices":[{"index":0,"delta":{"content":"In"},"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1234567890,"model":"llama","choices":[{"index":0,"delta":{"content":" lines"},"finish_reason":null}]}

data: [DONE]
```

### Python Example

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:3000/v1",
    api_key="not-needed"
)

response = client.chat.completions.create(
    model="llama",
    messages=[
        {"role": "system", "content": "You are a helpful coding assistant."},
        {"role": "user", "content": "How do I reverse a string in Python?"}
    ],
    max_tokens=200,
    temperature=0.7
)

print(response.choices[0].message.content)
```

### JavaScript Example

```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'http://localhost:3000/v1',
  apiKey: 'not-needed'
});

const chatCompletion = await openai.chat.completions.create({
  model: 'llama',
  messages: [
    { role: 'system', content: 'You are a helpful coding assistant.' },
    { role: 'user', content: 'How do I reverse a string in Python?' }
  ],
  max_tokens: 200,
  temperature: 0.7
});

console.log(chatCompletion.choices[0].message.content);
```

### Streaming in Python

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:3000/v1",
    api_key="not-needed"
)

stream = client.chat.completions.create(
    model="llama",
    messages=[{"role": "user", "content": "Tell me a story"}],
    stream=True
)

for chunk in stream:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="")
```

## Message Roles

### system

Sets the behavior and personality of the assistant:

```json
{
  "role": "system",
  "content": "You are a helpful assistant that explains things simply."
}
```

Best practices:
- Use at the start of the conversation
- Be clear and specific about desired behavior
- One system message is usually enough

### user

The user's input or question:

```json
{
  "role": "user",
  "content": "What is machine learning?"
}
```

### assistant

Previous responses from the model (for multi-turn conversations):

```json
{
  "role": "assistant",
  "content": "Machine learning is a type of artificial intelligence..."
}
```

## Conversation Context

The model considers all messages when generating a response. For example:

```json
{
  "messages": [
    {"role": "system", "content": "You remember everything the user tells you."},
    {"role": "user", "content": "My favorite color is blue."},
    {"role": "assistant", "content": "Got it! Blue is your favorite color."},
    {"role": "user", "content": "What's my favorite color?"}
  ]
}
```

The assistant will respond: "Your favorite color is blue."

### Managing Context Length

Long conversations may exceed the context window. Strategies:

1. **Truncate old messages**:
   ```python
   # Keep only last 10 messages
   messages = conversation[-10:]
   ```

2. **Summarize history**:
   ```python
   summary = summarize_conversation(old_messages)
   messages = [
       {"role": "system", "content": f"Previous context: {summary}"},
       ...recent_messages
   ]
   ```

3. **Use sliding window**:
   ```python
   # Keep system message + recent messages
   messages = [system_message] + conversation[-8:]
   ```

## Parameters

### temperature

Controls creativity and randomness:

- `0.0-0.3` - Focused, factual, deterministic
- `0.7-0.9` - Balanced (recommended)
- `1.0-1.5` - Creative, diverse
- `1.5-2.0` - Very random (may be incoherent)

### top_p

Nucleus sampling - alternative to temperature:

- `0.9` - Recommended for most uses
- `0.95` - More diverse
- `1.0` - No filtering

Can be used with temperature or instead of it.

### stop

Custom stop sequences:

```json
{
  "stop": ["User:", "Assistant:"]
}
```

Useful for structured formats or preventing the model from continuing too long.

## Best Practices

### 1. Clear System Messages

Good:
```json
{"role": "system", "content": "You are a Python expert. Provide code examples with explanations."}
```

Avoid:
```json
{"role": "system", "content": "Be helpful."}
```

### 2. Provide Context

Good:
```json
{
  "messages": [
    {"role": "system", "content": "You are a JavaScript tutor for beginners."},
    {"role": "user", "content": "I'm new to programming. How do I create a function?"}
  ]
}
```

### 3. Format Multi-Turn Conversations

```json
{
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "What's 2+2?"},
    {"role": "assistant", "content": "2+2 equals 4."},
    {"role": "user", "content": "And times 3?"}
  ]
}
```

### 4. Use Appropriate Temperature

- **Factual Q&A**: 0.3-0.5
- **General chat**: 0.7-0.9
- **Creative writing**: 1.0-1.3
- **Code generation**: 0.2-0.5

## Error Responses

### Invalid Message Format

```json
{
  "error": {
    "message": "messages must be an array of objects with 'role' and 'content'",
    "type": "invalid_request_error",
    "param": "messages",
    "code": "invalid_parameter"
  }
}
```

### Context Length Exceeded

```json
{
  "error": {
    "message": "Total tokens (8500) exceeds context length (4096)",
    "type": "invalid_request_error",
    "param": "messages",
    "code": "context_length_exceeded"
  }
}
```

## Next Steps

- [Completions API](/api/completions.html) - Simple text generation
- [Embeddings API](/api/embeddings.html) - Vector embeddings
- [Quick Start Guide](/guide/quickstart.html) - More examples
