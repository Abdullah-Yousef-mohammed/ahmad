(function () {
  var KEY = "educhain-verify-v1";
  var SESSION = "educhain-verify-session";

  function seed() {
    return {
      users: [
        {
          id: "usr_student",
          role: "student",
          name: "Muhammad Ahmad",
          email: "ahmad@educhain.edu",
          password: "Demo@2026",
          org: "",
          studentNo: "110060461",
          identityId: "did:edu:110060461",
          identityVerified: true,
          identityCode: "",
          authorised: false,
          createdAt: "2026-09-01T02:00:00.000Z"
        },
        {
          id: "usr_uni",
          role: "university",
          name: "Registrar Office",
          email: "registrar@educhain.edu",
          password: "Demo@2026",
          org: "Universiti Tunku Abdul Rahman",
          studentNo: "",
          identityId: "",
          authorised: true,
          createdAt: "2026-08-15T02:00:00.000Z"
        },
        {
          id: "usr_hr",
          role: "employer",
          name: "HR Partner",
          email: "hr@educhain.edu",
          password: "Demo@2026",
          org: "Northstar Hiring",
          studentNo: "",
          identityId: "",
          authorised: false,
          createdAt: "2026-08-20T02:00:00.000Z"
        }
      ],
      credentials: [
        {
          id: "EDU-2026-00125",
          studentEmail: "ahmad@educhain.edu",
          studentName: "Muhammad Ahmad",
          studentNo: "110060461",
          qualification: "Bachelor of Business Administration",
          institution: "Universiti Tunku Abdul Rahman",
          skills: ["Business Analysis", "Communication", "Digital Marketing"],
          year: "2026",
          fileName: "bba-certificate.pdf",
          status: "verified",
          issuedAt: "2026-06-12T04:00:00.000Z",
          txId: "0x82FA91C4E17B8D30",
          revokeTxId: "",
          tokenId: "#EDU10245",
          owner: "Muhammad Ahmad",
          contractStatus: "Issued",
          ai: {
            score: 11,
            level: "low",
            reasons: [
              "Issuer name matches a registered institution.",
              "Award date and certificate number use a consistent format.",
              "No overlay or splicing artifacts were detected.",
              "A signature block is present."
            ]
          },
          events: [
            { type: "submitted", at: "2026-06-10T04:00:00.000Z", summary: "Learner submitted the credential for issuance." },
            { type: "ai-checked", at: "2026-06-11T04:00:00.000Z", summary: "Low anomaly score 11. Human review still required." },
            { type: "issued", at: "2026-06-12T04:00:00.000Z", summary: "Smart contract recorded the issuance.", txId: "0x82FA91C4E17B8D30" }
          ]
        },
        {
          id: "EDU-2026-00188",
          studentEmail: "ahmad@educhain.edu",
          studentName: "Muhammad Ahmad",
          studentNo: "110060461",
          qualification: "Certificate in Blockchain Fundamentals",
          institution: "Universiti Tunku Abdul Rahman",
          skills: ["Blockchain basics", "Digital ownership"],
          year: "2026",
          fileName: "blockchain-certificate.pdf",
          status: "pending",
          issuedAt: "",
          txId: "",
          revokeTxId: "",
          tokenId: "",
          owner: "Muhammad Ahmad",
          contractStatus: "Awaiting issuer",
          ai: null,
          events: [
            { type: "submitted", at: "2026-10-12T04:00:00.000Z", summary: "Learner submitted the credential for issuance." }
          ]
        }
      ],
      checks: []
    };
  }

  function write(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
    return data;
  }

  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return write(seed());
      var data = JSON.parse(raw);
      if (!data || !Array.isArray(data.users) || !Array.isArray(data.credentials)) return write(seed());
      if (!Array.isArray(data.checks)) data.checks = [];
      return data;
    } catch (err) {
      return write(seed());
    }
  }

  function reset() {
    localStorage.removeItem(SESSION);
    return write(seed());
  }

  function session() {
    var email = localStorage.getItem(SESSION);
    if (!email) return null;
    return read().users.find(function (user) { return user.email === email; }) || null;
  }

  function setSession(email) {
    localStorage.setItem(SESSION, email);
  }

  function clearSession() {
    localStorage.removeItem(SESSION);
  }

  function needsIdentity(user) {
    return !!(user && user.role === "student" && user.identityVerified === false);
  }

  function confirmIdentity(code) {
    var current = session();
    if (!needsIdentity(current)) return { ok: false, error: "This account does not have an identity check waiting." };
    if (String(code || "").trim() !== current.identityCode) {
      return { ok: false, error: "That code does not match the one shown on this screen." };
    }
    var data = read();
    var user = data.users.find(function (item) { return item.email === current.email; });
    user.identityVerified = true;
    user.identityCode = "";
    write(data);
    return { ok: true, user: user };
  }

  function normalEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function validEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function login(email, password) {
    var user = read().users.find(function (item) { return item.email === normalEmail(email); });
    if (!user || user.password !== password) {
      return { ok: false, error: "Those details do not match an EduChain Verify account." };
    }
    setSession(user.email);
    return { ok: true, user: user };
  }

  function register(fields) {
    var data = read();
    var email = normalEmail(fields.email);
    var role = fields.role;
    if (["student", "university", "employer"].indexOf(role) === -1) {
      return { ok: false, error: "Choose a student, university, or employer account." };
    }
    if (!String(fields.name || "").trim() || !validEmail(email) || String(fields.password || "").length < 6) {
      return { ok: false, error: "Enter a name, a valid email, and a password of at least 6 characters." };
    }
    if (role === "student" && !String(fields.studentNo || "").trim()) {
      return { ok: false, error: "A student number is required to create a digital identity." };
    }
    if (role !== "student" && !String(fields.org || "").trim()) {
      return { ok: false, error: "Enter the organisation this account represents." };
    }
    if (data.users.some(function (user) { return user.email === email; })) {
      return { ok: false, error: "An account with this email already exists. Sign in instead." };
    }
    var studentNo = String(fields.studentNo || "").trim();
    var user = {
      id: "usr_" + Date.now(),
      role: role,
      name: String(fields.name).trim(),
      email: email,
      password: fields.password,
      org: String(fields.org || "").trim(),
      studentNo: studentNo,
      identityId: role === "student" ? "did:edu:" + studentNo : "",
      identityVerified: role !== "student",
      identityCode: role === "student" ? String(100000 + Math.floor(Math.random() * 900000)) : "",
      authorised: role === "university",
      createdAt: new Date().toISOString()
    };
    data.users.push(user);
    write(data);
    setSession(user.email);
    return { ok: true, user: user };
  }

  function makeTx(label) {
    var n = 2166136261;
    var source = label + ":" + Date.now();
    for (var i = 0; i < source.length; i++) {
      n ^= source.charCodeAt(i);
      n = Math.imul(n, 16777619);
    }
    var stamp = (Date.now() % 0xffffffff).toString(16).toUpperCase();
    return "0x" + (n >>> 0).toString(16).toUpperCase().padStart(8, "0") + stamp.padStart(8, "0");
  }

  function nextToken(data) {
    var count = data.credentials.filter(function (item) { return item.tokenId; }).length;
    return "#EDU" + (10245 + count);
  }

  function nextId(data) {
    var year = new Date().getFullYear();
    var id = "";
    do {
      id = "EDU-" + year + "-" + String(Math.floor(10000 + Math.random() * 89999));
    } while (data.credentials.some(function (item) { return item.id === id; }));
    return id;
  }

  function getCredential(id) {
    var key = String(id || "").trim().toLowerCase();
    if (!key) return null;
    return read().credentials.find(function (item) { return item.id.toLowerCase() === key; }) || null;
  }

  function updateCredential(id, mutator) {
    var data = read();
    var index = data.credentials.findIndex(function (item) { return item.id.toLowerCase() === String(id).toLowerCase(); });
    if (index === -1) return { ok: false, error: "That credential could not be found." };
    var result = mutator(data.credentials[index], data) || { ok: true };
    if (result.ok === false) return result;
    write(data);
    return { ok: true, credential: data.credentials[index] };
  }

  function analyse(credential) {
    var tampered = /tamper|edited|fake/i.test(credential.fileName || "");
    if (tampered) {
      return {
        score: 78,
        level: "high",
        reasons: [
          "Overlay text was detected around the award date.",
          "The issuer seal does not match the registered institution mark.",
          "The file hash differs from the copy held by the institution."
        ]
      };
    }
    return {
      score: 11,
      level: "low",
      reasons: [
        "Issuer name matches a registered institution.",
        "Award date and certificate number use a consistent format.",
        "No overlay or splicing artifacts were detected.",
        "A signature block is present."
      ]
    };
  }

  function submitRequest(user, fields) {
    if (!user || user.role !== "student") return { ok: false, error: "Only a student wallet can submit a credential." };
    var qualification = String(fields.qualification || "").trim();
    var institution = String(fields.institution || "").trim();
    var year = String(fields.year || "").trim();
    if (!qualification || !institution || !year) {
      return { ok: false, error: "Qualification, institution, and award year are required." };
    }
    var data = read();
    var skills = String(fields.skills || "").split(",").map(function (item) { return item.trim(); }).filter(Boolean);
    var credential = {
      id: nextId(data),
      studentEmail: user.email,
      studentName: user.name,
      studentNo: user.studentNo,
      qualification: qualification,
      institution: institution,
      skills: skills,
      year: year,
      fileName: String(fields.fileName || "").trim(),
      status: "pending",
      issuedAt: "",
      txId: "",
      revokeTxId: "",
      tokenId: "",
      owner: user.name,
      contractStatus: "Awaiting issuer",
      ai: null,
      events: [
        { type: "submitted", at: new Date().toISOString(), summary: "Learner submitted the credential for issuance." }
      ]
    };
    data.credentials.unshift(credential);
    write(data);
    return { ok: true, credential: credential };
  }

  function review(id) {
    return updateCredential(id, function (credential) {
      if (credential.status !== "pending") return { ok: true };
      if (!credential.ai) {
        credential.ai = analyse(credential);
        credential.events.push({
          type: "ai-checked",
          at: new Date().toISOString(),
          summary: (credential.ai.level === "high" ? "High" : "Low") + " anomaly score " + credential.ai.score + ". Human review still required."
        });
      }
      return { ok: true };
    });
  }

  function contractRules(credential, issuer) {
    var data = read();
    var learner = data.users.find(function (user) { return user.email === credential.studentEmail && user.role === "student"; });
    var duplicate = data.credentials.some(function (item) {
      return item.id !== credential.id && item.status === "verified" && item.studentEmail === credential.studentEmail && item.qualification === credential.qualification;
    });
    return [
      { ok: !!(issuer && issuer.authorised), label: "Issuer account is an authorised institution." },
      { ok: !!(learner && learner.identityId), label: "Learner digital identity is on file." },
      { ok: credential.qualification.length > 3, label: "Credential type is allowed for issuance." },
      { ok: !duplicate, label: "No active duplicate of this qualification exists." }
    ];
  }

  function issue(id, issuer, acknowledge) {
    var rules = null;
    var result = updateCredential(id, function (credential) {
      if (credential.status !== "pending") return { ok: false, error: "Only a pending credential can be issued." };
      if (!credential.ai) credential.ai = analyse(credential);
      rules = contractRules(credential, issuer);
      if (rules.some(function (rule) { return !rule.ok; })) {
        return { ok: false, error: "The smart contract stopped issuance because an issuer rule failed." };
      }
      if (credential.ai.level === "high" && !acknowledge) {
        return { ok: false, error: "The AI check is high risk. A person at the institution must review it before issuance." };
      }
      var txId = makeTx(credential.id);
      credential.status = "verified";
      credential.issuedAt = new Date().toISOString();
      credential.txId = txId;
      credential.tokenId = nextToken(read());
      credential.contractStatus = "Issued";
      credential.events.push({
        type: "issued",
        at: credential.issuedAt,
        summary: "Smart contract recorded the issuance.",
        txId: txId
      });
      return { ok: true };
    });
    result.rules = rules;
    return result;
  }

  function revoke(id, issuer) {
    if (!issuer || !issuer.authorised) return { ok: false, error: "Only an authorised institution can revoke a credential." };
    return updateCredential(id, function (credential) {
      if (credential.status !== "verified") return { ok: false, error: "Only a verified credential can be revoked." };
      credential.status = "revoked";
      credential.revokeTxId = makeTx(credential.id + ":revoke");
      credential.contractStatus = "Revoked";
      credential.events.push({
        type: "revoked",
        at: new Date().toISOString(),
        summary: "Authorised issuer revoked the credential.",
        txId: credential.revokeTxId
      });
      return { ok: true };
    });
  }

  function reject(id) {
    return updateCredential(id, function (credential) {
      if (credential.status !== "pending") return { ok: false, error: "That submission is no longer pending." };
      credential.status = "rejected";
      credential.contractStatus = "Returned";
      credential.events.push({
        type: "rejected",
        at: new Date().toISOString(),
        summary: "The institution returned the submission without issuance."
      });
      return { ok: true };
    });
  }

  function recordCheck(id, status) {
    var data = read();
    data.checks.unshift({ id: id, status: status, at: new Date().toISOString() });
    data.checks = data.checks.slice(0, 8);
    write(data);
  }

  function forStudent(email) {
    return read().credentials.filter(function (item) { return item.studentEmail === email; });
  }

  window.EduStore = {
    read: read,
    reset: reset,
    session: session,
    clearSession: clearSession,
    login: login,
    register: register,
    needsIdentity: needsIdentity,
    confirmIdentity: confirmIdentity,
    getCredential: getCredential,
    submitRequest: submitRequest,
    review: review,
    contractRules: contractRules,
    issue: issue,
    revoke: revoke,
    reject: reject,
    recordCheck: recordCheck,
    forStudent: forStudent,
    shareUrl: function (id) {
      var url = new URL("portal.html", window.location.href);
      url.hash = "verify/" + encodeURIComponent(id);
      return url.href;
    }
  };
})();
