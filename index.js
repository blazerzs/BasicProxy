// Export our request handler
export default {
  async fetch(request) {
    const url = new URL(request.url);
    
    // Construct the new URL to forward the request to discord.com
    const newUrl = `https://discord.com${url.pathname}${url.search}`;

    return fetch(newUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body
    });
  }
}
