const MODERATOR_UIDS = ["cLUfz8EfpTfsuwq9CSSlW0P0Nza2"];
const REMOVED_TEXT = "COMMENT REMOVED BY MODERATOR!";
let isModerator = false;

function getApiKey() {
  return fetch("/api/key")
    .then((response) => response.json())
    .then((data) => data.apiKey)
    .catch((err) => {
      console.error("API fetch error", err);
      throw new Error("API fetch error");
    });
}

function setupNewCommentUI(articleId) {
  const wrapper = document.getElementById("new-comment");
  if (!wrapper) return;
  wrapper.innerHTML = `
<textarea id="comment-input"
placeholder="Share your thoughts."
class="comment-input"></textarea>
<button id="comment-submit">Post</button>
`;
  document
    .getElementById("comment-submit")
    .addEventListener("click", async () => {
      const text = document.getElementById("comment-input").value.trim();
      if (!text || !auth.currentUser) return;
      await db.collection("comments").add({
        text,
        email: auth.currentUser.email,
        articleId,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      });
      document.getElementById("comment-input").value = "";
    });
}

function subscribeToComments(articleId) {
  const container = document.getElementById("comments-list");
  container.innerHTML = "";

  db.collection("comments")
    .where("articleId", "==", articleId)
    .orderBy("timestamp", "desc")
    .onSnapshot((snap) => {
      const titleEl = document.getElementById("comments-sidebar-title");
      titleEl.textContent = `Comments (${snap.size})`;

      container.innerHTML = "";

      snap.forEach((doc) => {
        const { text, email } = doc.data();
        const commentEl = document.createElement("div");
        commentEl.classList.add("comment");

        commentEl.innerHTML = `
<div class="comment-user">${email}</div>
<div class="comment-body">${text}</div>
`;

        if (text !== REMOVED_TEXT) {
          const commentActions = document.createElement("div");
          commentActions.classList.add("comment-actions");

          const replyBtn = document.createElement("button");
          replyBtn.textContent = "Reply";
          replyBtn.classList.add("reply-btn");
          commentActions.appendChild(replyBtn);

          let originalText = text;
          const redactBtn = document.createElement("button");
          redactBtn.textContent = "Redact";
          redactBtn.classList.add("redact-btn");
          commentActions.appendChild(redactBtn);

          let delBtn = null;
          if (isModerator) {
            delBtn = document.createElement("button");
            delBtn.textContent = "Delete";
            delBtn.classList.add("delete-comment-btn");
            delBtn.addEventListener("click", () => {
              db.collection("comments")
                .doc(doc.id)
                .update({ text: REMOVED_TEXT })
                .catch(console.error);
            });
            commentActions.appendChild(delBtn);
          }

          commentEl.appendChild(commentActions);

          replyBtn.addEventListener("click", () => {
            if (replyBtn.textContent === "Submit") {
              const ta = commentEl.querySelector(".redact-textarea");
              const start = ta.selectionStart,
                end = ta.selectionEnd;
              if (start === end) {
                return alert("Highlight text to redact.");
              }
              const orig = ta.value;
              const mask = "█".repeat(end - start);
              const newText = orig.slice(0, start) + mask + orig.slice(end);

              db.collection("comments")
                .doc(doc.id)
                .update({ text: newText })
                .then(() => {
                  const newBody = document.createElement("div");
                  newBody.classList.add("comment-body");
                  newBody.textContent = newText;
                  commentEl.replaceChild(newBody, ta);
                  replyBtn.textContent = "Reply";
                  redactBtn.textContent = "Redact";
                  if (delBtn) delBtn.disabled = false;
                })
                .catch(console.error);
            } else {
              replyBtn.disabled = true;
              const input = document.createElement("input");
              input.placeholder = "Write your reply...";
              input.classList.add("reply-input");
              commentEl.appendChild(input);

              const send = document.createElement("button");
              send.textContent = "Send";
              send.classList.add("send-reply-btn");
              commentEl.appendChild(send);

              send.addEventListener("click", async () => {
                const v = input.value.trim();
                if (!v) return;
                try {
                  await db
                    .collection("comments")
                    .doc(doc.id)
                    .collection("replies")
                    .add({
                      text: v,
                      email: auth.currentUser.email,
                      uid: auth.currentUser.uid,
                      timestamp:
                        firebase.firestore.FieldValue.serverTimestamp(),
                    });
                  input.remove();
                  send.remove();
                  replyBtn.disabled = false;
                } catch (e) {
                  console.error(e);
                }
              });
            }
          });

          redactBtn.addEventListener("click", () => {
            const bodyEl = commentEl.querySelector(".comment-body");
            if (redactBtn.textContent === "Redact") {
              originalText = bodyEl.textContent;
              const ta = document.createElement("textarea");
              ta.classList.add("redact-textarea");
              ta.value = originalText;
              commentEl.replaceChild(ta, bodyEl);
              replyBtn.textContent = "Submit";
              redactBtn.textContent = "Cancel";
              if (delBtn) delBtn.disabled = true;
            } else {
              const newBody = document.createElement("div");
              newBody.classList.add("comment-body");
              newBody.textContent = originalText;
              const ta = commentEl.querySelector(".redact-textarea");
              commentEl.replaceChild(newBody, ta);
              replyBtn.textContent = "Reply";
              redactBtn.textContent = "Redact";
              if (delBtn) delBtn.disabled = false;
            }
          });
        } else {
          commentEl
            .querySelector(".comment-body")
            .classList.add("removed-text");
        }

        const repliesContainer = document.createElement("div");
        repliesContainer.classList.add("replies-list");
        commentEl.appendChild(repliesContainer);

        db.collection("comments")
          .doc(doc.id)
          .collection("replies")
          .orderBy("timestamp", "asc")
          .onSnapshot((replySnap) => {
            repliesContainer.innerHTML = "";

            replySnap.forEach((rDoc) => {
              const { text: rText, email: rEmail } = rDoc.data();
              const replyEl = document.createElement("div");
              replyEl.classList.add("reply");
              replyEl.innerHTML = `
<div class="reply-user">${rEmail}</div>
<div class="reply-body">${rText}</div>
`;

              if (rText !== REMOVED_TEXT) {
                const replyActions = document.createElement("div");
                replyActions.classList.add("reply-actions");

                const replyToReplyBtn = document.createElement("button");
                replyToReplyBtn.textContent = "Reply";
                replyToReplyBtn.classList.add("reply-btn");
                replyActions.appendChild(replyToReplyBtn);

                replyEl.appendChild(replyActions);
              } else {
                replyEl
                  .querySelector(".reply-body")
                  .classList.add("removed-text");
              }

              repliesContainer.appendChild(replyEl);
            });
          });

        container.appendChild(commentEl);
      });
    });
}

function fetchAndProcessArticles() {
  const imageGrid = document.getElementById("image-grid");
  if (!imageGrid) {
    console.error("No #image-grid container found");
    return Promise.resolve();
  }

  return getApiKey()
    .then((apiKey) => {
      const BASE_URL = `https://api.nytimes.com/svc/search/v2/articlesearch.json?q=${encodeURIComponent(
        "Davis OR Sacramento"
      )}&api-key=${apiKey}&page=0`;
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
        const commentBtn = document.createElement("button");
        commentBtn.classList.add("comment-button");
        const articleId = article._id;
        db.collection("comments")
          .where("articleId", "==", articleId)
          .onSnapshot((snap) => {
            commentBtn.innerHTML = `💬<span class="comment-count">${snap.size}</span>`;
          }, console.error);

        commentBtn.addEventListener("click", () => {
          if (!auth.currentUser) {
            window.location.href = "login.html";
            return;
          } 
          const sidebar = document.getElementById("comments-sidebar");
          sidebar.classList.add("open");
          setupNewCommentUI(articleId);
          subscribeToComments(articleId);
        });
        articleContainer.appendChild(commentBtn);

        gridContainer.appendChild(articleContainer);
        imageGrid.appendChild(gridContainer);
      });
    })
    .catch((err) => {
      console.error(`Fetch failed: ${err.message}`);
    });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { getApiKey, fetchAndProcessArticles };
} else {
  function onReady() {
    auth.onAuthStateChanged((user) => {
      isModerator = user && MODERATOR_UIDS.includes(user.uid);
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
