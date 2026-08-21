let selectedType = "Product Insert";

document.querySelectorAll(".type-option").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".type-option").forEach((b) => b.classList.remove("active"));
    button.classList.add("active");
    selectedType = button.dataset.type;
  });
});

document.getElementById("analyzeBtn").addEventListener("click", () => {
  const content = document.getElementById("content").value.trim();

  if (!content) {
    alert("Please paste the content you want checked.");
    return;
  }

  // Validation event hooks.
  // Replace these console events later with Plausible/GA4 if desired.
  console.log("LAUNCHGUARD_CHECK_STARTED", {
    type: selectedType,
    contentLength: content.length
  });

  document.getElementById("resultBox").classList.remove("hidden");
  document.getElementById("resultBox").scrollIntoView({ behavior: "smooth", block: "center" });
});

document.getElementById("requestBtn").addEventListener("click", () => {
  console.log("LAUNCHGUARD_REVIEW_REQUESTED", { type: selectedType });

  // For the first validation version we deliberately avoid building a backend.
  // Replace this with Formspree, a custom endpoint, or checkout later.
  window.location.href =
    "mailto:YOUR_EMAIL_HERE?subject=" +
    encodeURIComponent("LAUNCHGUARD manual risk review request") +
    "&body=" +
    encodeURIComponent(
      "I would like a manual LAUNCHGUARD compliance risk review.\n\nContent type: " +
      selectedType +
      "\n\nPlease reply with the next step."
    );
});
