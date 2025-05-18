// static/main.js

function getApiKey() {
  return fetch("/api/key")
    .then((response) => response.json())
    .then((data) => data.apiKey)
    .catch((err) => {
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
      const BASE_URL = `https://api.nytimes.com/svc/search/v2/articlesearch.json?q=${encodeURIComponent(
        `Davis OR Sacramento`
      )}&api-key=${apiKey}&page=${0}`;
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
  function onReady() {
    auth.onAuthStateChanged((user) => {
      //isModerator = user && MODERATOR_UIDS.includes(user.uid);
      const btn =
        document.getElementById("log-in") ||
        document.getElementById("account-btn");
      if (user) {
        btn.textContent = "Account";
        btn.style.backgroundColor = "white";
        btn.style.color = "black";
        btn.style.border = "1px solid black";
        btn.style.cursor = "pointer";
        btn.id = "account-btn";
        btn.replaceWith(btn.cloneNode(true));
        document.getElementById("account-btn").addEventListener("click", () => {
          document.getElementById("account-sidebar").classList.add("open");
        });
        document.getElementById("user-email").textContent = user.email;
      } else {
        btn.textContent = "Log In";
        btn.style.backgroundColor = "#0a66c2";
        btn.style.color = "white";
        btn.style.border = "none";
        btn.style.cursor = "pointer";
        btn.id = "log-in";
        btn.replaceWith(btn.cloneNode(true));
        document.getElementById("log-in").addEventListener("click", () => {
          window.location.href = "login.html";
        });
        document.getElementById("account-sidebar").classList.remove("open");
      }
    });

    document
      .getElementById("btn-logout")
      .addEventListener("click", () => auth.signOut());
    document.getElementById("close-sidebar").addEventListener("click", () => {
      document.getElementById("account-sidebar").classList.remove("open");
    });
    document.getElementById("close-comments").addEventListener("click", () => {
      document.getElementById("comments-sidebar").classList.remove("open");
    });

    fetchAndProcessArticles();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onReady);
  } else {
    onReady();
  }
}
