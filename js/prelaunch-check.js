"use strict";

// ==================================================
// LAUNCHGUARD V0.12
// PRE-LAUNCH CHECK
// SECURE SERVER-BACKED SUBMISSION
// ==================================================

const runCheckBtn =
  document.getElementById(
    "runCheckBtn"
  );

const formMessage =
  document.getElementById(
    "formMessage"
  );

let currentSubmission = null;


// ==================================================
// LOCAL STORAGE
// ==================================================

function readLocalData(key) {

  const saved =
    localStorage.getItem(key);


  if (!saved) {
    return null;
  }


  try {

    return JSON.parse(saved);

  } catch (error) {

    console.warn(
      "LAUNCHGUARD_LOCAL_DATA_READ_ERROR",
      key,
      error
    );

    return null;
  }
}


// ==================================================
// FORMATTERS
// ==================================================

function formatMarketplace(value) {

  const marketplaces = {

    "amazon-de":
      "Amazon.de",

    "amazon-it":
      "Amazon.it",

    "amazon-fr":
      "Amazon.fr",

    "amazon-es":
      "Amazon.es",

    "amazon-nl":
      "Amazon.nl",

    "amazon-pl":
      "Amazon.pl",

    "amazon-se":
      "Amazon.se",

    "amazon-be":
      "Amazon.com.be",

    "amazon-uk":
      "Amazon.co.uk",

    "amazon-us":
      "Amazon.com"

  };


  return (
    marketplaces[value] ||
    value ||
    "—"
  );
}


function formatCategory(value) {

  const categories = {

    "electronics":
      "Electronics",

    "electrical-equipment":
      "Electrical equipment",

    "supplements":
      "Food supplements",

    "food":
      "Food",

    "cosmetics":
      "Cosmetics / Beauty",

    "toys":
      "Toys",

    "baby":
      "Baby products",

    "household":
      "Household products",

    "sports":
      "Sports & Outdoors",

    "tools":
      "Tools & Home Improvement",

    "other":
      "Other"

  };


  return (
    categories[value] ||
    value ||
    "—"
  );
}


function formatCustomer(value) {

  if (value === "consumer") {
    return "Consumer";
  }


  if (value === "b2b") {
    return "B2B";
  }


  return value || "—";
}


function formatYesNo(value) {

  if (value === "yes") {
    return "Yes";
  }


  if (value === "no") {
    return "No";
  }


  return "—";
}


// ==================================================
// MESSAGE
// ==================================================

function showError(message) {

  formMessage.textContent =
    message;


  formMessage.classList.remove(
    "hidden"
  );


  formMessage.classList.add(
    "error"
  );


  formMessage.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
}


// ==================================================
// GET BACKEND SUBMISSION CREDENTIALS
// ==================================================

function getBackendSubmissionCredentials() {

  const backendSubmission =
    readLocalData(
      "launchguard_backend_submission"
    );


  if (
    !backendSubmission ||
    !backendSubmission.checkId ||
    !backendSubmission.accessToken
  ) {

    return null;
  }


  return {
    checkId:
      backendSubmission.checkId,

    accessToken:
      backendSubmission.accessToken
  };
}


// ==================================================
// FETCH REAL SUBMISSION
// ==================================================

async function fetchSubmission(
  checkId,
  accessToken
) {

  if (
    !checkId ||
    !accessToken
  ) {

    throw new Error(
      "Secure submission credentials are missing."
    );

  }


  const response =
    await fetch(
      `/api/submissions/${encodeURIComponent(checkId)}`,
      {
        method:
          "GET",

        headers: {
          Authorization:
            `Bearer ${accessToken}`,

          Accept:
            "application/json"
        },

        cache:
          "no-store"
      }
    );


  let result = null;


  try {

    result =
      await response.json();

  } catch {

    throw new Error(
      "The server returned an invalid response."
    );

  }


  if (
    !response.ok ||
    !result.ok ||
    !result.submission
  ) {

    throw new Error(
      result.error ||
      "Submission could not be loaded."
    );

  }


  return result.submission;
}


// ==================================================
// RENDER PRODUCT
// ==================================================

function renderProduct(
  submission
) {

  const product =
    submission.product || {};


  document
    .getElementById(
      "checkProductName"
    )
    .textContent =
    product.productName || "—";


  document
    .getElementById(
      "checkMarketplace"
    )
    .textContent =
    formatMarketplace(
      product.marketplace
    );


  document
    .getElementById(
      "checkCategory"
    )
    .textContent =
    formatCategory(
      product.category
    );


  document
    .getElementById(
      "checkManufacturer"
    )
    .textContent =
    product.manufacturerCountry ||
    "—";


  document
    .getElementById(
      "checkCustomer"
    )
    .textContent =
    formatCustomer(
      product.customerType
    );


  document
    .getElementById(
      "checkElectrical"
    )
    .textContent =
    formatYesNo(
      product.electrical
    );


  document
    .getElementById(
      "checkBattery"
    )
    .textContent =
    formatYesNo(
      product.battery
    );


  document
    .getElementById(
      "checkWireless"
    )
    .textContent =
    formatYesNo(
      product.wireless
    );
}


// ==================================================
// RENDER LISTING
// ==================================================

function renderListing(
  submission
) {

  const listing =
    submission.listing || {};


  document
    .getElementById(
      "checkListingTitle"
    )
    .textContent =
    listing.listingTitle || "—";


  document
    .getElementById(
      "checkBulletPoints"
    )
    .textContent =
    listing.bulletPoints || "—";


  document
    .getElementById(
      "checkDescription"
    )
    .textContent =
    listing.description || "—";
}


// ==================================================
// EVIDENCE TYPES
// ==================================================

const evidenceTypes = [

  {
    key:
      "productLabel",

    label:
      "Product label"
  },

  {
    key:
      "packaging",

    label:
      "Packaging"
  },

  {
    key:
      "instructions",

    label:
      "Instructions / manual"
  },

  {
    key:
      "declaration",

    label:
      "Declaration of Conformity"
  },

  {
    key:
      "testReport",

    label:
      "Test report"
  },

  {
    key:
      "certificate",

    label:
      "Certificate"
  },

  {
    key:
      "otherDocument",

    label:
      "Other compliance document"
  }

];


// ==================================================
// RENDER REAL SERVER FILES
// ==================================================

function renderEvidence(
  submission
) {

  const container =
    document.getElementById(
      "evidenceReview"
    );


  container.innerHTML = "";


  const files =
    submission.files || {};


  evidenceTypes.forEach(
    (type) => {

      const file =
        files[type.key];


      const item =
        document.createElement(
          "div"
        );


      item.className =
        "evidence-review-item";


      const label =
        document.createElement(
          "strong"
        );


      label.textContent =
        type.label;


      const status =
        document.createElement(
          "span"
        );


      if (
        file &&
        file.originalName
      ) {

        item.classList.add(
          "available"
        );


        status.textContent =
          file.originalName;

      } else {

        item.classList.add(
          "missing"
        );


        status.textContent =
          "Not provided";
      }


      item.appendChild(
        label
      );


      item.appendChild(
        status
      );


      container.appendChild(
        item
      );

    }
  );
}


// ==================================================
// NORMALIZE SERVER FILES FOR REPORT
// ==================================================

function normalizeEvidence(
  files
) {

  const evidence = {};


  evidenceTypes.forEach(
    (
      type
    ) => {

      const file =
        files[type.key];


      if (
        file &&
        file.originalName
      ) {

        evidence[type.key] = {

          name:
            file.originalName,

          storedName:
            file.storedName,

          type:
            file.mimeType,

          size:
            file.size,

          textExtraction:
            file.textExtraction ||
            null,

          documentTypeAnalysis:
            file.documentTypeAnalysis ||
            null

        };

      } else {

        evidence[type.key] =
          null;

      }

    }
  );


  return evidence;
}


// ==================================================
// CREATE REPORT INPUT
// ==================================================

function createReportInput(
  submission
) {

  return {

    checkId:
      submission.checkId,

    status:
      submission.status,

    reviewMode:
      submission.reviewMode,

    analysisVersion:
      submission.analysisVersion ||
      "unknown",

    product:
      submission.product,

    listing:
      submission.listing,

    evidence:
      normalizeEvidence(
        submission.files || {}
      ),

    serverFiles:
      submission.files || {},

    createdAt:
      submission.createdAt

  };
}


// ==================================================
// RUN CHECK
// ==================================================

function runPreLaunchCheck() {

  if (!currentSubmission) {

    showError(
      "The server submission has not been loaded."
    );

    return;
  }


  const reportInput =
    createReportInput(
      currentSubmission
    );


  localStorage.setItem(
    "launchguard_current_check",
    JSON.stringify(
      reportInput
    )
  );


  console.log(
    "LAUNCHGUARD_REVIEW_INPUT_READY",
    reportInput
  );


  runCheckBtn.disabled = true;


  runCheckBtn.textContent =
    "Preparing review...";


  window.location.href =
    "risk-report.html";
}


// ==================================================
// INITIALIZE
// ==================================================

async function initialize() {

  const credentials =
    getBackendSubmissionCredentials();


  if (!credentials) {

    showError(
      "Secure submission credentials are missing. Please return to Listing & Evidence and submit the product again."
    );


    runCheckBtn.disabled = true;

    return;
  }


  runCheckBtn.disabled = true;


  runCheckBtn.textContent =
    "Loading submission...";


  try {

    const submission =
      await fetchSubmission(
        credentials.checkId,
        credentials.accessToken
      );


    currentSubmission =
      submission;


    console.log(
      "LAUNCHGUARD_SERVER_SUBMISSION_LOADED",
      {
        checkId:
          submission.checkId,

        status:
          submission.status,

        analysisVersion:
          submission.analysisVersion,

        fileCount:
          Object.keys(
            submission.files || {}
          ).length
      }
    );


    renderProduct(
      submission
    );


    renderListing(
      submission
    );


    renderEvidence(
      submission
    );


    runCheckBtn.disabled =
      false;


    runCheckBtn.textContent =
      "Run Pre-Launch Check";


  } catch (error) {

    console.error(
      "LAUNCHGUARD_SUBMISSION_LOAD_ERROR",
      error
    );


    showError(
      "The server submission could not be loaded: " +
      error.message
    );


    runCheckBtn.disabled =
      true;


    runCheckBtn.textContent =
      "Submission unavailable";
  }
}


// ==================================================
// EVENT
// ==================================================

runCheckBtn.addEventListener(
  "click",
  runPreLaunchCheck
);


// ==================================================
// START
// ==================================================

initialize();