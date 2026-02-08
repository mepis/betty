# Completions API

Generate text completions from a prompt.

## Endpoint

```
POST /v1/completions
```

## Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prompt` | string or array | Yes | The prompt(s) to generate from |
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
| `echo` | boolean | No | Include prompt in response (default: false) |
| `logprobs` | integer | No | Number of log probabilities to return |

## Response

```json
{
  "id": "cmpl-1234567890",
  "object": "text_completion",
  "created": 1234567890,
  "model": "llama",
  "choices": [
    {
      "text": " Paris, which is located in northern France.",
      "index": 0,
      "logprobs": null,
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 6,
    "completion_tokens": 11,
    "total_tokens": 17
  }
}
```

## Examples

### Basic Completion

```bash
curl -X POST http://localhost:3000/v1/completions \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "The capital of France is",
    "max_tokens": 50
  }'
```

### With Temperature Control

```bash
curl -X POST http://localhost:3000/v1/completions \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Write a creative story about a robot:",
    "max_tokens": 200,
    "temperature": 1.2,
    "top_p": 0.95
  }'
```

### With Stop Sequences

```bash
curl -X POST http://localhost:3000/v1/completions \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "List three programming languages:\n1.",
    "max_tokens": 100,
    "stop": ["\n\n", "4."]
  }'
```

### Multiple Prompts

```bash
curl -X POST http://localhost:3000/v1/completions \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": [
      "The sky is",
      "The ocean is",
      "Mountains are"
    ],
    "max_tokens": 20
  }'
```

### Streaming Response

```bash
curl -X POST http://localhost:3000/v1/completions \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Write a poem about coding:",
    "max_tokens": 100,
    "stream": true
  }'
```

Response (Server-Sent Events):
```
data: {"id":"cmpl-123","object":"text_completion.chunk","created":1234567890,"choices":[{"text":"In","index":0}]}

data: {"id":"cmpl-123","object":"text_completion.chunk","created":1234567890,"choices":[{"text":" lines","index":0}]}

data: {"id":"cmpl-123","object":"text_completion.chunk","created":1234567890,"choices":[{"text":" of","index":0}]}

data: [DONE]
```

### Python Example

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:3000/v1",
    api_key="not-needed"
)

response = client.completions.create(
    model="llama",
    prompt="Explain quantum computing in simple terms:",
    max_tokens=200,
    temperature=0.7,
    stop=["\n\n"]
)

print(response.choices[0].text)
```

### JavaScript Example

```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'http://localhost:3000/v1',
  apiKey: 'not-needed'
});

const completion = await openai.completions.create({
  model: 'llama',
  prompt: 'Explain quantum computing in simple terms:',
  max_tokens: 200,
  temperature: 0.7,
  stop: ['\n\n']
});

console.log(completion.choices[0].text);
```

## Field Details

### prompt

Can be a single string or array of strings:

```json
// Single prompt
{"prompt": "Hello world"}

// Multiple prompts (processed separately)
{"prompt": ["Hello", "Goodbye", "Thanks"]}
```

### temperature

Controls randomness:
- `0.0` - Deterministic, always picks most likely token
- `0.7` - Balanced (recommended for most tasks)
- `1.0` - OpenAI's default
- `1.5+` - Very creative/random

### top_p (Nucleus Sampling)

Alternative to temperature. Keeps tokens with cumulative probability of top_p:
- `0.9` - Recommended default
- `1.0` - Consider all tokens (equivalent to temperature only)
- Lower values = more focused output

### stop

Sequences that stop generation:

```json
{
  "stop": "\n\n"           // Single stop sequence
}

{
  "stop": ["\n\n", "END"]  // Multiple stop sequences
}
```

### stream

Enable Server-Sent Events streaming:

```json
{
  "stream": true
}
```

Useful for real-time UIs. Tokens are sent as they're generated.

## finish_reason

Indicates why generation stopped:

- `stop` - Natural completion or stop sequence hit
- `length` - Reached max_tokens limit
- `eos` - End-of-sequence token generated

## Error Responses

### Invalid Parameter

```json
{
  "error": {
    "message": "temperature must be between 0 and 2",
    "type": "invalid_request_error",
    "param": "temperature",
    "code": "invalid_parameter"
  }
}
```

### Service Unavailable

```json
{
  "error": {
    "message": "llama.cpp server is not running",
    "type": "server_error",
    "code": "service_unavailable"
  }
}
```

## Next Steps

- [Chat Completions](/api/chat.html) - Conversational format
- [Embeddings](/api/embeddings.html) - Vector embeddings
- [Quick Start](/guide/quickstart.html) - More examples
