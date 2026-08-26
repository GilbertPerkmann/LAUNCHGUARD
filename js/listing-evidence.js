"use strict";

// ==================================================
// LAUNCHGUARD V0.11
// LISTING + EVIDENCE
// SECURE BACKEND SUBMISSION
// Stores the per-submission access token locally so
// the next screen can retrieve only this submission.
// ==================================================

const form =
  document.getElementById("listingEvidenceForm");

const formMessage =
  document.getElementById("formMessage");

const continueBtn =
  document.getElementById("continueBtn");

const fileInputs =
  document.querySelectorAll(".file-input");


// ==================================================
// LOCAL STORAGE HELPERS
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


function getProductData() {

  return readLocalData(
    "launchguard_product_setup"
  );
}


// ==================================================
// PRODUCT SUMMARY
// ==================================================

function formatMarketplace(value) {

  const marketplaces = {
    "amazon-de": "Amazon.de",
    "amazon-it": "Amazon.it",
    "amazon-fr": "Amazon.fr",
    "amazon-es": "Amazon.es",
    "amazon-nl": "Amazon.nl",
    "amazon-pl": "Amazon.pl",
    "amazon-se": "Amazon.se",
    "amazon-be": "Amazon.com.be",
    "amazon-uk": "Amazon.co.uk",
    "amazon-us": "Amazon.com"
  };

  return marketplaces[value] || value || "—";
}


function formatCategory(value) {

  const categories = {
    "electronics": "Electronics",
    "electrical-equipment":
      "Electrical equipment",
    "supplements":
      "Food supplements",
    "food": "Food",
    "cosmetics":
      "Cosmetics / Beauty",
    "toys": "Toys",
    "baby": "Baby products",
    "household":
      "Household products",
    "sports":
      "Sports & Outdoors",
    "tools":
      "Tools & Home Improvement",
    "other": "Other"
  };

  return categories[value] || value || "—";
}


function renderProductSummary() {

  const productData =
    getProductData();

  if (!productData) {

    showError(
      "Product Setup data is missing. Please return to Product Setup."
    );

    continueBtn.disabled = true;

    return;
  }


  document
    .getElementById("summaryProductName")
    .textContent =
    productData.productName || "—";


  document
    .getElementById("summaryMarketplace")
    .textContent =
    formatMarketplace(
      productData.marketplace
    );


  document
    .getElementById("summaryCategory")
    .textContent =
    formatCategory(
      productData.category
    );
}


// ==================================================
// FILE DISPLAY
// ==================================================

function updateFileName(input) {

  const display =
    document.querySelector(
      `[data-file-name="${input.id}"]`
    );

  if (!display) {
    return;
  }


  if (
    !input.files ||
    input.files.length === 0
  ) {

    display.textContent =
      "No file selected";

    display.classList.remove(
      "selected"
    );

    return;
  }


  const file =
    input.files[0];


  display.textContent =
    file.name;


  display.classList.add(
    "selected"
  );
}


fileInputs.forEach((input) => {

  input.addEventListener(
    "change",
    () => {

      updateFileName(input);

    }
  );

});


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


function clearError() {

  formMessage.textContent = "";

  formMessage.classList.add(
    "hidden"
  );

  formMessage.classList.remove(
    "error"
  );
}


// ==================================================
// VALIDATION
// ==================================================

function validateForm() {

  clearError();


  const productData =
    getProductData();


  if (!productData) {

    showError(
      "Product Setup data is missing."
    );

    return false;
  }


  const listingTitle =
    document
      .getElementById("listingTitle")
      .value
      .trim();


  const bulletPoints =
    document
      .getElementById("bulletPoints")
      .value
      .trim();


  const description =
    document
      .getElementById("description")
      .value
      .trim();


  if (!listingTitle) {

    showError(
      "Please add the planned Amazon listing title."
    );

    document
      .getElementById("listingTitle")
      .focus();

    return false;
  }


  if (!bulletPoints) {

    showError(
      "Please add the planned bullet points."
    );

    document
      .getElementById("bulletPoints")
      .focus();

    return false;
  }


  if (!description) {

    showError(
      "Please add the planned product description."
    );

    document
      .getElementById("description")
      .focus();

    return false;
  }


  return true;
}


// ==================================================
// COLLECT LISTING
// ==================================================

function collectListingData() {

  return {

    listingTitle:
      document
        .getElementById("listingTitle")
        .value
        .trim(),

    bulletPoints:
      document
        .getElementById("bulletPoints")
        .value
        .trim(),

    description:
      document
        .getElementById("description")
        .value
        .trim(),

    additionalNotes:
      document
        .getElementById("additionalNotes")
        .value
        .trim(),

    updatedAt:
      new Date().toISOString()

  };
}


// ==================================================
// EVIDENCE METADATA
// ==================================================

function collectEvidenceMetadata() {

  const evidence = {};


  fileInputs.forEach((input) => {

    if (
      input.files &&
      input.files.length > 0
    ) {

      const file =
        input.files[0];


      evidence[input.id] = {

        name:
          file.name,

        type:
          file.type,

        size:
          file.size,

        lastModified:
          file.lastModified

      };

    } else {

      evidence[input.id] = null;

    }

  });


  return evidence;
}


// ==================================================
// SAVE LOCAL COPY
// ==================================================

function saveLocalListingData(
  listingData,
  evidence
) {

  const localData = {

    ...listingData,

    evidence:
      evidence

  };


  localStorage.setItem(
    "launchguard_listing_evidence",
    JSON.stringify(localData)
  );
}


// ==================================================
// BUILD MULTIPART REQUEST
// ==================================================

function buildSubmissionFormData(
  productData,
  listingData
) {

  const formData =
    new FormData();


  formData.append(
    "product",
    JSON.stringify(productData)
  );


  formData.append(
    "listing",
    JSON.stringify(listingData)
  );


  fileInputs.forEach((input) => {

    if (
      input.files &&
      input.files.length > 0
    ) {

      formData.append(
        input.name,
        input.files[0]
      );

    }

  });


  return formData;
}


// ==================================================
// SEND TO BACKEND
// ==================================================

async function submitToBackend(
  productData,
  listingData
) {

  const formData =
    buildSubmissionFormData(
      productData,
      listingData
    );


  const response =
    await fetch(
      "/api/submissions",
      {
        method: "POST",
        body: formData
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
    !result.ok
  ) {

    throw new Error(
      result.error ||
      "Submission could not be stored."
    );

  }


  if (
    !result.checkId ||
    !result.accessToken
  ) {

    throw new Error(
      "The server did not return the required secure submission credentials."
    );

  }


  return result;
}


// ==================================================
// CREATE LOCAL CHECK RECORD
// ==================================================

function createLocalCheckRecord(
  checkId,
  accessToken,
  productData,
  listingData,
  evidence
) {

  return {

    checkId:
      checkId,

    accessToken:
      accessToken,

    status:
      "SUBMITTED_FOR_REVIEW",

    reviewMode:
      "MANUAL_VALIDATION",

    product:
      productData,

    listing: {
      listingTitle:
        listingData.listingTitle,

      bulletPoints:
        listingData.bulletPoints,

      description:
        listingData.description,

      additionalNotes:
        listingData.additionalNotes || ""
    },

    evidence:
      evidence,

    createdAt:
      new Date().toISOString()

  };
}


// ==================================================
// RESTORE LISTING TEXT
// ==================================================

function restoreListingData() {

  const data =
    readLocalData(
      "launchguard_listing_evidence"
    );


  if (!data) {
    return;
  }


  if (data.listingTitle) {

    document
      .getElementById("listingTitle")
      .value =
      data.listingTitle;
  }


  if (data.bulletPoints) {

    document
      .getElementById("bulletPoints")
      .value =
      data.bulletPoints;
  }


  if (data.description) {

    document
      .getElementById("description")
      .value =
      data.description;
  }


  if (data.additionalNotes) {

    document
      .getElementById("additionalNotes")
      .value =
      data.additionalNotes;
  }
}


// ==================================================
// SUBMIT
// ==================================================

form.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();


    if (!validateForm()) {
      return;
    }


    const productData =
      getProductData();


    const listingData =
      collectListingData();


    const evidence =
      collectEvidenceMetadata();


    saveLocalListingData(
      listingData,
      evidence
    );


    const originalButtonText =
      continueBtn.textContent;


    continueBtn.disabled = true;

    continueBtn.textContent =
      "Uploading & saving...";


    try {

      const result =
        await submitToBackend(
          productData,
          listingData
        );


      console.log(
        "LAUNCHGUARD_BACKEND_SUBMISSION_SUCCESS",
        {
          ok:
            result.ok,

          checkId:
            result.checkId,

          status:
            result.status,

          analysisVersion:
            result.analysisVersion,

          fileCount:
            result.fileCount,

          accessTokenReceived:
            Boolean(
              result.accessToken
            )
        }
      );


      const checkRecord =
        createLocalCheckRecord(
          result.checkId,
          result.accessToken,
          productData,
          listingData,
          evidence
        );


      localStorage.setItem(
        "launchguard_current_check",
        JSON.stringify(
          checkRecord
        )
      );


      localStorage.setItem(
        "launchguard_backend_submission",
        JSON.stringify({
          checkId:
            result.checkId,

          accessToken:
            result.accessToken,

          status:
            result.status,

          analysisVersion:
            result.analysisVersion || null,

          submittedAt:
            new Date().toISOString()
        })
      );


      window.location.href =
        "prelaunch-check.html";


    } catch (error) {

      console.error(
        "LAUNCHGUARD_BACKEND_SUBMISSION_ERROR",
        error
      );


      continueBtn.disabled = false;

      continueBtn.textContent =
        originalButtonText;


      showError(
        "The submission could not be stored: " +
        error.message
      );

    }

  }
);


// ==================================================
// INITIALIZE
// ==================================================

renderProductSummary();

restoreListingData();