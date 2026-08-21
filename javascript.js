"use strict";

const API_URL =
  "https://script.google.com/macros/s/AKfycbzZ3S5YxfGJWtr1Q54J0ve6Y0-d2bb1nJfs2P-opBD046XEBDvXXNqM8VTMD-g7YTmi/exec";

let selectedType = "Product Insert";

const typeButtons = document.querySelectorAll(".type-option");
const contentInput = document.getElementById("content");
const analyzeBtn = document.getElementById("analyzeBtn");
const resultBox = document.getElementById("resultBox");
const requestBtn = document.getElementById("requestBtn");


// --------------------------------------------------
// CONTENT TYPE
// --------------------------------------------------

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


// --------------------------------------------------
// ANALYZE BUTTON
// --------------------------------------------------

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

  resultBox.classList.remove("hidden");

  createEmailField();

  resultBox.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
});


// --------------------------------------------------
// CREATE EMAIL FIELD
// --------------------------------------------------

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


// --------------------------------------------------
// REQUEST REVIEW
// --------------------------------------------------

requestBtn.addEventListener("click", async () => {
  const content = contentInput.value.trim();

  const emailInput =
    document.getElementById("reviewEmail");

  const email =
    emailInput ? emailInput.value.trim() : "";

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

  const payload = {
    email: email,
    contentType: selectedType,
    content: content,
    source: "LAUNCHGUARD"
  };

  console.log(
    "LAUNCHGUARD_REVIEW_REQUESTED",
    {
      type: selectedType,
      contentLength: content.length
    }
  );

  const originalButtonText =
    requestBtn.textContent;

  requestBtn.disabled = true;
  requestBtn.textContent = "Sending...";

  try {
    /*
      mode: "no-cors" is intentional.

      Google Apps Script web apps do not behave like a
      normal REST API for cross-origin browser requests.

      We send JSON as text/plain to avoid a CORS preflight.
    */

    await fetch(API_URL, {
      method: "POST",
      mode: "no-cors",

      headers: {
        "Content-Type":
          "text/plain;charset=utf-8"
      },

      body: JSON.stringify(payload)
    });

    showSuccessMessage();

  } catch (error) {
    console.error(
      "LAUNCHGUARD_SUBMISSION_ERROR",
      error
    );

    requestBtn.disabled = false;
    requestBtn.textContent =
      originalButtonText;

    alert(
      "Something went wrong. Please try again."
    );
  }
});


// --------------------------------------------------
// SUCCESS MESSAGE
// --------------------------------------------------

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


// --------------------------------------------------
// EMAIL VALIDATION
// --------------------------------------------------

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}