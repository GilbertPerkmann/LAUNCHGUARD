let selectedType = "Product Insert";

document.querySelectorAll(".type-option").forEach((button) => {
  button.addEventListener("click", () => {
    document
      .querySelectorAll(".type-option")
      .forEach((b) => b.classList.remove("active"));

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

  console.log("LAUNCHGUARD_CHECK_STARTED", {
    type: selectedType,
    contentLength: content.length
  });

  document.getElementById("resultBox").classList.remove("hidden");

  document.getElementById("resultBox").scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
});

document.getElementById("requestBtn").addEventListener("click", () => {
  const content = document.getElementById("content").value.trim();

  console.log("LAUNCHGUARD_REVIEW_REQUESTED", {
    type: selectedType,
    contentLength: content.length
  });

  const subject = "LAUNCHGUARD Risk Review";

  const body =
    "I would like a manual LAUNCHGUARD compliance risk review.\n\n" +
    "Content type: " +
    selectedType +
    "\n\n" +
    "Content to review:\n" +
    content +
    "\n\n" +
    "Please reply with the next step.";

  window.location.href =
    "mailto:gilbertperkmann@yahoo.de?subject=" +
    encodeURIComponent(subject) +
    "&body=" +
    encodeURIComponent(body);
});