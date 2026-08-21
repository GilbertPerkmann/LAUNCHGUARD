"use strict";

// ==================================================
// CONFIGURATION
// ==================================================

const API_URL =
  "https://script.google.com/macros/s/AKfycbzZ3S5YxfGJWtr1Q54J0ve6Y0-d2bb1nJfs2P-opBD046XEBDvXXNqM8VTMD-g7YTmi/exec";

let selectedType = "Product Insert";

// ==================================================
// DOM ELEMENTS
// ==================================================

const typeButtons = document.querySelectorAll(".type-option");
const contentInput = document.getElementById("content");
const analyzeBtn = document.getElementById("analyzeBtn");
const resultBox = document.getElementById("resultBox");
const requestBtn = document.getElementById("requestBtn");

// ==================================================
// PLAUSIBLE TRACKING
// ==================================================

function trackEvent(eventName, props = {}) {
  if (typeof window.plausible !== "function") {
    console.warn("PLAUSIBLE_NOT_AVAILABLE", eventName);
    return;
  }

  try {
    window.plausible(eventName, {
      props: props
    });

    console.log("PLAUSIBLE_EVENT", eventName, props);
  } catch (error) {
    console.warn("PLAUSIBLE_TRACKING_ERROR", eventName, error);
  }
}

// ==================================================
// CONTENT TYPE SELECTION
// ==================================================

typeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    typeButtons.forEach((item) => {
      item.classList.remove("active");
    });

    button.classList.add("active");

    selectedType =
      button.dataset.type || "Product Insert";
  });
});

// ==================================================
// ANALYZE / CHECK STARTED
// ==================================================

analyzeBtn.addEventListener("click", () => {
  const content = contentInput.value.trim();

  if (!content) {
    alert("Please paste the content you want checked.");
    contentInput.focus();
    return;
  }

  console.log("LAUNCHGUARD_CHECK_STARTED", {
    type: selectedType,
    contentLength: content.length
  });

  // Funnel step 1
  trackEvent("Check Started", {
    content_type: selectedType
  });

  resultBox.classList.remove("hidden");

  createEmailField();

  resultBox.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
});

// ==================================================
// CREATE EMAIL FIELD
// ==================================================

function createEmailField() {
  if (document.getElementById("reviewEmail")) {
    return;
  }

  const emailWrapper = document.createElement("div");
  emailWrapper.style.marginBottom = "12px";

  const label = document.createElement("label");
  label.setAttribute("for", "reviewEmail");
  label.textContent = "Your email";
  label.style.display = "block";
  label.style.fontWeight = "700";
  label.style.marginBottom = "6px";

  const input = document.createElement("input");

  input.type = "email";
  input.id = "reviewEmail";
  input.placeholder = "you@example.com";
  input.autocomplete = "email";
  input.required = true;

  input.style.width = "100%";
  input.style.padding = "12px";
  input.style.border = "1px solid #dce2ea";
  input.style.borderRadius = "10px";
  input.style.fontSize = "15px";
  input.style.boxSizing = "border-box";

  emailWrapper.appendChild(label);
  emailWrapper.appendChild(input);

  requestBtn.parentNode.insertBefore(
    emailWrapper,
    requestBtn
  );
}

// ==================================================
// REQUEST REVIEW
// ==================================================

requestBtn.addEventListener("click", async () => {
  const content = contentInput.value.trim();

  const emailInput =
    document.getElementById("reviewEmail");

  const email =
    emailInput ? emailInput.value.trim() : "";

  // ------------------------------------------------
  // VALIDATION
  // ------------------------------------------------

  if (!content) {
    alert("Please paste the content you want reviewed.");
    contentInput.focus();
    return;
  }

  if (!email || !isValidEmail(email)) {
    alert("Please enter a valid email address.");

    if (emailInput) {
      emailInput.focus();
    }

    return;
  }

  // ------------------------------------------------
  // PAYLOAD
  // ------------------------------------------------

  const payload = {
    email: email,
    contentType: selectedType,
    content: content,
    source: "LAUNCHGUARD"
  };

  console.log("LAUNCHGUARD_REVIEW_REQUESTED", {
    type: selectedType,
    contentLength: content.length
  });

  // Funnel step 2
  trackEvent("Review Requested", {
    content_type: selectedType
  });

  // ------------------------------------------------
  // BUTTON STATE
  // ------------------------------------------------

  const originalButtonText =
    requestBtn.textContent;

  requestBtn.disabled = true;
  requestBtn.textContent = "Sending...";

  // ------------------------------------------------
  // SEND TO GOOGLE APPS SCRIPT
  // ------------------------------------------------

  try {
    /*
      Google Apps Script is called using no-cors.

      Important:
      With mode: "no-cors", JavaScript receives an
      opaque response. Therefore the browser cannot
      verify the HTTP response status.

      A resolved fetch confirms that the request was
      dispatched, but not that Apps Script successfully
      processed or stored the submission.
    */

    await fetch(API_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload)
    });

    console.log("LAUNCHGUARD_REQUEST_DISPATCHED", {
      type: selectedType
    });

    // Funnel step 3
    trackEvent("Review Submitted", {
      content_type: selectedType
    });

    showSuccessMessage();

  } catch (error) {
    console.error(
      "LAUNCHGUARD_SUBMISSION_ERROR",
      error
    );

    trackEvent("Submission Error", {
      content_type: selectedType
    });

    requestBtn.disabled = false;
    requestBtn.textContent =
      originalButtonText;

    alert(
      "Something went wrong. Please try again."
    );
  }
});

// ==================================================
// SUCCESS MESSAGE
// ==================================================

function showSuccessMessage() {
  resultBox.innerHTML = `
    <div class="result-icon">✓</div>

    <div>
      <h3>Review request received</h3>

      <p>
        Thank you. Your content has been submitted
        for a manual LAUNCHGUARD compliance risk review.
      </p>

      <p>
        We will contact you at the email address
        you provided.
      </p>
    </div>
  `;

  resultBox.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
}

// ==================================================
// EMAIL VALIDATION
// ==================================================

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}