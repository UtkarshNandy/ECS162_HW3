// static/main.js

function getApiKey() {
  return fetch("/api/key").then((response) => response.json()).then((data) => data.apiKey).catch((err) => {
      console.error("API fetch error", err);
      throw new Error("API fetch error");
    });
}

function fetchAndProcessArticles() {
  const imageGrid = document.getElementById("image-grid");
  if (!imageGrid) {
    console.error("No #image-grid container found");
    return Promise.resolve();
  }

  // return the promise chain 
  return getApiKey()
    .then((apiKey) => {
      const BASE_URL =
        "https://api.nytimes.com/svc/search/v2/articlesearch.json" +
        "?fq=timesTag.location:(%22Davis%22%20%22Sacramento%22)" +
        "&sort=newest" +
        "&page=0" +
        `&api-key=${apiKey}`;
      return fetch(BASE_URL);
    })
    .then((response) => response.json())
    .then((data) => {
      const articles = data.response.docs;
      articles.forEach((article, idx) => {
        if (idx === 9) return;

        const gridContainer = document.createElement("div");
        gridContainer.classList.add("grid-container");

        const articleContainer = document.createElement("div");
        articleContainer.classList.add("article-container");

        const image = document.createElement("img");
        const imagePaths = [
          "/static/assets/image1.jpg",
          "/static/assets/image2.jpg",
          "/static/assets/image3.jpg",
          "/static/assets/image4.jpg",
          "/static/assets/image5.jpg",
          "/static/assets/image6.jpg",
          "/static/assets/image7.jpg",
          "/static/assets/image8.jpg",
          "/static/assets/image9.jpg",
        ];
        image.src = imagePaths[idx % imagePaths.length];
        image.alt = "Article Image";
        image.classList.add("article-image");
        articleContainer.appendChild(image);

        const header = document.createElement("h1");
        header.textContent = article.headline.main;
        header.classList.add("article-header");
        articleContainer.appendChild(header);

        const paragraph = document.createElement("p");
        paragraph.textContent = article.abstract || "no description";
        paragraph.classList.add("article-paragraph");
        articleContainer.appendChild(paragraph);

        gridContainer.appendChild(articleContainer);
        imageGrid.appendChild(gridContainer);
      });
    })
    .catch((err) => {
      console.error(`Fetch failed: ${err.message}`);
    });
}

// export for node tests
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getApiKey, fetchAndProcessArticles };
} else {
  // in browser
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fetchAndProcessArticles);
  } else {
    fetchAndProcessArticles();
  }
}
