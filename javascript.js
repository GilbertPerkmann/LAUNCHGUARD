"use strict";

let selectedType = "Product Insert";

const typeButtons = document.querySelectorAll(".type-option");
const contentInput = document.getElementById("content");
const analyzeBtn = document.getElementById("analyzeBtn");
const resultBox = document.getElementById("resultBox");
const requestBtn = document.getElementById("requestBtn");

typeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    typeButtons.forEach((item) => {
      item.classList.remove("active");
    });

    button.classList.add("active");
    selectedType = button.dataset.type || "Product Insert";
  });
});

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

  resultBox.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
});

requestBtn.addEventListener("click", () => {
  const content = contentInput.value.trim();

  if (!content) {
    alert("Please paste the content you want reviewed.");
    contentInput.focus();
    return;
  }

  console.log("LAUNCHGUARD_REVIEW_REQUESTED", {
    type: selectedType,
    contentLength: content.length
  });

  const recipient = "gilbertperkmann@yahoo.de";
  const subject = "LAUNCHGUARD Risk Review";

  const body = [
    "I would like a manual LAUNCHGUARD compliance risk review.",
    "",
    `Content type: ${selectedType}`,
    "",
    "Content to review:",
    content,
    "",
    "Please reply with the next step."
  ].join("\n");

  const mailtoUrl =
    `mailto:${recipient}` +
    `?subject=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(body)}`;

  window.location.href = mailtoUrl;
});