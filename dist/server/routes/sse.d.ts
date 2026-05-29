/**
 * SSE streaming endpoint — /sse/:sessionId
 * Accepts a POST with user message, streams Pi agent response via Server-Sent Events.
 */
declare const router: import("express-serve-static-core").Router;
export default router;
