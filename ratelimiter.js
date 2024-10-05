export class RateLimiter {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.queue = [];
    this.requestCount = 0;
    this.MAX_REQUESTS_PER_MINUTE = 5;
    this.RESET_INTERVAL = 60000; // 1 minute
    this.rateLimitActive = false;

    // Restore the state
    this.state.blockConcurrencyWhile(async () => {
      const storedData = await this.state.storage.get('requestCount');
      if (storedData) {
        this.requestCount = storedData.requestCount || 0;
        this.rateLimitActive = storedData.rateLimitActive || false;
      }
    });
  }

  // Function to reset the rate limit after 1 minute
  async resetRateLimit() {
    console.log(">>> GLOBAL RATE LIMIT RESET! BACK TO FULL POWER!");

    this.requestCount = 0;
    this.rateLimitActive = false;
    await this.state.storage.put('requestCount', { requestCount: 0, rateLimitActive: false });

    if (this.queue.length > 0) {
      console.log(`>>> PROCESSING QUEUE: ${this.queue.length} REQUEST(S) WAITING...`);
      this.processQueue();
    }
  }

  // Function to process queued requests
  async processQueue() {
    while (this.queue.length > 0 && this.requestCount < this.MAX_REQUESTS_PER_MINUTE) {
      const { request, resolve, reject } = this.queue.shift();
      this.requestCount++;
      console.log(`>>> PROCESSING QUEUE REQUEST: ${request.url} (REQUEST COUNT: ${this.requestCount}/${this.MAX_REQUESTS_PER_MINUTE})`);

      try {
        const url = new URL(request.url);
        const newUrl = `https://discord.com${url.pathname}${url.search}`;

        const response = await fetch(newUrl, {
          method: request.method,
          headers: request.headers,
          body: request.body
        });

        resolve(response);
      } catch (error) {
        console.log(`>>> ERROR! REQUEUING REQUEST: ${request.url}`);
        this.queue.push({ request, resolve, reject });
      }
    }

    if (this.requestCount >= this.MAX_REQUESTS_PER_MINUTE && !this.rateLimitActive) {
      this.rateLimitActive = true;
      await this.state.storage.put('requestCount', { requestCount: this.requestCount, rateLimitActive: true });
      setTimeout(() => this.resetRateLimit(), this.RESET_INTERVAL);
    }
  }

  // Function to handle requests globally
  async handleRequest(request) {
    return new Promise(async (resolve, reject) => {
      if (this.requestCount < this.MAX_REQUESTS_PER_MINUTE && !this.rateLimitActive) {
        this.requestCount++;
        console.log(`>>> IMMEDIATE REQUEST: ${request.url} (REQUEST COUNT: ${this.requestCount}/${this.MAX_REQUESTS_PER_MINUTE})`);

        const url = new URL(request.url);
        const newUrl = `https://discord.com${url.pathname}${url.search}`;

        try {
          const response = await fetch(newUrl, {
            method: request.method,
            headers: request.headers,
            body: request.body
          });

          console.log(`>>> REQUEST SUCCESS: ${request.url}`);
          resolve(new Response(response.body, { status: response.status, headers: response.headers }));

          await this.state.storage.put('requestCount', { requestCount: this.requestCount, rateLimitActive: this.rateLimitActive });
        } catch (error) {
          console.log(`>>> ERROR! REQUEUING IMMEDIATE REQUEST: ${request.url}`);
          this.queue.push({ request, resolve, reject });
        }

        if (this.requestCount >= this.MAX_REQUESTS_PER_MINUTE && !this.rateLimitActive) {
          this.rateLimitActive = true;
          console.log(">>> RATE LIMIT HIT AFTER THIS REQUEST! STARTING QUEUE...");
          await this.state.storage.put('requestCount', { requestCount: this.requestCount, rateLimitActive: this.rateLimitActive });
          setTimeout(() => this.resetRateLimit(), this.RESET_INTERVAL);
        }
      } else {
        console.log(`>>> RATE LIMIT ACTIVE! QUEUING REQUEST: ${request.url}`);
        this.queue.push({ request, resolve, reject });

        resolve(new Response("Your request is queued due to rate limiting.", { status: 429 }));
      }
    });
  }
}

// Export Durable Object class
export default {
  fetch(request, env, ctx) {
    return env.RATE_LIMITER.fetch(request);
  }
};
