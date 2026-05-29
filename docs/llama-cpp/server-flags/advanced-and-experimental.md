# Advanced & Experimental

Speculative decoding, chat templates, JSON mode, API key, and advanced configuration.

**Tags**: `server`, `cli`, `speculative`, `chat-template`, `json`, `api-key`, `advanced`

---

## Speculative Decoding

Speculative decoding uses a smaller "draft" model to propose tokens, which the main model then validates. This can significantly speed up generation.

### `--speculative` / `LLAMA_ARG_SPECULATIVE`
**Type**: `integer`  
**Default**: `0` (disabled)  
**Description**: Number of speculative tokens to draft per step.

```bash
llama-server --model model.gguf --speculative 4
```

### `--spec-draft` / `LLAMA_ARG_SPEC_DRAFT`
**Type**: `string`  
**Description**: Path to the draft model for speculative decoding.

```bash
llama-server --model large-model.gguf --spec-draft small-draft.gguf --speculative 4
```

### `--spec-probs` / `LLAMA_ARG_SPEC_PROBS`
**Type**: `boolean`  
**Default**: `false`  
**Description**: Return speculative token probabilities in the API response.

---

## Chat Templates

### `--chat-template` / `LLAMA_ARG_CHAT_TEMPLATE`
**Type**: `string`  
**Description**: Custom chat template (Jinja2 format). Overrides the model's built-in template.

```bash
llama-server --model model.gguf --chat-template "chatml.jinja2"
```

### `--chat-template-file` / `LLAMA_ARG_CHAT_TEMPLATE_FILE`
**Type**: `string`  
**Description**: Path to a file containing the chat template.

```bash
llama-server --model model.gguf --chat-template-file /path/to/template.jinja2
```

### `--verbose-chat` / `LLAMA_ARG_VERBOSE_CHAT`
**Type**: `boolean`  
**Default**: `false`  
**Description**: Print chat template processing details.

---

## JSON Mode

### `--json-schema` / `LLAMA_ARG_JSON_SCHEMA`
**Type**: `string`  
**Description**: JSON schema to constrain generation. Output will be valid JSON matching the schema.

```bash
llama-server --model model.gguf \
  --json-schema '{"type":"object","properties":{"name":{"type":"string"},"age":{"type":"integer"}}}'
```

### `--grammar` / `LLAMA_ARG_GRAMMAR`
**Type**: `string`  
**Description**: GBNF grammar to constrain generation.

```bash
llama-server --model model.gguf --grammar 'root ::= "{" "name" ":" "\"" [a-z]+ "\"" "}"'
```

---

## API Security

### `--api-key` / `LLAMA_ARG_API_KEY`
**Type**: `string`  
**Description**: API key for authentication. Clients must include this key in the `Authorization` header.

```bash
llama-server --model model.gguf --api-key my-secret-key
```

### `--api-key-file` / `LLAMA_ARG_API_KEY_FILE`
**Type**: `string`  
**Description**: Path to a file containing the API key.

```bash
llama-server --model model.gguf --api-key-file /path/to/api-key.txt
```

### `--simple-io` / `LLAMA_ARG_SIMPLE_IO`
**Type**: `boolean`  
**Default**: `false`  
**Description**: Use simplified I/O mode. Reduces API complexity for basic use cases.

---

## Advanced Model Options

### `--jinja` / `LLAMA_ARG_JINJA`
**Type**: `boolean`  
**Default**: `false`  
**Description**: Enable Jinja2 template processing for chat templates.

### `--cache-type-k` / `LLAMA_ARG_CACHE_TYPE_K`
**Type**: `string`  
**Default**: `f16`  
**Description**: KV cache type for keys.

### `--cache-type-v` / `LLAMA_ARG_CACHE_TYPE_V`
**Type**: `string`  
**Default**: `f16`  
**Description**: KV cache type for values.

### `--model-params-cache` / `LLAMA_ARG_MODEL_PARAMS_CACHE`
**Type**: `boolean`  
**Default**: `false`  
**Description**: Cache model parameters for faster reload.

---

## Advanced Sampling

### `--penalize-nl` / `LLAMA_ARG_PENALIZE_NL`
**Type**: `boolean`  
**Default**: `true`  
**Description**: Penalize newline tokens in repetition check.

```bash
# Don't penalize newlines
llama-server --model model.gguf --no-penalize-nl
```

### `--dry-multiplier` / `LLAMA_ARG_DRY_MULTIPLIER`
**Type**: `float`  
**Default**: `0.0` (disabled)  
**Description**: DRY (Don't Repeat Yourself) penalty strength.

### `--dry-base` / `LLAMA_ARG_DRY_BASE`
**Type**: `float`  
**Default**: `1.75`  
**Description**: DRY penalty base value.

### `--dry-allowed-length` / `LLAMA_ARG_DRY_ALLOWED_LENGTH`
**Type**: `integer`  
**Default**: `2`  
**Description**: DRY allowed length before penalty applies.

### `--dry-penalty-last-n` / `LLAMA_ARG_DRY_PENALTY_LAST_N`
**Type**: `integer`  
**Default**: `-1` (all context)  
**Description**: Number of recent tokens for DRY penalty.

### `--dry-sequences` / `LLAMA_ARG_DRY_SEQUENCE`
**Type**: `string` (repeatable)  
**Description**: Sequences to penalize with DRY.

---

## See Also

- [[llama-cpp/server-flags/sampling-params\|Sampling Parameters]] — Temperature, top_k, top_p
- [[llama-cpp/server-flags/context-and-attention\|Context & Attention]] — Context and attention settings
- [[llama-cpp/server-flags/flags-reference\|Flags Reference]] — Complete flag table
