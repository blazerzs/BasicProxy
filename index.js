// Import the Durable Object class
export { RateLimiter } from './rate_limiter.js';

// Define the main Worker
export default {
  async fetch(request, env) {
    console.log(`>>> NEW REQUEST INCOMING: ${request.url}`);

    const rateLimiterId = env.RATE_LIMITER.idFromName("global_rate_limiter");
    const rateLimiterObject = env.RATE_LIMITER.get(rateLimiterId);

    return rateLimiterObject.fetch(request);
  }
};
