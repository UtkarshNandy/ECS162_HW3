/**
 * @jest-environment jsdom
 */

global.fetch = jest.fn();

const { getApiKey, fetchAndProcessArticles } = require("../static/main.js");

beforeEach(() => {
  document.body.innerHTML = `
  <div id ="image-grid" class="main-container"></div>
  `;
  global.fetch = jest.fn();
});

describe("getApiKey()", () => {
  it("fetches from /api/key", async () => {
    fetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ apiKey: "FAKE_KEY" }),
    });

    const key = await getApiKey();
    expect(key).toBe("FAKE_KEY");
    expect(fetch).toHaveBeenCalledWith("/api/key");
  });
});

describe("fetchAndProcessArticles()", () => {
  it("renders fake article", async () => {
    // fetch API key
    fetch
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ apiKey: "FKEY" }),
      })
      // NYT API call
      .mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            response: {
              docs: [
                {
                  headline: { main: "TEST" },
                  abstract: "abstract",
                  multimedia: [{ url: "img1.jpg" }],
                  web_url: "http://example.com",
                },
              ],
            },
          }),
      });

    await fetchAndProcessArticles();

    const header = document.querySelector(".article-header");
    const para = document.querySelector(".article-paragraph");
    expect(header.textContent).toBe("TEST");
    expect(para.textContent).toBe("abstract");
  });

  it("NYT API call", async () => {
    fetch
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ apiKey: "FKEY" }),
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ response: { docs: [] } }),
      });

    await fetchAndProcessArticles();

    // index 1 for second fetch
    const calledUrl = fetch.mock.calls[1][0];
    expect(calledUrl).toMatch(
      /^https:\/\/api\.nytimes\.com\/svc\/search\/v2\/articlesearch\.json/
    );
    expect(calledUrl).toMatch(
      /fq=timesTag\.location:\(%22Davis%22%20%22Sacramento%22\)/
    );
  });

  it("validates NYT payload", async () => {
    const goodDoc = {
      headline: { main: "T" },
      web_url: "u",
      multimedia: [],
      abstract: "A",
    };
    // simulates API key and payload
    fetch
      .mockResolvedValueOnce({ json: () => Promise.resolve({ apiKey: "K" }) })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ response: { docs: [goodDoc] } }),
      });

    await fetchAndProcessArticles();
    
    expect(goodDoc.headline.main).toEqual(expect.any(String));
    expect(goodDoc.web_url).toEqual(expect.stringContaining(""));
    expect(Array.isArray(goodDoc.multimedia)).toBe(true);
    expect(goodDoc.abstract).toEqual(expect.any(String));
  });
});
