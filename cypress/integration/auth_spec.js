// ignore harmful exceptions
Cypress.on("uncaught:exception", (err) => {
  if (
    /describe is not defined|context is not defined|firebase is not defined|auth is not defined/.test(
      err.message
    )
  ) {
    return false;
  }
});

// block firebase sdk for mocking
beforeEach(() => {
  cy.intercept("GET", "https://www.gstatic.com/firebasejs/**", { body: "" });
});

// comment button behavior
describe("Comment button behavior", () => {
  beforeEach(() => {
    cy.visit("/", {
      onBeforeLoad(win) {
        win.fetch = () =>
          Promise.resolve({
            json: () =>
              Promise.resolve({
                response: {
                  docs: [
                    {
                      _id: "foo",
                      headline: { main: "Test Title" },
                      abstract: "Test",
                    },
                  ],
                },
              }),
          });

        win._fakeAuth = {
          currentUser: null,
          _cb: null,
          onAuthStateChanged(cb) {
            this._cb = cb;
            cb(this.currentUser);
          },
          signInWithEmailAndPassword: () => Promise.resolve(),
          signOut: () => Promise.resolve(),
        };

        win._fakeDb = {
          collection: () => ({
            where: () => ({
              onSnapshot: (cb) => cb({ size: 0, forEach: () => {} }),
              orderBy: () => ({
                onSnapshot: (cb) => cb({ size: 0, forEach: () => {} }),
              }),
            }),
          }),
        };

        win.firebase = {
          initializeApp: () => {},
          auth: () => win._fakeAuth,
          firestore: () => win._fakeDb,
        };
      },
    });
  });

  it("1) when not logged in, clicking comment redirects to login.html", () => {
    cy.get(".comment-button", { timeout: 10000 }).should("exist").click();
    cy.url().should("include", "login.html");
  });

  it("2) when logged in, clicking comment opens the comments sidebar", () => {
    cy.window().then((win) => {
      win._fakeAuth.currentUser = { uid: "u1", email: "u1@example.com" };
      win._fakeAuth._cb(win._fakeAuth.currentUser);
    });
    cy.get(".comment-button", { timeout: 10000 }).click();
    cy.get("#comments-sidebar", { timeout: 10000 }).should(
      "have.class",
      "open"
    );
  });
});

// login page behavior
describe("Login page behavior", () => {
  beforeEach(() => {
    cy.visit("login.html", {
      onBeforeLoad(win) {
        win._fakeAuth = {
          currentUser: null,
          _cb: null,
          onAuthStateChanged(cb) {
            this._cb = cb;
            cb(this.currentUser);
          },
          signInWithEmailAndPassword: () =>
            Promise.reject(new Error("Invalid credentials")),
          signOut: () => Promise.resolve(),
        };
        win.firebase = { initializeApp: () => {}, auth: () => win._fakeAuth };
      },
    });
  });

  it("3) invalid credentials on login page do not grant access", () => {
    cy.get("#email").type("wrong@example.com");
    cy.get("#password").type("badpassword");
    cy.get("#btn-login").click();
    cy.url().should("include", "login.html");
    cy.get("#msg").should("contain", "Invalid credentials");
  });

  it("4) valid credentials on login page redirect to index.html", () => {
    cy.window().then((win) => {
      win._fakeAuth.signInWithEmailAndPassword = () => Promise.resolve();
    });
    cy.get("#email").type("user@example.com");
    cy.get("#password").type("goodpass");
    cy.get("#btn-login").click();
    cy.url().should("include", "index.html");
  });
});

// comment posting test
describe("Comment posting", () => {
  beforeEach(() => {
    cy.visit("/", {
      onBeforeLoad(win) {
        // stub the NYT fetch
        win.fetch = () =>
          Promise.resolve({
            json: () =>
              Promise.resolve({
                response: {
                  docs: [
                    { _id: "a1", headline: { main: "Title" }, abstract: "" },
                  ],
                },
              }),
          });

        // fake auth as logged-in user
        win._fakeAuth = {
          currentUser: { uid: "u1", email: "user@example.com" },
          _cb: null,
          onAuthStateChanged(cb) {
            this._cb = cb;
            cb(this.currentUser);
          },
          signInWithEmailAndPassword: () => Promise.resolve(),
          signOut: () => Promise.resolve(),
        };

        // spy on add (for posting comments)
        const addSpy = cy.spy().as("addComment");
        const fakeCollection = {
          add: addSpy,
          where: () => ({
            onSnapshot: (cb) => cb({ size: 0, forEach: () => {} }),
            orderBy: () => ({
              onSnapshot: (cb) => cb({ size: 0, forEach: () => {} }),
            }),
          }),
          orderBy: () => ({
            onSnapshot: (cb) => cb({ size: 0, forEach: () => {} }),
          }),
        };
        win._fakeDb = { collection: () => fakeCollection };

        win.firebase = {
          initializeApp: () => {},
          auth: () => win._fakeAuth,
          firestore: () => win._fakeDb,
        };
        win.firebase.firestore.FieldValue = {
          serverTimestamp: () => new Date(),
        };
      },
    });
    // open comments sidebar
    cy.get(".comment-button", { timeout: 10000 }).click();
  });

  it("5) allows a logged-in user to post a comment", () => {
    const text = "This is my test comment";
    cy.get("#comment-input").click().type(text);
    cy.get("#comment-submit").click();
    cy.get("#comment-input").should("have.value", "");
    cy.get("@addComment").should("have.been.calledOnceWith", {
      text,
      email: "user@example.com",
      articleId: "a1",
      timestamp: Cypress.sinon.match.date,
    });
  });
});
