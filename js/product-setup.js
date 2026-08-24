"use strict";

// ==================================================
// LAUNCHGUARD V0.1
// PRODUCT SETUP
// ==================================================

const form =
  document.getElementById("productSetupForm");

const formMessage =
  document.getElementById("formMessage");

const continueBtn =
  document.getElementById("continueBtn");


// ==================================================
// HELPERS
// ==================================================

function getSelectedRadio(name) {

  const selected =
    document.querySelector(
      `input[name="${name}"]:checked`
    );

  return selected
    ? selected.value
    : "";
}


function showError(message) {

  formMessage.textContent = message;

  formMessage.classList.remove("hidden");

  formMessage.classList.add("error");

  formMessage.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });

}


function clearError() {

  formMessage.textContent = "";

  formMessage.classList.add("hidden");

  formMessage.classList.remove("error");

}


// ==================================================
// VALIDATION
// ==================================================

function validateForm() {

  clearError();

  const productName =
    document
      .getElementById("productName")
      .value
      .trim();

  const marketplace =
    document
      .getElementById("marketplace")
      .value;

  const manufacturerCountry =
    document
      .getElementById("manufacturerCountry")
      .value;

  const category =
    document
      .getElementById("category")
      .value;

  const customerType =
    getSelectedRadio("customerType");

  const electrical =
    getSelectedRadio("electrical");

  const battery =
    getSelectedRadio("battery");

  const wireless =
    getSelectedRadio("wireless");


  if (!productName) {

    showError(
      "Please enter the product name."
    );

    document
      .getElementById("productName")
      .focus();

    return false;
  }


  if (!marketplace) {

    showError(
      "Please select the Amazon marketplace."
    );

    document
      .getElementById("marketplace")
      .focus();

    return false;
  }


  if (!manufacturerCountry) {

    showError(
      "Please select the manufacturer country."
    );

    document
      .getElementById("manufacturerCountry")
      .focus();

    return false;
  }


  if (!category) {

    showError(
      "Please select the product category."
    );

    document
      .getElementById("category")
      .focus();

    return false;
  }


  if (!customerType) {

    showError(
      "Please select the intended customer type."
    );

    return false;
  }


  if (!electrical) {

    showError(
      "Please tell us whether the product is electrical."
    );

    return false;
  }


  if (!battery) {

    showError(
      "Please tell us whether the product contains or uses a battery."
    );

    return false;
  }


  if (!wireless) {

    showError(
      "Please tell us whether the product uses wireless technology."
    );

    return false;
  }


  return true;
}


// ==================================================
// COLLECT PRODUCT DATA
// ==================================================

function collectProductData() {

  return {

    productName:
      document
        .getElementById("productName")
        .value
        .trim(),

    marketplace:
      document
        .getElementById("marketplace")
        .value,

    manufacturerCountry:
      document
        .getElementById("manufacturerCountry")
        .value,

    category:
      document
        .getElementById("category")
        .value,

    customerType:
      getSelectedRadio("customerType"),

    electrical:
      getSelectedRadio("electrical"),

    battery:
      getSelectedRadio("battery"),

    wireless:
      getSelectedRadio("wireless"),

    createdAt:
      new Date().toISOString()

  };
}


// ==================================================
// SAVE PRODUCT DATA
// ==================================================

function saveProductData(productData) {

  localStorage.setItem(
    "launchguard_product_setup",
    JSON.stringify(productData)
  );


  console.log(
    "LAUNCHGUARD_PRODUCT_SETUP_SAVED",
    productData
  );

}


// ==================================================
// RESTORE EXISTING DATA
// ==================================================

function restoreProductData() {

  const saved =
    localStorage.getItem(
      "launchguard_product_setup"
    );


  if (!saved) {
    return;
  }


  try {

    const productData =
      JSON.parse(saved);


    if (productData.productName) {

      document
        .getElementById("productName")
        .value =
        productData.productName;

    }


    if (productData.marketplace) {

      document
        .getElementById("marketplace")
        .value =
        productData.marketplace;

    }


    if (productData.manufacturerCountry) {

      document
        .getElementById("manufacturerCountry")
        .value =
        productData.manufacturerCountry;

    }


    if (productData.category) {

      document
        .getElementById("category")
        .value =
        productData.category;

    }


    restoreRadio(
      "customerType",
      productData.customerType
    );

    restoreRadio(
      "electrical",
      productData.electrical
    );

    restoreRadio(
      "battery",
      productData.battery
    );

    restoreRadio(
      "wireless",
      productData.wireless
    );


  } catch (error) {

    console.warn(
      "LAUNCHGUARD_PRODUCT_SETUP_RESTORE_ERROR",
      error
    );

  }

}


function restoreRadio(
  name,
  value
) {

  if (!value) {
    return;
  }


  const input =
    document.querySelector(
      `input[name="${name}"][value="${value}"]`
    );


  if (input) {

    input.checked = true;

  }

}


// ==================================================
// FORM SUBMIT
// ==================================================

form.addEventListener(
  "submit",
  (event) => {

    event.preventDefault();


    if (!validateForm()) {

      return;

    }


    const productData =
      collectProductData();


    saveProductData(
      productData
    );


    continueBtn.disabled = true;

    continueBtn.textContent =
      "Continue...";


    window.location.href =
      "listing-evidence.html";

  }
);


// ==================================================
// INITIALIZE
// ==================================================

restoreProductData();