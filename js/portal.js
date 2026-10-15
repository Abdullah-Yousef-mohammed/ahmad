(function () {
  var flash = null;

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function dateLabel(iso) {
    if (!iso) return "Not recorded";
    var date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "Not recorded";
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  function parseRoute() {
    var parts = location.hash.replace(/^#/, "").split("/").filter(Boolean).map(decodeURIComponent);
    return { name: parts[0] || "login", parts: parts.slice(1) };
  }

  function homeFor(role) {
    if (role === "university") return "#university";
    if (role === "employer") return "#employer";
    return "#student";
  }

  var NEXT = "educhain-verify-next";

  function go(hash) {
    if (location.hash === hash) render();
    else location.hash = hash;
  }

  function rememberNext(hash) {
    if (!hash || hash === "#login" || hash === "#register" || hash === "#forgot" || hash === "#confirm") return;
    sessionStorage.setItem(NEXT, hash);
  }

  function takeNext(role) {
    var next = sessionStorage.getItem(NEXT) || "";
    var allowed = next.indexOf("#verify/") === 0
      || (role === "student" && next.indexOf("#student") === 0)
      || (role === "university" && next.indexOf("#university") === 0)
      || (role === "employer" && (next.indexOf("#employer") === 0 || next.indexOf("#verify") === 0));
    if (allowed) sessionStorage.removeItem(NEXT);
    return allowed ? next : homeFor(role);
  }

  function navLink(hash, label) {
    var current = location.hash || "#login";
    var on = hash === "#student"
      ? current === "#student" || current.indexOf("#student/credential") === 0 || current.indexOf("#student/share") === 0
      : hash === "#university"
        ? current === "#university" || current.indexOf("#university/") === 0
        : current === hash;
    return '<a href="' + hash + '"' + (on ? ' aria-current="page"' : "") + ">" + esc(label) + "</a>";
  }

  function deskSwitch() {
    return '<span class="demo-switch">' +
      deskButton("Student", "ahmad@educhain.edu") +
      deskButton("University", "registrar@educhain.edu") +
      deskButton("Employer", "hr@educhain.edu") +
      "</span>";
  }

  function deskButton(label, email) {
    return '<button class="btn btn-ghost" type="button" data-action="switch-desk" data-email="' + esc(email) + '">' + esc(label) + "</button>";
  }

  function pill(status) {
    var label = status || "pending";
    return '<span class="pill status-' + esc(label) + '">' + esc(label) + "</span>";
  }

  function alertHtml() {
    if (!flash) return "";
    var html = '<div class="alert alert-' + (flash.type === "ok" ? "ok" : "error") + '" role="alert">' + esc(flash.text) + "</div>";
    flash = null;
    return html;
  }

  function bar(user) {
    var links = user
      ? user.role === "student"
        ? navLink("#student", "Wallet") + navLink("#student/new", "Add credential")
        : user.role === "university"
          ? navLink("#university", "Review queue")
          : navLink("#employer", "Verify")
      : navLink("#login", "Sign in") + navLink("#register", "Register") + navLink("#forgot", "Forgot password");
    var logo = user && user.org === "Universiti Tunku Abdul Rahman" ? utarLogo(true) : "";
    var session = user ? "<span>" + esc(user.name) + " · " + esc(user.role) + "</span>" : "";
    return (
      '<header class="app-bar">' +
      '<div class="app-top">' +
      '<a class="brand" href="index.html"><img src="assets/logo.svg" alt="" width="42" height="42"><span><strong>EduChain Verify</strong><small>Working portal</small></span></a>' +
      '<div class="app-links">' + logo + session +
      '<a href="index.html">Website</a>' +
      (user ? '<button class="btn btn-ghost" type="button" data-action="logout">Log out</button>' : "") +
      "</div></div>" +
      '<div class="app-bottom">' +
      '<nav class="app-nav" aria-label="Portal">' + links + "</nav>" +
      '<div class="app-links">' + deskSwitch() +
      '<button class="btn btn-ghost" type="button" data-action="reset">Restore demo records</button>' +
      "</div></div></header>"
    );
  }

  function renderLogin(message) {
    return (
      '<section class="panel"><p class="eyebrow">Sign in</p><h1>Open your desk</h1>' +
      (message ? '<p class="alert alert-error" role="alert">' + esc(message) + "</p>" : "") +
      '<p>Use a prepared account, or register a new student, university, or employer.</p>' +
      '<div class="demo-grid">' +
      demoButton("Student", "ahmad@educhain.edu") +
      demoButton("University", "registrar@educhain.edu") +
      demoButton("Employer", "hr@educhain.edu") +
      "</div>" +
      '<form class="form-grid" data-form="login">' +
      field("Email", "email", "login-email", "email") +
      field("Password", "password", "login-password", "password") +
      '<button class="btn btn-navy" type="submit">Sign in</button></form>' +
      '<p><a href="#register">Create a new account</a> · <a href="#forgot">Forgot password</a></p></section>'
    );
  }

  function renderConfirmIdle() {
    return '<section class="panel"><p class="eyebrow">Identity check</p><h1>No identity check is waiting</h1>' +
      '<p>A new student confirms a code immediately after registration. The prepared student account is already confirmed.</p>' +
      '<p><a href="#register">Create a student account</a> · <a href="#login">Sign in</a></p></section>';
  }

  function renderForgot() {
    return '<section class="panel"><p class="eyebrow">Password</p><h1>Prepared accounts use one password</h1>' +
      '<p>This demonstration does not send email. The three presentation accounts all use <strong>Demo@2026</strong>.</p>' +
      '<ul class="rules"><li>ahmad@educhain.edu</li><li>registrar@educhain.edu</li><li>hr@educhain.edu</li></ul>' +
      '<p><a href="#login">Back to sign in</a></p></section>';
  }

  function renderConfirm(user) {
    return '<section class="panel"><p class="eyebrow">Identity check</p><h1>Confirm this digital identity</h1>' +
      '<p>A live service would send this code by another channel. Here it stays on the screen so the class can finish the check.</p>' +
      '<p class="score" id="identity-code">' + esc(user.identityCode) + "</p>" +
      '<p class="meta">' + esc(user.identityId) + " · " + esc(user.email) + "</p>" +
      '<form class="form-grid" data-form="confirm">' +
      '<label for="identity-confirm">Enter the code</label><input id="identity-confirm" name="code" inputmode="numeric" required>' +
      '<button class="btn btn-navy" type="submit">Confirm identity</button></form></section>';
  }

  function demoButton(label, email) {
    return '<button type="button" data-action="fill-demo" data-email="' + esc(email) + '" data-password="Demo@2026"><strong>' +
      esc(label) + "</strong><br><span class=\"meta\">" + esc(email) + "<br>Demo@2026</span></button>";
  }

  function field(label, name, id, type, value) {
    return '<label for="' + id + '">' + esc(label) + '</label><input id="' + id + '" name="' + name + '" type="' + type + '" value="' + esc(value || "") + '" required>';
  }

  function renderRegister() {
    return (
      '<section class="panel"><p class="eyebrow">Registration</p><h1>Create an account and a digital identity</h1>' +
      '<form class="form-grid" data-form="register" id="register-form">' +
      '<div class="demo-grid" role="radiogroup" aria-label="Account type">' +
      roleChoice("student", "Student", true) +
      roleChoice("university", "University", false) +
      roleChoice("employer", "Employer", false) +
      "</div>" +
      '<label for="reg-name">Full name</label><input id="reg-name" name="name" required>' +
      '<label for="reg-email">Email</label><input id="reg-email" name="email" type="email" required>' +
      '<label for="reg-password">Password</label><input id="reg-password" name="password" type="password" minlength="6" required>' +
      '<div data-show="student"><label for="reg-number">Student number</label><input id="reg-number" name="studentNo" required></div>' +
      '<div data-show="org" hidden><label for="reg-org" id="org-label">Institution</label><input id="reg-org" name="org"></div>' +
      '<button class="btn btn-navy" type="submit">Create account</button></form>' +
      '<p class="meta">A new university account is marked authorised in this demonstration so the class can issue a credential. A live service would check the organisation before that right is granted.</p>' +
      '<p><a href="#login">I already have an account</a></p></section>'
    );
  }

  function roleChoice(value, label, checked) {
    return '<label><input type="radio" name="role" value="' + value + '"' + (checked ? " checked" : "") + "> " + label + "</label>";
  }

  function guard(user, role, html) {
    if (!user) {
      rememberNext(location.hash);
      return renderLogin("Sign in to open this desk.");
    }
    if (EduStore.needsIdentity(user)) return renderConfirm(user);
    if (user.role !== role) {
      rememberNext(location.hash);
      return '<section class="panel"><h1>This desk belongs to another role</h1><p>You are signed in as ' + esc(user.name) + " (" + esc(user.role) + ').</p><p>Use the desk switch in the header. It opens this screen when the role matches.</p></section>';
    }
    return html();
  }

  function renderStudent(user, parts) {
    if (parts[0] === "new") return renderRequest(user);
    if (parts[0] === "credential") return renderCredential(user, parts[1], false);
    if (parts[0] === "share") return renderShare(parts[1]);
    var items = EduStore.forStudent(user.email);
    var cards = items.map(function (item) {
      return '<a class="cred-item" href="#student/credential/' + encodeURIComponent(item.id) + '"><span><strong>' + esc(item.qualification) + "</strong><br><span class=\"meta\">" + esc(item.id) + "</span></span>" + pill(item.status) + "</a>";
    }).join("") || "<p>No credentials yet. Submit one for the university to review.</p>";
    return (
      identityCard(user) +
      '<section class="panel"><div class="card-top"><h1>My credentials</h1><a class="btn btn-gold" href="#student/new">Add credential</a></div>' +
      '<div class="cred-list">' + cards + "</div></section>"
    );
  }

  function identityCard(user) {
    return '<section class="identity-card"><p class="eyebrow">Digital identity</p><div class="identity-head"><div><h1>' + esc(user.name) + "</h1><p>" + esc(user.identityId) + "</p><p class=\"meta\">Student number " + esc(user.studentNo) + " · " + esc(user.email) + "</p></div><div class=\"seal\">Owned<br>by<br>student</div></div></section>";
  }

  function renderRequest(user) {
    return '<section class="panel"><p class="eyebrow">New submission</p><h1>Send a credential to the issuer</h1>' +
      '<form class="form-grid" data-form="request">' +
      '<label for="qual">Qualification</label><input id="qual" name="qualification" required>' +
      '<label for="inst">Institution</label><input id="inst" name="institution" value="' + esc(user.org || "Universiti Tunku Abdul Rahman") + '" required>' +
      '<label for="year">Award year</label><input id="year" name="year" value="2026" required>' +
      '<label for="skills">Skills, separated by commas</label><input id="skills" name="skills" placeholder="Research, Writing">' +
      '<label for="file">Document</label><input id="file" name="file" type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx">' +
      '<label for="doc-name">Document name used for the fraud check</label><input id="doc-name" name="documentName" placeholder="bba-certificate.pdf">' +
      '<p class="meta">The file stays on this computer. The fraud check uses the document name. Include the word “tamper” to see a high-risk result that a person must review.</p>' +
      '<button class="btn btn-navy" type="submit">Submit for review</button></form></section>';
  }

  function renderCredential(user, id) {
    var credential = EduStore.getCredential(id);
    if (!credential || credential.studentEmail !== user.email) {
      return '<section class="panel"><h1>Credential not in this wallet</h1><p><a href="#student">Back to my credentials</a></p></section>';
    }
    return '<section class="panel">' + credentialBody(credential) +
      '<div class="btn-row"><a class="btn btn-gold" href="#student/share/' + encodeURIComponent(credential.id) + '">Share QR code</a><a class="btn btn-ghost" href="#student">Back to wallet</a></div></section>';
  }

  function utarLogo(compact) {
    return '<img class="' + (compact ? "uni-logo-bar" : "uni-logo") + '" src="assets/utar-logo.jpg" alt="Universiti Tunku Abdul Rahman" width="107" height="54">';
  }

  function credentialBody(credential) {
    var skills = (credential.skills || []).map(function (skill) { return "<span>" + esc(skill) + "</span>"; }).join("");
    var logo = credential.institution === "Universiti Tunku Abdul Rahman" ? utarLogo() : "";
    return '<div class="card-top"><div><p class="eyebrow">Credential</p><h1>' + esc(credential.qualification) + "</h1></div>" + pill(credential.status) + "</div>" +
      logo +
      row("Credential ID", credential.id) +
      row("Learner", credential.studentName) +
      row("Identity", "did:edu:" + credential.studentNo) +
      row("Institution", credential.institution) +
      row("Award year", credential.year) +
      row("Owner", credential.owner) +
      row("Token", credential.tokenId || "Minted when the institution issues") +
      row("Contract", credential.contractStatus) +
      row("Ledger transaction", credential.txId || "Not written yet") +
      (credential.revokeTxId ? row("Revocation transaction", credential.revokeTxId) : "") +
      row("Issued", dateLabel(credential.issuedAt)) +
      '<div class="kv"><span>Verified skills</span><div class="chips">' + (skills || "<span>None listed</span>") + "</div></div>" +
      '<p class="note">The personal document is not stored on a public chain. The ledger keeps the identifier, the proof, and the status.</p>' +
      eventsHtml(credential);
  }

  function row(label, value) {
    return '<div class="kv"><span>' + esc(label) + "</span><strong>" + esc(value) + "</strong></div>";
  }

  function eventsHtml(credential) {
    var items = (credential.events || []).map(function (event) {
      return "<li class=\"event\">" + esc(dateLabel(event.at)) + " — " + esc(event.summary) + (event.txId ? " · " + esc(event.txId) : "") + "</li>";
    }).join("");
    return "<h2>Record</h2><ul class=\"rules\">" + items + "</ul>";
  }

  function renderShare(id) {
    var credential = EduStore.getCredential(id);
    var user = EduStore.session();
    if (!credential || !user || credential.studentEmail !== user.email) {
      return '<section class="panel"><h1>Nothing to share</h1></section>';
    }
    var link = EduStore.shareUrl(credential.id);
    return '<section class="panel two-col"><div><p class="eyebrow">Share</p><h1>' + esc(credential.qualification) + "</h1><p>An employer can scan this code or open the link. They will see the current status, including a later revocation.</p>" +
      row("Credential ID", credential.id) +
      '<label for="share-link">Share link</label><input id="share-link" readonly value="' + esc(link) + '">' +
      '<div class="btn-row"><button class="btn btn-navy" type="button" data-action="copy" data-value="' + esc(link) + '">Copy link</button><a class="btn btn-ghost" href="#student/credential/' + encodeURIComponent(credential.id) + '">Back</a></div><p id="copy-status" class="meta"></p></div>' +
      '<div><div id="qrcode" class="qr-box" data-value="' + esc(link) + '"></div></div></section>';
  }

  function renderUniversity(user, parts) {
    if (parts[0] === "review") return renderReview(user, parts[1]);
    var data = EduStore.read();
    var pending = data.credentials.filter(function (item) { return item.status === "pending"; });
    var issued = data.credentials.filter(function (item) { return item.status === "verified" || item.status === "revoked"; });
    var logo = user.org === "Universiti Tunku Abdul Rahman" ? utarLogo() : "";
    return '<section class="panel">' + logo + '<p class="eyebrow">' + esc(user.org) + '</p><h1>Issuer desk</h1><p>' + (user.authorised ? "This account is authorised to issue and revoke." : "This account cannot issue yet.") + "</p>" +
      "<h2>Waiting for review</h2>" + listCreds(pending, "#university/review/") +
      "<h2>Issued records</h2>" + issued.map(function (item) {
        return '<div class="cred-item"><span><strong>' + esc(item.qualification) + '</strong><br><span class="meta">' + esc(item.studentName) + " · " + esc(item.id) + "</span></span><span>" + pill(item.status) +
          (item.status === "verified" ? ' <button class="btn btn-danger" type="button" data-action="revoke" data-id="' + esc(item.id) + '">Revoke</button>' : "") + "</span></div>";
      }).join("") + "</section>";
  }

  function listCreds(items, href) {
    if (!items.length) return "<p>Nothing is waiting.</p>";
    return '<div class="cred-list">' + items.map(function (item) {
      return '<a class="cred-item" href="' + href + encodeURIComponent(item.id) + '"><span><strong>' + esc(item.qualification) + '</strong><br><span class="meta">' + esc(item.studentName) + " · " + esc(item.id) + "</span></span>" + pill(item.status) + "</a>";
    }).join("") + "</div>";
  }

  function renderReview(user, id) {
    var result = EduStore.review(id);
    if (!result.ok) return '<section class="panel"><h1>Submission missing</h1><p>' + esc(result.error) + "</p></section>";
    var credential = EduStore.getCredential(id);
    var rules = EduStore.contractRules(credential, user);
    var high = credential.ai && credential.ai.level === "high";
    var ruleHtml = rules.map(function (rule) {
      return '<li class="' + (rule.ok ? "pass" : "fail") + '">' + (rule.ok ? "Pass" : "Stop") + " — " + esc(rule.label) + "</li>";
    }).join("");
    var reasons = (credential.ai.reasons || []).map(function (reason) { return "<li>" + esc(reason) + "</li>"; }).join("");
    var issueForm = credential.status === "pending"
      ? '<form data-form="issue" class="stack"><input type="hidden" name="id" value="' + esc(credential.id) + '">' +
        (high ? '<label><input type="checkbox" name="acknowledge"> I reviewed this warning. The institution, not the model, makes the decision.</label>' : "") +
        '<div class="btn-row"><button class="btn btn-navy" type="submit">Record issuance</button><button class="btn btn-ghost" type="button" data-action="reject" data-id="' + esc(credential.id) + '">Return to student</button></div></form>'
      : "";
    return '<section class="two-col"><article class="panel"><p class="eyebrow">AI fraud check</p><h1>' + esc(credential.qualification) + "</h1>" +
      '<p class="score">' + esc(credential.ai.score) + '</p><p>Anomaly score out of 100. ' + esc(credential.ai.level === "high" ? "High risk. Do not treat this as a pass." : "Low risk. Still confirm the award before issuing.") + "</p>" +
      "<ul class=\"rules\">" + reasons + "</ul><p class=\"note\">The final hiring or awarding decision stays with a person.</p></article>" +
      '<article class="panel"><p class="eyebrow">Smart contract</p><h2>' + esc(credential.contractStatus) + "</h2><ul class=\"rules\">" + ruleHtml + "</ul>" +
      row("Learner", credential.studentName) + row("File name", credential.fileName || "No file name supplied") +
      row("Transaction", credential.txId || "Written when you record issuance") + issueForm +
      '<p><a href="#university">Back to the desk</a></p></article></section>';
  }

  function renderEmployer(user) {
    var checks = EduStore.read().checks.map(function (item) {
      return "<li>" + esc(item.id) + " · " + esc(item.status) + " · " + esc(dateLabel(item.at)) + "</li>";
    }).join("");
    return '<section class="panel"><p class="eyebrow">' + esc(user.org) + '</p><h1>Check a credential</h1>' +
      '<form class="verify-bar" data-form="verify"><div><label for="check-id">Credential ID</label><input id="check-id" name="id" placeholder="EDU-2026-00125" required></div><button class="btn btn-navy" type="submit">Verify</button></form>' +
      "<h2>Recent checks</h2>" + (checks ? "<ul class=\"rules\">" + checks + "</ul>" : "<p>No checks yet.</p>") + "</section>";
  }

  function renderVerify(id) {
    var credential = EduStore.getCredential(id);
    if (!credential) {
      return '<section class="panel"><h1>No credential found</h1><p>There is no EduChain Verify record for <strong>' + esc(id || "that identifier") + "</strong>.</p>" +
        '<form class="verify-bar" data-form="verify"><div><label for="again">Try another ID</label><input id="again" name="id" required></div><button class="btn btn-navy" type="submit">Verify</button></form></section>';
    }
    EduStore.recordCheck(credential.id, credential.status);
    var headline = credential.status === "verified"
      ? "This credential is verified."
      : credential.status === "revoked"
        ? "This credential has been revoked."
        : credential.status === "rejected"
          ? "The institution returned this submission."
          : "This credential is not issued yet.";
    return '<section class="panel"><p class="eyebrow">Employer verification</p><h1>' + headline + "</h1>" + credentialBody(credential) +
      '<form class="verify-bar" data-form="verify"><div><label for="again-id">Check another ID</label><input id="again-id" name="id" required></div><button class="btn btn-navy" type="submit">Verify</button></form></section>';
  }

  function render() {
    var route = parseRoute();
    var user = EduStore.session();
    var main = "";
    if (route.name === "register") main = renderRegister();
    else if (route.name === "forgot") main = renderForgot();
    else if (route.name === "confirm") main = user && EduStore.needsIdentity(user) ? renderConfirm(user) : renderConfirmIdle();
    else if (route.name === "verify") main = renderVerify(route.parts[0]);
    else if (route.name === "student") main = guard(user, "student", function () { return renderStudent(user, route.parts); });
    else if (route.name === "university") main = guard(user, "university", function () { return renderUniversity(user, route.parts); });
    else if (route.name === "employer") main = guard(user, "employer", function () { return renderEmployer(user); });
    else main = renderLogin();
    document.getElementById("app").innerHTML = bar(user) + alertHtml() + main;
    document.title = "Portal · EduChain Verify";
    paintQr();
    window.scrollTo(0, 0);
  }

  function paintQr() {
    var box = document.getElementById("qrcode");
    if (!box || typeof QRCode === "undefined") return;
    var value = box.getAttribute("data-value");
    box.innerHTML = "";
    new QRCode(box, { text: value, width: 180, height: 180, colorDark: "#17345A", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.M });
  }

  function syncRoleFields() {
    var form = document.getElementById("register-form");
    if (!form) return;
    var role = new FormData(form).get("role");
    var student = form.querySelector("[data-show='student']");
    var org = form.querySelector("[data-show='org']");
    var studentInput = form.querySelector("[name='studentNo']");
    var orgInput = form.querySelector("[name='org']");
    student.hidden = role !== "student";
    org.hidden = role === "student";
    studentInput.required = role === "student";
    orgInput.required = role !== "student";
    document.getElementById("org-label").textContent = role === "employer" ? "Company" : "Institution";
  }

  document.addEventListener("change", function (event) {
    if (event.target.name === "role") syncRoleFields();
  });

  document.addEventListener("click", function (event) {
    var button = event.target.closest("[data-action]");
    if (!button) return;
    var action = button.getAttribute("data-action");
    if (action === "fill-demo") {
      document.getElementById("login-email").value = button.getAttribute("data-email");
      document.getElementById("login-password").value = button.getAttribute("data-password");
      return;
    }
    if (action === "switch-desk") {
      var switched = EduStore.login(button.getAttribute("data-email"), "Demo@2026");
      if (!switched.ok) {
        flash = { type: "error", text: switched.error };
        render();
        return;
      }
      flash = { type: "ok", text: "Signed in as " + switched.user.name + "." };
      go(takeNext(switched.user.role));
      return;
    }
    if (action === "logout") {
      sessionStorage.removeItem(NEXT);
      EduStore.clearSession();
      flash = { type: "ok", text: "You are signed out." };
      go("#login");
      return;
    }
    if (action === "reset") {
      EduStore.reset();
      flash = { type: "ok", text: "Demo records were restored." };
      go("#login");
      return;
    }
    if (action === "copy") {
      var value = button.getAttribute("data-value");
      var input = document.getElementById("share-link");
      var mark = function (ok) {
        var status = document.getElementById("copy-status");
        if (status) status.textContent = ok ? "Link copied." : "Select the link above and copy it.";
      };
      var legacyCopy = function () {
        if (!input) { mark(false); return; }
        input.focus();
        input.select();
        try { mark(document.execCommand("copy")); }
        catch (err) { mark(false); }
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(value).then(function () { mark(true); }).catch(legacyCopy);
      } else legacyCopy();
      return;
    }
    if (action === "revoke") {
      var revoked = EduStore.revoke(button.getAttribute("data-id"), EduStore.session());
      flash = revoked.ok ? { type: "ok", text: "The credential is now revoked. The next employer check will show that status." } : { type: "error", text: revoked.error };
      render();
      return;
    }
    if (action === "reject") {
      var rejected = EduStore.reject(button.getAttribute("data-id"));
      flash = rejected.ok ? { type: "ok", text: "The submission was returned without issuance." } : { type: "error", text: rejected.error };
      go("#university");
    }
  });

  document.addEventListener("submit", function (event) {
    var form = event.target.closest("[data-form]");
    if (!form) return;
    event.preventDefault();
    var data = new FormData(form);
    var kind = form.getAttribute("data-form");
    if (kind === "login") {
      var signed = EduStore.login(data.get("email"), data.get("password"));
      if (!signed.ok) {
        flash = { type: "error", text: signed.error };
        render();
        return;
      }
      if (EduStore.needsIdentity(signed.user)) {
        flash = { type: "ok", text: "Enter the identity code to open the wallet." };
        go("#confirm");
        return;
      }
      flash = { type: "ok", text: "Signed in as " + signed.user.name + "." };
      go(takeNext(signed.user.role));
      return;
    }
    if (kind === "confirm") {
      var confirmed = EduStore.confirmIdentity(data.get("code"));
      if (!confirmed.ok) {
        flash = { type: "error", text: confirmed.error };
        render();
        return;
      }
      flash = { type: "ok", text: "Identity confirmed. The wallet is open." };
      go(takeNext("student"));
      return;
    }
    if (kind === "register") {
      var created = EduStore.register({
        role: data.get("role"),
        name: data.get("name"),
        email: data.get("email"),
        password: data.get("password"),
        studentNo: data.get("studentNo"),
        org: data.get("org")
      });
      if (!created.ok) {
        flash = { type: "error", text: created.error };
        render();
        return;
      }
      if (created.user.role === "student") {
        flash = { type: "ok", text: "Digital identity " + created.user.identityId + " is ready. Confirm it with the code on this screen." };
        go("#confirm");
        return;
      }
      flash = { type: "ok", text: "Account created for " + created.user.org + "." };
      go(takeNext(created.user.role));
      return;
    }
    if (kind === "request") {
      var file = form.querySelector("[name='file']").files[0];
      var submitted = EduStore.submitRequest(EduStore.session(), {
        qualification: data.get("qualification"),
        institution: data.get("institution"),
        year: data.get("year"),
        skills: data.get("skills"),
        fileName: file ? file.name : data.get("documentName")
      });
      if (!submitted.ok) {
        flash = { type: "error", text: submitted.error };
        render();
        return;
      }
      flash = { type: "ok", text: "Submitted. The university can now review " + submitted.credential.id + "." };
      go("#student/credential/" + encodeURIComponent(submitted.credential.id));
      return;
    }
    if (kind === "verify") {
      go("#verify/" + encodeURIComponent(String(data.get("id") || "").trim()));
      return;
    }
    if (kind === "issue") {
      var issued = EduStore.issue(data.get("id"), EduStore.session(), data.get("acknowledge") === "on");
      if (!issued.ok) {
        flash = { type: "error", text: issued.error };
        render();
        return;
      }
      flash = { type: "ok", text: "Issued. Transaction " + issued.credential.txId + " and token " + issued.credential.tokenId + " now belong to the student." };
      render();
    }
  });

  window.addEventListener("hashchange", render);
  if (!location.hash) location.hash = "#login";
  else render();
})();
