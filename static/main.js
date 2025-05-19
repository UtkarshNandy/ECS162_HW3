// global constants for moderator
const MODERATOR_UIDS = ["cLUfz8EfpTfsuwq9CSSlW0P0Nza2"];
const REMOVED_TEXT = "COMMENT REMOVED BY MODERATOR!";
let isModerator = false;

// fetch api key
function getApiKey() {
  return fetch("/api/key")
    .then((res) => res.json())
    .then((data) => data.apiKey)
    .catch((err) => {
      console.error(err);
      throw err;
    });
}

// helper function for setting up commenting boxes
function setupNewCommentUI(articleId) {
  const w = document.getElementById("new-comment");
  if (!w) return;
  w.innerHTML = `
<textarea id="comment-input" class="comment-input" placeholder="Share your thoughts."></textarea>
<div id="comment-controls" class="comment-controls">
<button id="comment-cancel" class="comment-cancel-btn">Cancel</button>
<button id="comment-submit" class="comment-submit-btn">Submit</button>
</div>
`;
  const input = document.getElementById("comment-input");
  const ctrls = document.getElementById("comment-controls");
  ctrls.style.display = "none";
  input.addEventListener("focus", () => (ctrls.style.display = "flex"));
  document.getElementById("comment-cancel").addEventListener("click", () => {
    input.value = "";
    ctrls.style.display = "none";
  });
  document
    .getElementById("comment-submit")
    .addEventListener("click", async () => {
      const t = input.value.trim();
      if (!t || !auth.currentUser) return;
      await db.collection("comments").add({
        text: t,
        email: auth.currentUser.email,
        articleId,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      });
      input.value = "";
      ctrls.style.display = "none";
    });
}

// display comments specific to article
function subscribeToComments(articleId) {
  const container = document.getElementById("comments-list");
  container.innerHTML = "";
  db.collection("comments")
    .where("articleId", "==", articleId)
    .orderBy("timestamp", "desc")
    .onSnapshot((snap) => {
      document.getElementById(
        "comments-sidebar-title"
      ).textContent = `Comments (${snap.size})`;
      container.innerHTML = "";

      snap.forEach((doc) => {
        const { text, email } = doc.data();
        const el = document.createElement("div");
        el.classList.add("comment");
        el.innerHTML = `
<div class="comment-user">${email}</div>
<div class="comment-body">${text}</div>
`;

        if (text !== REMOVED_TEXT) {
          const acts = document.createElement("div");
          acts.classList.add("comment-actions");
          // create reply button
          const replyBtn = document.createElement("button");
          replyBtn.textContent = "Reply";
          replyBtn.classList.add("reply-btn");
          acts.appendChild(replyBtn);

          let orig = text,
            rBtn,
            dBtn;
          if (isModerator) {
            rBtn = document.createElement("button"); // create redact button if moderator
            rBtn.textContent = "Redact";
            rBtn.classList.add("redact-btn");
            acts.appendChild(rBtn);

            dBtn = document.createElement("button");
            dBtn.textContent = "Delete"; // create delete button if moderator
            dBtn.classList.add("delete-comment-btn");
            dBtn.addEventListener("click", () => {
              db.collection("comments")
                .doc(doc.id)
                .update({ text: REMOVED_TEXT })
                .catch(console.error);
            });
            acts.appendChild(dBtn);
          }

          el.appendChild(acts);
          // action on redact
          replyBtn.addEventListener("click", () => {
            const ta = el.querySelector(".redact-textarea");

            if (ta && replyBtn.textContent === "Submit") {
              const start = ta.selectionStart,
                end = ta.selectionEnd;
              if (start === end)
                return alert("Please highlight what to redact.");
              const mask = "█".repeat(end - start);
              const newText =
                ta.value.slice(0, start) + mask + ta.value.slice(end);
              db.collection("comments")
                .doc(doc.id)
                .update({ text: newText })
                .then(() => {
                  const nb = document.createElement("div");
                  nb.classList.add("comment-body");
                  nb.textContent = newText;
                  el.replaceChild(nb, ta);
                  replyBtn.textContent = "Reply";
                  rBtn.textContent = "Redact";
                  if (dBtn) dBtn.disabled = false;
                })
                .catch(console.error);
              return;
            }
            // reply textbox
            replyBtn.disabled = true;
            const inp = document.createElement("input");
            inp.placeholder = "Write your reply...";
            inp.classList.add("reply-input");
            el.appendChild(inp);

            const send = document.createElement("button");
            send.textContent = "Send";
            send.classList.add("send-reply-btn");
            el.appendChild(send);

            send.addEventListener("click", async () => {
              const v = inp.value.trim();
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
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                  });
                inp.remove();
                send.remove();
                replyBtn.disabled = false;
              } catch (e) {
                console.error(e);
              }
            });
          });

          if (isModerator && rBtn) {
            rBtn.addEventListener("click", () => {
              const bd = el.querySelector(".comment-body");
              if (rBtn.textContent === "Redact") {
                orig = bd.textContent; // replace text with redacted region
                const ta2 = document.createElement("textarea");
                ta2.classList.add("redact-textarea");
                ta2.value = orig;
                el.replaceChild(ta2, bd);
                replyBtn.textContent = "Submit";
                rBtn.textContent = "Cancel";
                if (dBtn) dBtn.disabled = true;
              } else {
                const nb2 = document.createElement("div");
                nb2.classList.add("comment-body");
                nb2.textContent = orig;
                const ta2 = el.querySelector(".redact-textarea");
                el.replaceChild(nb2, ta2);
                replyBtn.textContent = "Reply";
                rBtn.textContent = "Redact";
                if (dBtn) dBtn.disabled = false;
              }
            });
          }
        } else {
          el.querySelector(".comment-body").classList.add("removed-text");
        }
        // create list of replies
        const rc = document.createElement("div");
        rc.classList.add("replies-list");
        el.appendChild(rc);

        db.collection("comments")
          .doc(doc.id)
          .collection("replies")
          .orderBy("timestamp", "asc")
          .onSnapshot((rs) => {
            rc.innerHTML = "";
            rs.forEach((rDoc) => {
              const { text: rt, email: re } = rDoc.data();
              const reEl = document.createElement("div");
              reEl.classList.add("reply");
              reEl.innerHTML = `
<div class="reply-user">${re}</div>
<div class="reply-body">${rt}</div>
`;
              if (rt !== REMOVED_TEXT) {
                const ras = document.createElement("div");
                ras.classList.add("reply-actions");

                const r2 = document.createElement("button");
                r2.textContent = "Reply";
                r2.classList.add("reply-btn");
                ras.appendChild(r2);

                if (isModerator) {
                  const rr = document.createElement("button");
                  rr.textContent = "Redact";
                  rr.classList.add("redact-btn");
                  ras.appendChild(rr);
                  rr.addEventListener("click", () => {
                    const b = reEl.querySelector(".reply-body");
                    if (rr.textContent === "Redact") {
                      const ta3 = document.createElement("textarea");
                      ta3.classList.add("redact-textarea");
                      ta3.value = b.textContent;
                      reEl.replaceChild(ta3, b);
                      rr.textContent = "Submit";
                    } else {
                      const ta3 = reEl.querySelector(".redact-textarea");
                      const s = ta3.selectionStart,
                        e = ta3.selectionEnd;
                      if (s === e) return alert("Highlight to redact.");
                      const m = "█".repeat(e - s);
                      const nt = ta3.value.slice(0, s) + m + ta3.value.slice(e);
                      db.collection("comments")
                        .doc(doc.id)
                        .collection("replies")
                        .doc(rDoc.id)
                        .update({ text: nt })
                        .then(() => {
                          const dv = document.createElement("div");
                          dv.classList.add("reply-body");
                          dv.textContent = nt;
                          reEl.replaceChild(dv, ta3);
                          rr.textContent = "Redact";
                        })
                        .catch(console.error);
                    }
                  });

                  const dr = document.createElement("button");
                  dr.textContent = "Delete";
                  dr.classList.add("delete-comment-btn");
                  dr.addEventListener("click", () => {
                    db.collection("comments")
                      .doc(doc.id)
                      .collection("replies")
                      .doc(rDoc.id)
                      .update({ text: REMOVED_TEXT })
                      .catch(console.error);
                  });
                  ras.appendChild(dr);
                }

                reEl.appendChild(ras);

                r2.addEventListener("click", () => {
                  r2.disabled = true;
                  const i2 = document.createElement("input");
                  i2.placeholder = "Write your reply...";
                  i2.classList.add("reply-input");
                  reEl.appendChild(i2);
                  const s2 = document.createElement("button");
                  s2.textContent = "Send";
                  s2.classList.add("send-reply-btn");
                  reEl.appendChild(s2);
                  s2.addEventListener("click", async () => {
                    const v = i2.value.trim();
                    if (!v) return;
                    try {
                      await db
                        .collection("comments")
                        .doc(doc.id)
                        .collection("replies")
                        .doc(rDoc.id)
                        .collection("replies")
                        .add({
                          text: v,
                          email: auth.currentUser.email,
                          uid: auth.currentUser.uid,
                          timestamp:
                            firebase.firestore.FieldValue.serverTimestamp(),
                        });
                      i2.remove();
                      s2.remove();
                      r2.disabled = false;
                    } catch (e) {
                      console.error(e);
                    }
                  });
                });
              } else {
                reEl.querySelector(".reply-body").classList.add("removed-text");
              }
              rc.appendChild(reEl);
            });
          });

        container.appendChild(el);
      });
    });
}

// function for processing articles
function fetchAndProcessArticles() {
  const grid = document.getElementById("image-grid");
  if (!grid) return Promise.resolve();
  return getApiKey()
    .then((key) => {
      const URL = `https://api.nytimes.com/svc/search/v2/articlesearch.json?q=${encodeURIComponent(
        "Davis OR Sacramento" // url for nyt api
      )}&api-key=${key}&page=0`;
      return fetch(URL);
    })
    .then((r) => r.json())
    .then((data) => {
      data.response.docs.forEach((a, i) => {
        if (i === 9) return;
        const gc = document.createElement("div");
        gc.classList.add("grid-container");
        const ac = document.createElement("div");
        ac.classList.add("article-container");
        const img = document.createElement("img");
        const paths = [
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
        img.src = paths[i % paths.length];
        img.alt = "Article Image";
        img.classList.add("article-image");
        ac.appendChild(img);
        const h = document.createElement("h1");
        h.textContent = a.headline.main;
        h.classList.add("article-header");
        ac.appendChild(h);
        const p = document.createElement("p");
        p.textContent = a.abstract || "no description";
        p.classList.add("article-paragraph");
        ac.appendChild(p);
        const btn = document.createElement("button");
        btn.classList.add("comment-button");
        btn.innerHTML = `💬<span class="comment-count">0</span>`;
        const countEl = btn.querySelector(".comment-count");
        db.collection("comments")
          .where("articleId", "==", a._id)
          .onSnapshot(
            (snap) => (countEl.textContent = snap.size),
            console.error
          );
        btn.addEventListener("click", () => {
          if (!auth.currentUser) {
            window.location.href = "login.html";
            return;
          }
          document.getElementById("comments-sidebar").classList.add("open");
          setupNewCommentUI(a._id);
          subscribeToComments(a._id);
        });
        ac.appendChild(btn);
        gc.appendChild(ac);
        grid.appendChild(gc);
      });
    })
    .catch((e) => console.error(e));
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { getApiKey, fetchAndProcessArticles };
} else {
  function onReady() {
    auth.onAuthStateChanged((u) => {
      isModerator = u && MODERATOR_UIDS.includes(u.uid);
      const b =
        document.getElementById("log-in") ||
        document.getElementById("account-btn");
      if (u) {
        b.textContent = "Account"; // account button if user else log in
        b.style.backgroundColor = "white";
        b.style.color = "black";
        b.style.border = "1px solid black";
        b.style.cursor = "pointer";
        b.id = "account-btn";
        b.replaceWith(b.cloneNode(true));
        document
          .getElementById("account-btn")
          .addEventListener("click", () =>
            document.getElementById("account-sidebar").classList.add("open")
          );
        document.getElementById("user-email").textContent = u.email;
      } else {
        b.textContent = "Log In";
        b.style.backgroundColor = "#0a66c2";
        b.style.color = "white";
        b.style.border = "none";
        b.style.cursor = "pointer";
        b.id = "log-in";
        b.replaceWith(b.cloneNode(true));
        document
          .getElementById("log-in")
          .addEventListener(
            "click",
            () => (window.location.href = "login.html")
          );
        document.getElementById("account-sidebar").classList.remove("open");
      }
    });
    document
      .getElementById("btn-logout") // logout button
      .addEventListener("click", () => auth.signOut());
    document
      .getElementById("close-sidebar") // close sidebar button
      .addEventListener("click", () =>
        document.getElementById("account-sidebar").classList.remove("open")
      );
    document
      .getElementById("close-comments") // close comments button
      .addEventListener("click", () =>
        document.getElementById("comments-sidebar").classList.remove("open")
      );
    fetchAndProcessArticles();
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", onReady);
  else onReady();
}
