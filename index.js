export default {
  async fetch(request, env) {
    console.log(`>>> NEW REQUEST INCOMING: ${request.url}`);

    const rateLimiterId = env.RATE_LIMITER.idFromName("global_rate_limiter");
    const rateLimiterObject = env.RATE_LIMITER.get(rateLimiterId);

    return rateLimiterObject.fetch(request);
  }
};
