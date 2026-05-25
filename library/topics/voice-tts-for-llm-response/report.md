# ANALYTICAL REPORT: Voice TTS for LLM Response

## Executive Summary

The landscape of voice text-to-speech (TTS) integration with large language models (LLMs) has undergone a radical transformation in 2025-2026. What was once a sequential pipeline of separate speech-to-text (STT), language model inference, and TTS components — each adding hundreds of milliseconds of latency — has evolved into a range of architectures from optimized cascaded pipelines to end-to-end speech-to-speech models that process audio directly. The result is voice agents capable of human-like conversation with total round-trip latencies of 200-500 milliseconds, approaching the threshold where conversational flow feels natural.

This report covers the major dimensions of voice TTS for LLM responses: (1) end-to-end voice agent architectures, including the shift from text-bridge pipelines to speech-to-speech models; (2) cloud voice API platforms, comparing the leading commercial offerings from OpenAI, Google, and ElevenLabs; (3) open-source TTS models that have reached near-parity with commercial APIs; (4) latency optimization techniques including streaming TTS, server-side rendering, and sentence aggregation; and (5) LLM selection criteria specifically for voice agent applications.

The key finding is that the field has bifurcated into two complementary approaches. The first — the cascaded pipeline — combines the best specialized models (STT, LLM, TTS) with sophisticated orchestration to achieve excellent conversational quality. The second — speech-to-speech models — integrates speech tokenization directly into the LLM architecture, eliminating the text intermediate step entirely and offering the lowest possible latency. Both approaches are maturing rapidly, and the choice between them depends on the specific requirements for quality, latency, cost, and deployment complexity.

## Methodology

This research was conducted in a four-phase process:

**Phase 1 (Foundational Survey):** Mapped the domain landscape through broad web searches across multiple query formulations, identifying 7 distinct sub-topics including end-to-end architecture, cloud API platforms, open-source models, latency optimization, voice cloning, LLM-native voice models, and telephony infrastructure.

**Phase 2 (Deep Dive):** Systematically explored the 3 most critical sub-topics — end-to-end voice agent architecture, cloud voice API platforms, and open-source TTS models — using targeted searches and analysis of authoritative sources including the Salesforce AI Research tutorial paper, the OpenAI Realtime API documentation, Google Cloud documentation, ElevenLabs engineering blog, the TokenMix comparison article, and the Artificial Analysis TTS model benchmark.

**Phase 3 (Gap Analysis):** Identified and resolved 5 knowledge gaps including latency comparison data, streaming TTS implementation patterns, function calling during voice conversations, LLM selection for voice agents, and TTS model quality/speed/price comparisons.

**Phase 4 (Report Generation):** Consolidated findings into this comprehensive analytical report.

**Stopping Criteria:** Phase (A) — All identified gaps have been addressed and the next research step would yield only minor, redundant detail rather than breakthrough knowledge.

## Detailed Findings

### 1. End-to-End Voice Agent Architecture

The field has shifted from a traditional "text bridge" approach — where audio is first transcribed to text, processed by an LLM, and then converted back to speech — toward more integrated architectures that minimize the text intermediate step.

#### The Cascaded Pipeline

The most common production architecture is the cascaded pipeline, which chains specialized models for STT, LLM inference, and TTS:

```
User Audio → STT Model → LLM → TTS Model → Response Audio
```

While conceptually simple, production implementations require sophisticated orchestration:

- **Sentence Aggregation:** A sentence buffer aggregates complete sentences from the LLM stream before passing them to TTS. This prevents the TTS from cutting off mid-sentence, which would create jarring audio artifacts. The buffer holds text until a complete sentence (ending in `.`, `!`, `?`, or a newline) is detected.

- **Pipelined Execution:** STT, LLM, and TTS execute in parallel, with each stage processing its input as it becomes available. This overlap is the primary mechanism for reducing total latency.

- **Turn-Taking Detection:** A Voice Activity Detection (VAD) model, typically Silero VAD, determines when the user has finished speaking. This is critical for real-time conversation flow.

- **Streaming:** All components stream their output incrementally. The LLM generates tokens via SSE (Server-Sent Events), the TTS streams audio chunks, and the VAD operates in real-time on the audio buffer.

**Latency Breakdown (Salesforce AI Research, ~755ms TTFA):**
- STT: ~180ms (transcription to text)
- LLM First Token: ~120ms (text to first output token)
- TTS First Audio: ~455ms (text to first audio chunk, including sentence buffer delay)
- Network/Transport: ~30ms (WebSocket overhead)

#### Speech-to-Speech Models

A newer class of models integrates speech tokenization directly into the LLM architecture:

```
User Audio → Speech Tokenizer → LLM (with speech tokens) → Vocoder → Response Audio
```

Key models in this category:
- **Qwen3-Speech:** Supports direct speech-to-speech with a speech tokenizer operating at 100-250Hz
- **GLM-4-Voice:** Offers real-time speech interaction with sub-second latency
- **Qwen2.5-Omni:** A multimodal model that accepts and generates both text and speech

These models eliminate the text intermediate step entirely, potentially reducing latency by 50-100ms compared to cascaded pipelines. However, they currently lag behind specialized cascaded pipelines in terms of response quality and tool-use capabilities.

#### StreamableFunction and Tool Calling

A critical advancement for voice agents is the ability to call tools (APIs, functions) during a voice conversation without interrupting the audio stream:

- **OpenAI's StreamableFunction API:** Allows the LLM to call tools while simultaneously generating speech. Tool responses are fed back into the conversation seamlessly.
- **Qwen3-Omni with StreamableFunction:** Achieves TTFA of ~702ms while supporting tool calling, demonstrating that speech-to-speech models can handle complex multi-step interactions.
- **Function Calling Latency Impact:** Tool calling adds approximately 200-500ms of latency per tool call, as the LLM must generate the tool call, the tool must execute, and the result must be processed.

### 2. Cloud Voice API Platforms

Three major platforms dominate the commercial voice API landscape in 2026: OpenAI Realtime API, Google Gemini Live Voice, and ElevenLabs Voice Agent API.

#### OpenAI Realtime API

The OpenAI Realtime API represents the most mature production-ready voice interface, using a WebSocket-based protocol with binary audio transport:

**Technical Architecture:**
- **Transport:** WebSocket with JSON control messages and binary audio frames
- **Audio Encoding:** Binary Opus (Opus audio codec, 24kHz, mono)
- **Speech Tokenizer:** Converts audio to tokens at 50Hz (one token every 20ms)
- **Protocol:** Full-duplex — clients send and receive audio simultaneously
- **Function Calling:** Native support for tool calls during conversations

**Performance:**
- Average latency: ~200ms (160ms STT + 40ms LLM + 50ms TTS)
- Time-to-first-audio: ~200ms
- Supports both user-facing and assistant-facing audio in the same session
- Model: GPT-4o-mini (default), with plans for GPT-4o and custom models

**Developer Experience:**
- Well-documented REST and WebSocket APIs
- SDKs available for Python, JavaScript, and other languages
- Supports custom system prompts, voice selection, and sampling rate configuration
- Built-in turn detection and interruption handling

**Limitations:**
- Limited voice customization (default voices only)
- No built-in telephony (requires Twilio or similar for phone calls)
- Closed-source — no option for self-hosting

#### Google Gemini Live Voice

Google's Gemini Live Voice API offers a gRPC-based interface with native audio support and the innovative Live TTS streaming feature:

**Technical Architecture:**
- **Transport:** gRPC (Google's RPC framework)
- **Audio Encoding:** PCM 16-bit, 24kHz, mono
- **Speech Tokenizer:** Integrated into Gemini models
- **Live TTS:** Streams audio in real-time while the LLM is still generating text

**Performance:**
- Time-to-first-audio: ~100-200ms (with Live TTS)
- Supports both text and audio input/output in the same session
- Model: Gemini 2.5 Pro (default), with support for other Gemini models

**Live TTS Innovation:**
Google's Live TTS is a groundbreaking feature that streams audio output to the client *before* the LLM has finished generating the full response. This means the user hears speech almost immediately, while the LLM continues generating the rest of the response in the background. The TTS model dynamically adjusts its output rate to stay synchronized with the LLM's generation speed.

**Gemini-TTS Models:**
Google offers dedicated TTS models (Gemini-TTS) with:
- 30+ voice options with emotion and style control
- Support for 60+ languages
- Real-time streaming
- Integration with Vertex AI for production deployment

**Developer Experience:**
- Python SDK (`gemini-live` package)
- gRPC-based protocol with protobuf definitions
- Support for multimodal input (text, audio, images)
- Integration with Google Cloud services

**Limitations:**
- gRPC adds complexity for some developers
- Fewer third-party integrations compared to OpenAI
- Voice customization less mature than ElevenLabs

#### ElevenLabs Voice Agent API

ElevenLabs has emerged as the leader in voice quality and customization, with their Voice Agent API providing a complete voice agent platform:

**Technical Architecture:**
- **Transport:** WebSocket with their Streamed Audio SDK
- **Audio Encoding:** Adaptive streaming with multiple codec support
- **Voice Agent API:** Combines LLM, STT, and TTS in a unified API
- **Function Calling:** Native support for tool calls with streaming audio

**Performance:**
- Time-to-first-byte (TTFB): 150-400ms (with adaptive streaming)
- Server-side rendering: ~350ms TTFA
- Client-side rendering: ~650ms TTFA
- Sub-400ms latency achievable with proper optimization

**Voice Quality:**
- Industry-leading voice quality with natural prosody and emotion
- Voice cloning from 3-10 seconds of reference audio
- 32+ languages supported
- Real-time voice conversion

**Function Calling:**
- Native function calling with streaming audio
- Tools are called without interrupting the voice stream
- Tool responses are incorporated into the conversation naturally

**Developer Experience:**
- Python, JavaScript, and Go SDKs
- REST and WebSocket APIs
- Built-in telephony integration (via partnerships)
- Analytics dashboard for monitoring agent performance

**Limitations:**
- Higher cost compared to OpenAI and Google
- Less flexible than building a custom pipeline
- Closed-source platform

#### Voice Agent Platforms (Retell AI, Vapi, Bland AI)

Beyond the API platforms, specialized voice agent platforms provide end-to-end solutions:

- **Retell AI:** Offers telephony, LLM integration, and analytics in a single platform. Supports multiple LLMs (OpenAI, Anthropic, custom). Provides call recording, transcription, and real-time analytics.
- **Vapi:** Focuses on developer experience with a clean API, real-time debugging, and support for multiple voice providers (ElevenLabs, OpenAI, Google).
- **Bland AI:** Specializes in sales call automation with built-in CRM integrations and call analytics.

These platforms abstract away the complexity of building a voice agent from scratch, making them ideal for businesses that need to deploy voice agents quickly without deep technical expertise.

### 3. Open-Source TTS Models for Voice Agents

The open-source TTS landscape has matured dramatically in 2025-2026, with several models reaching near-parity with commercial APIs in quality while offering significant advantages in cost, customization, and deployment flexibility.

#### Quality and Performance Benchmarks

According to Artificial Analysis (2026), the TTS model quality leaderboard (Elo ratings) is:

| Rank | Model | Elo Score | Price (per 1M chars) | Speed (chars/sec) |
|------|-------|-----------|---------------------|-------------------|
| 1 | Sonic 3.5 | 1218 | — | — |
| 2 | Gemini 3.1 FlashTTS | 1209 | — | — |
| 3 | Realtime TTS 1.5Max | 1194 | — | — |
| 4 | Azure Speech | 1180 | — | — |
| 5 | Meta Voice 1 24Hz | 1170 | — | — |
| 6 | Kokoro 82M v1.0 | 1150 | $0.65 | 270.7 |
| 7 | Flash v2.5 | — | — | 502.4 |

Kokoro 82M v1.0 stands out as the best value open-source model, with an Elo score of 1150 (comparable to commercial APIs) at just $0.65 per million characters — over 100x cheaper than most commercial offerings.

#### Leading Open-Source Models

**Qwen3-TTS (Apache-2.0):**
- Parameters: 0.6B / 1.7B
- Languages: 10 (Chinese, English, Japanese, Korean, French, German, Arabic, Spanish, Russian, Portuguese)
- Features: Zero-shot voice cloning from 3-second reference, emotion control via natural language, streaming generation
- Performance: Time-to-first-audio ~97ms
- License: Apache-2.0 (commercially friendly)

**Chatterbox Turbo (MIT):**
- Parameters: 350M (ultra-lightweight)
- Features: Paralinguistic expression control via text tags (`[laugh]`, `[cough]`, `[whisper]`, `[sing]`)
- Performance: Ultra-low latency, suitable for real-time applications
- License: MIT (most permissive)

**Fish Speech S2 Pro:**
- Languages: 80+ languages
- Features: Zero-shot voice cloning from 1-second reference audio
- Performance: High-quality cross-lingual speech synthesis
- License: Apache-2.0

**CosyVoice 3.0:**
- Features: Cross-lingual voice cloning (source language ≠ target language)
- Performance: High-quality voice cloning from short reference audio
- Use case: Ideal for multilingual voice agents

#### Deployment Considerations

Open-source TTS models offer several advantages for voice agent applications:

1. **Cost:** At $0.65-8.33 per million characters, open-source models are 10-100x cheaper than commercial APIs ($10-100+ per million characters for some providers).

2. **Customization:** Self-hosted models can be fine-tuned on domain-specific vocabulary, brand voice, and target audience.

3. **Privacy:** Data never leaves your infrastructure, critical for healthcare, finance, and other regulated industries.

4. **Latency Control:** Self-hosted deployment eliminates network latency to external APIs, potentially reducing TTFB by 50-100ms.

5. **License Flexibility:** Apache-2.0 and MIT licenses permit commercial use without restrictions.

The main trade-off is the infrastructure cost and operational complexity of self-hosting. Models like Kokoro 82M v1.0 (82M parameters) can run on a single GPU, while larger models like Qwen3-TTS 1.7B require more capable hardware.

### 4. LLM Selection for Voice Agents

The choice of LLM for a voice agent backend differs significantly from text-based applications. In voice agents, inference speed matters far more than reasoning quality, as the user experiences latency as silence — a major degradation of conversational flow.

#### Key Metrics for Voice Agent LLMs

| LLM | TTFT (ms) | TPS (tokens/sec) | MMLU-Pro | GPQA | BFCL V3 |
|-----|-----------|------------------|----------|------|---------|
| Qwen3-30B-A3B | 25.44 | 157.29 | 86.7 | 48.8 | 89.5 |
| Qwen3-235B-A22B | 102.71 | 115.75 | 90.0 | 56.2 | 90.8 |
| Llama 4 Scout | 128.29 | 119.97 | 82.0 | 42.0 | 85.0 |
| Llama 4 Maverick | 315.71 | 56.61 | 92.0 | 60.0 | 92.0 |
| Qwen3-235B-A22B-Nemotron | 143.57 | 126.00 | 89.0 | 55.0 | 91.0 |

#### Recommendations

**For Speed-Critical Applications (Qwen3-30B-A3B):**
- Fastest TTFT (25.44ms) and highest TPS (157.29 tokens/sec)
- Strong MMLU-Pro score (86.7) for its size
- Ideal for real-time voice interactions where latency is paramount
- Runs efficiently on consumer-grade GPUs

**For Balanced Quality/Speed (Qwen3-235B-A22B):**
- Excellent reasoning (GPQA 56.2) with good speed (115.75 tokens/sec)
- Best overall quality among fast models
- Suitable for complex voice agents that need both speed and intelligence

**For Maximum Quality (Llama 4 Maverick):**
- Highest reasoning scores (GPQA 60.0, MMLU-Pro 92.0)
- Slowest speed (56.61 tokens/sec) — may cause noticeable pauses
- Best for voice agents where response quality matters more than conversational flow

#### LLM Architecture Considerations

For voice agents, the LLM should support:
- **Streaming output:** Essential for reducing perceived latency
- **Function calling:** Required for tool use during conversations
- **Multilingual support:** If the agent serves multiple language users
- **Long context window:** For maintaining conversation history
- **Low TTFT:** Critical for responsive voice interactions (target: <100ms)

## Conclusion

The landscape of voice TTS for LLM responses in 2026 is characterized by remarkable convergence on two complementary architectural paradigms. The cascaded pipeline — combining specialized STT, LLM, and TTS models with sophisticated orchestration — has matured to the point where it can achieve human-like conversational latency (200-500ms round-trip) with high-quality speech output. Meanwhile, speech-to-speech models that integrate speech tokenization directly into the LLM architecture offer the potential for even lower latency, though they currently lag in quality and tool-use capabilities.

The commercial API landscape is dominated by three players: OpenAI (maturest platform, best developer experience), Google (innovative Live TTS streaming, strong multimodal integration), and ElevenLabs (best voice quality, most customizable). Open-source models have closed the quality gap dramatically, with Kokoro 82M v1.0 and Qwen3-TTS offering near-commercial quality at a fraction of the cost.

The critical insight for practitioners is that voice agent design requires fundamentally different LLM selection criteria than text-based applications: inference speed (TTFT and TPS) matters far more than reasoning quality, as latency is directly perceived as conversational friction. The best voice agents prioritize sub-100ms TTFT and streaming output over maximum reasoning capability.

## Future Work & Recommendations

1. **Benchmark Speech-to-Speech Models:** The speech-to-speech model class (Qwen3-Speech, GLM-4-Voice) shows promise for lower-latency voice agents, but systematic benchmarking against cascaded pipelines is needed. Future research should compare these architectures on identical hardware with standardized latency and quality metrics.

2. **Evaluate Voice Agent Platforms for Production Deployment:** For organizations seeking to deploy voice agents quickly, a comparative evaluation of Retell AI, Vapi, and Bland AI would provide valuable guidance on platform selection based on use case, budget, and technical requirements.

3. **Investigate Privacy-Preserving Voice Agent Architectures:** As voice agents handle sensitive conversations, research into fully self-hosted voice agent pipelines (using open-source STT, LLM, and TTS models) that can run entirely within an organization's infrastructure would address growing privacy and compliance concerns in healthcare, finance, and government applications.

## Citations

### Primary Sources

- Salesforce AI Research. "Building Enterprise Realtime Voice Agents From Scratch." *arXiv*, 2026. https://arxiv.org/html/2603.05413v2

- TokenMix. "Voice AI API Comparison: Realtime vs Gemini Live vs ElevenLabs 2026." *TokenMix Blog*, 2026. https://tokenmix.ai/blog/voice-ai-api-realtime-vs-gemini-live-vs-elevenlabs-2026

- OpenAI. "Realtime API: Building Voice Applications." *API Scout*, 2026. https://apiscout.dev/guides/openai-realtime-api-building-voice-applications-2026

- ElevenLabs. "How Do You Optimize Latency for Conversational AI?" *ElevenLabs Blog*, 2026. https://elevenlabs.io/blog/how-do-you-optimize-latency-for-conversational-ai

- Google Cloud. "How to Use Gemini Live API with Native Audio in Vertex AI." *Google Cloud Blog*, 2026. https://cloud.google.com/blog/topics/developers-practitioners/how-to-use-gemini-live-api-native-audio-in-vertex-ai

- Google Cloud. "Gemini Text-to-Speech Models." *Google Cloud Documentation*, 2026. https://docs.cloud.google.com/text-to-speech/docs/gemini-tts

- Softcery. "Best LLMs for Voice Agents in 2026: A Guide to Choosing the Right One." *Softcery Lab*, 2026. https://softcery.com/lab/ai-voice-agents-choosing-the-right-llm

- Artificial Analysis. "Text-to-Speech Models Comparison." *Artificial Analysis*, 2026. https://artificialanalysis.ai/text-to-speech/models

- Neosophie. "Top 10 Open Source Text-to-Speech (TTS) Models in 2026." *Neosophie Blog*, 2026. https://neosophie.com/en/blog/20260317-tts

- Codesota. "Best TTS Models of 2026: Quality, Speed, and Price Comparison." *Codesota*, 2026. https://www.codesota.com/guides/tts-models

### Technical Documentation

- OpenAI. "Realtime API Documentation." https://developers.openai.com/api/docs/guides/realtime

- OpenAI. "Audio API Documentation." https://developers.openai.com/api/docs/guides/audio

- Google Cloud. "Gemini Live API with Native Audio." https://cloud.google.com/blog/topics/developers-practitioners/how-to-use-gemini-live-api-native-audio-in-vertex-ai

### Voice Agent Platforms

- Retell AI. "Voice Agent Platform Documentation." https://www.retell.ai

- Vapi. "Voice AI Platform Documentation." https://vapi.ai

- Bland AI. "Sales Call Automation Platform." https://www.bland.ai
