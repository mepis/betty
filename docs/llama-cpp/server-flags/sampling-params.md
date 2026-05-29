# Sampling Parameters

Temperature, top_k, top_p, grammar constraints, penalties, and repetition control.

**Tags**: `server`, `cli`, `sampling`, `temperature`, `top-k`, `top-p`, `grammar`, `penalties`

---

## Temperature & Distribution

### `--temp` / `LLAMA_ARG_TEMP`
**Type**: `float`  
**Default**: `0.8`  
**Range**: `0.0` to `2.0` (typical)  
**Description**: Sampling temperature. Lower = more deterministic, higher = more creative.

| Value | Behavior |
|-------|----------|
| `0.0` | Greedy decoding (most likely token always) |
| `0.1–0.3` | Very focused, near-deterministic |
| `0.5–0.8` | Balanced (default range) |
| `1.0+` | More creative, risk of incoherence |

```bash
llama-server --model model.gguf --temp 0.7
```

### `--top-k` / `LLAMA_ARG_TOP_K`
**Type**: `integer`  
**Default**: `40`  
**Description**: Top-K sampling. Only consider the K most likely tokens.

```bash
llama-server --model model.gguf --top-k 50
```

### `--top-p` / `LLAMA_ARG_TOP_P`
**Type**: `float`  
**Default**: `0.9`  
**Range**: `0.0` to `1.0`  
**Description**: Nucleus (top-p) sampling. Consider tokens until cumulative probability reaches P.

```bash
llama-server --model model.gguf --top-p 0.95
```

### `--min-p` / `LLAMA_ARG_MIN_P`
**Type**: `float`  
**Default**: `0.05`  
**Range**: `0.0` to `1.0`  
**Description**: Min-p sampling. Only consider tokens with probability >= min_p * max_probability.

```bash
llama-server --model model.gguf --min-p 0.1
```

### `--typ-p` / `LLAMA_ARG_TYP_P`
**Type**: `float`  
**Default**: `1.0` (disabled)  
**Range**: `0.0` to `1.0`  
**Description**: Tail-free sampling. Reduces impact of unlikely tokens.

```bash
llama-server --model model.gguf --typ-p 0.95
```

### `--dynatemp-range` / `LLAMA_ARG_DYNATEMP_RANGE`
**Type**: `float`  
**Default**: `0.0` (disabled)  
**Description**: Dynamic temperature range. Temperature varies based on token entropy.

### `--dynatemp-exponent` / `LLAMA_ARG_DYNATEMP_EXP`
**Type**: `float`  
**Default**: `1.0`  
**Description**: Dynamic temperature exponent. Controls how entropy affects temperature.

---

## Repetition Penalties

### `--repeat-last-n` / `LLAMA_ARG_REPEAT_LAST_N`
**Type**: `integer`  
**Default**: `64`  
**Description**: Number of recent tokens to check for repetition. `0` = disabled.

```bash
llama-server --model model.gguf --repeat-last-n 128
```

### `--repeat-penalty` / `LLAMA_ARG_REPEAT_PENALTY`
**Type**: `float`  
**Default**: `1.1`  
**Description**: Repetition penalty multiplier. `1.0` = no penalty, higher = stronger penalty.

```bash
llama-server --model model.gguf --repeat-penalty 1.2
```

### `--presence-penalty` / `LLAMA_ARG_PRESENCE_PENALTY`
**Type**: `float`  
**Default**: `0.0`  
**Description**: Presence penalty (OpenAI-style). Penalizes tokens that appear in the context.

```bash
llama-server --model model.gguf --presence-penalty 0.5
```

### `--frequency-penalty` / `LLAMA_ARG_FREQUENCY_PENALTY`
**Type**: `float`  
**Default**: `0.0`  
**Description**: Frequency penalty (OpenAI-style). Penalizes tokens proportional to their frequency.

```bash
llama-server --model model.gguf --frequency-penalty 0.3
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
**Description**: Sequences to penalize with DRY (e.g., "\\n\\n", "\\n").

---

## Grammar Constraints

### `--grammar` / `LLAMA_ARG_GRAMMAR`
**Type**: `string`  
**Description**: GBNF grammar to constrain generation. Forces output to match the grammar.

```bash
llama-server --model model.gguf --grammar 'root ::= "hello" | "world"'
```

### `--json-schema` / `LLAMA_ARG_JSON_SCHEMA`
**Type**: `string`  
**Description**: JSON schema to constrain generation. Output will be valid JSON matching the schema.

```bash
llama-server --model model.gguf --json-schema '{"type":"object","properties":{"name":{"type":"string"}}}'
```

---

## Misc Sampling

### `--mirostat` / `LLAMA_ARG_MIROSTAT`
**Type**: `integer`  
**Default**: `0` (disabled)  
**Options**: `0` (off), `1` (Mirostat), `2` (Mirostat 2.0)  
**Description**: Mirostat sampling for perplexity-controlled generation.

### `--mirostat-learn` / `LLAMA_ARG_MIROSTAT_LEARN`
**Type**: `float`  
**Default**: `0.1`  
**Description**: Mirostat learning rate.

### `--mirostat-tau` / `LLAMA_ARG_MIROSTAT_TAU`
**Type**: `float`  
**Default**: `5.0`  
**Description**: Mirostat target perplexity.

### `-- penalize-nl` / `LLAMA_ARG_PENALIZE_NL`
**Type**: `boolean`  
**Default**: `true`  
**Description**: Penalize newline tokens in repetition check.

```bash
# Don't penalize newlines
llama-server --model model.gguf --no-penalize-nl
```

### `--seed` / `LLAMA_ARG_SEED`
**Type**: `integer`  
**Default**: random  
**Description**: Random seed for reproducible generation.

```bash
llama-server --model model.gguf --seed 42
```

---

## See Also

- [[llama-cpp/server-flags/context-and-attention\|Context & Attention]] — Context and attention settings
- [[llama-cpp/server-flags/advanced-and-experimental\|Advanced & Experimental]] — Grammar and chat templates
- [[llama-cpp/server-flags/flags-reference\|Flags Reference]] — Complete flag table
