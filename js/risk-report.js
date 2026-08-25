"use strict";

// ==================================================
// LAUNCHGUARD V0.9.1
// RISK REPORT
//
// Uses:
// - server-backed submission data
// - weighted document-type analysis
// - wattage consistency analysis
// - manufacturer-country consistency analysis
// - model-number consistency analysis
// - test-report model-number consistency analysis
// - Declaration / Test report EN-standard consistency analysis
// - PASS / VERIFY / BLOCK / INSUFFICIENT DATA
// ==================================================

const findingsList =
  document.getElementById(
    "findingsList"
  );

const launchDecision =
  document.getElementById(
    "launchDecision"
  );

const decisionText =
  document.getElementById(
    "decisionText"
  );

const actionOptions =
  document.querySelectorAll(
    ".feedback-option"
  );

const reuseButtons =
  document.querySelectorAll(
    ".reuse-btn"
  );


// ==================================================
// LOCAL STORAGE
// ==================================================

function readLocalData(
  key
) {

  const saved =
    localStorage.getItem(
      key
    );

  if (!saved) {
    return null;
  }

  try {

    return JSON.parse(
      saved
    );

  } catch (error) {

    console.warn(
      "LAUNCHGUARD_DATA_READ_ERROR",
      key,
      error
    );

    return null;
  }

}


// ==================================================
// CURRENT CHECK
// ==================================================

function getCurrentCheck() {

  return readLocalData(
    "launchguard_current_check"
  );

}


// ==================================================
// FORMATTERS
// ==================================================

function formatMarketplace(
  value
) {

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


function formatCategory(
  value
) {

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


// ==================================================
// REPORT HEADER
// ==================================================

function renderReportHeader(
  check
) {

  const product =
    check.product || {};

  document
    .getElementById(
      "reportProductName"
    )
    .textContent =
    product.productName ||
    "Unknown product";

  document
    .getElementById(
      "reportMarketplace"
    )
    .textContent =
    formatMarketplace(
      product.marketplace
    );

  document
    .getElementById(
      "reportCategory"
    )
    .textContent =
    formatCategory(
      product.category
    );

}


// ==================================================
// FINDING FACTORY
// ==================================================

function createFinding(
  status,
  issue,
  why,
  evidence,
  action,
  details = null
) {

  return {

    status:
      status,

    issue:
      issue,

    why:
      why,

    evidence:
      evidence,

    action:
      action,

    details:
      details

  };

}


// ==================================================
// DOCUMENT LABELS
// ==================================================

const DOCUMENT_LABELS = {

  productLabel:
    "Product label",

  packaging:
    "Packaging",

  instructions:
    "Instructions / manual",

  declaration:
    "Declaration of Conformity",

  testReport:
    "Test report",

  certificate:
    "Certificate",

  otherDocument:
    "Other compliance document"

};


// ==================================================
// DOCUMENT ANALYSIS
// ==================================================

function getDocumentAnalysis(
  file
) {

  if (
    !file ||
    !file.documentTypeAnalysis
  ) {

    return null;
  }

  return file.documentTypeAnalysis;

}


// ==================================================
// CONTENT CONSISTENCY
// ==================================================

function getWattageConsistency(
  file
) {

  const analysis =
    getDocumentAnalysis(
      file
    );

  if (
    !analysis ||
    !analysis.contentConsistency ||
    !analysis.contentConsistency.wattage
  ) {

    return null;
  }

  return (
    analysis
      .contentConsistency
      .wattage
  );

}


function getManufacturerCountryConsistency(
  file
) {

  const analysis =
    getDocumentAnalysis(
      file
    );

  if (
    !analysis ||
    !analysis.contentConsistency ||
    !analysis.contentConsistency.manufacturerCountry
  ) {

    return null;
  }

  return (
    analysis
      .contentConsistency
      .manufacturerCountry
  );

}


function getModelNumberConsistency(
  file
) {

  const analysis =
    getDocumentAnalysis(
      file
    );

  if (
    !analysis ||
    !analysis.contentConsistency ||
    !analysis.contentConsistency.modelNumber
  ) {

    return null;
  }

  return (
    analysis
      .contentConsistency
      .modelNumber
  );

}


function getTestReportModelNumberConsistency(
  file
) {

  const analysis =
    getDocumentAnalysis(
      file
    );

  if (
    !analysis ||
    !analysis.contentConsistency ||
    !analysis.contentConsistency.testReportModelNumber
  ) {

    return null;
  }

  return (
    analysis
      .contentConsistency
      .testReportModelNumber
  );

}


function getStandardConsistency(
  file
) {

  const analysis =
    getDocumentAnalysis(
      file
    );

  if (
    !analysis ||
    !analysis.contentConsistency ||
    !analysis.contentConsistency.standardConsistency
  ) {

    return null;
  }

  return (
    analysis
      .contentConsistency
      .standardConsistency
  );

}


// ==================================================
// DOCUMENT FINDING
// ==================================================

function buildDocumentFinding(
  fieldName,
  file,
  options = {}
) {

  const documentLabel =
    DOCUMENT_LABELS[
      fieldName
    ] ||
    fieldName;


  if (!file) {

    return createFinding(

      "INSUFFICIENT_DATA",

      `${documentLabel} not provided`,

      options.missingWhy ||
        `The available information is not enough to complete checks that may depend on ${documentLabel}.`,

      `No ${documentLabel} file was provided.`,

      options.missingAction ||
        `Provide the applicable ${documentLabel} if available.`

    );

  }


  const analysis =
    getDocumentAnalysis(
      file
    );


  const fileName =
    file.name ||
    file.originalName ||
    documentLabel;


  if (!analysis) {

    return createFinding(

      "VERIFY",

      `${documentLabel} requires review`,

      "The file is available, but no reliable document-type analysis is available for this submission.",

      fileName,

      `Verify manually that the uploaded file is actually the expected ${documentLabel}.`

    );

  }


  if (
    analysis.status ===
    "LIKELY_MATCH"
  ) {

    return createFinding(

      "PASS",

      `${documentLabel} appears to match the expected document type`,

      `The uploaded file contains structural and textual indicators consistent with ${documentLabel}.`,

      fileName,

      "No document-type correction is required. Continue with the substantive compliance review.",

      {

        detailType:
          "DOCUMENT_TYPE",

        expectedType:
          analysis.expectedType,

        result:
          analysis.status,

        confidence:
          analysis.confidence,

        score:
          analysis.score

      }

    );

  }


  if (
    analysis.status ===
    "VERIFY"
  ) {

    return createFinding(

      "VERIFY",

      `${documentLabel} could not be verified automatically`,

      analysis.reason ||
        `The system could not reliably confirm that the uploaded file is the expected ${documentLabel}.`,

      fileName,

      `Manually verify that this file is the correct ${documentLabel} before relying on it.`,

      {

        detailType:
          "DOCUMENT_TYPE",

        expectedType:
          analysis.expectedType,

        result:
          analysis.status,

        confidence:
          analysis.confidence,

        score:
          analysis.score

      }

    );

  }


  if (
    analysis.status ===
    "LIKELY_MISMATCH"
  ) {

    return createFinding(

      "BLOCK",

      `Uploaded file does not appear to be ${documentLabel}`,

      analysis.reason ||
        "The uploaded evidence does not appear to match the selected document type.",

      fileName,

      `Upload the actual ${documentLabel} or correct the selected document type before launch.`,

      {

        detailType:
          "DOCUMENT_TYPE",

        expectedType:
          analysis.expectedType,

        result:
          analysis.status,

        confidence:
          analysis.confidence,

        score:
          analysis.score

      }

    );

  }


  return createFinding(

    "VERIFY",

    `${documentLabel} requires review`,

    "The document analysis returned an unsupported or unknown result.",

    fileName,

    `Manually review the uploaded ${documentLabel}.`

  );

}


// ==================================================
// WATTAGE CONSISTENCY FINDING
// ==================================================

function buildWattageFinding(
  productLabel
) {

  if (!productLabel) {
    return null;
  }


  const analysis =
    getWattageConsistency(
      productLabel
    );


  if (!analysis) {
    return null;
  }


  if (
    analysis.status ===
    "NOT_EVALUATED"
  ) {

    return null;

  }


  const listingValue =
    analysis.listingPrimaryValue;


  const labelValue =
    analysis.labelPrimaryValue;


  if (
    analysis.status ===
    "CONSISTENT"
  ) {

    return createFinding(

      "PASS",

      "Power rating is consistent",

      "The primary wattage stated in the planned product/listing matches the primary wattage identified on the Product label.",

      `Product / listing: ${listingValue}W · Product label: ${labelValue}W`,

      "No wattage correction is required for this consistency check.",

      {

        detailType:
          "WATTAGE_CONSISTENCY",

        result:
          analysis.status,

        confidence:
          analysis.confidence,

        listingValue:
          listingValue,

        labelValue:
          labelValue

      }

    );

  }


  if (
    analysis.status ===
    "MISMATCH"
  ) {

    return createFinding(

      "BLOCK",

      "Power rating mismatch",

      analysis.reason ||
        "The planned listing and Product label indicate different power ratings.",

      `Product / listing: ${listingValue}W · Product label: ${labelValue}W`,

      "Verify the correct product power rating and align the product, listing and Product label before launch.",

      {

        detailType:
          "WATTAGE_CONSISTENCY",

        result:
          analysis.status,

        confidence:
          analysis.confidence,

        listingValue:
          listingValue,

        labelValue:
          labelValue

      }

    );

  }


  return createFinding(

    "VERIFY",

    "Power rating requires verification",

    analysis.reason ||
      "LAUNCHGUARD could not make a reliable wattage comparison.",

    `Product / listing: ${
      listingValue !== null
        ? `${listingValue}W`
        : "not identified"
    } · Product label: ${
      labelValue !== null
        ? `${labelValue}W`
        : "not identified"
    }`,

    "Verify the intended product power rating and the value stated on the Product label.",

    {

      detailType:
        "WATTAGE_CONSISTENCY",

      result:
        analysis.status,

      confidence:
        analysis.confidence,

      listingValue:
        listingValue,

      labelValue:
        labelValue

    }

  );

}


// ==================================================
// MANUFACTURER COUNTRY FINDING
// ==================================================

function buildManufacturerCountryFinding(
  productLabel
) {

  if (!productLabel) {
    return null;
  }


  const analysis =
    getManufacturerCountryConsistency(
      productLabel
    );


  if (!analysis) {
    return null;
  }


  if (
    analysis.status ===
    "NOT_EVALUATED"
  ) {

    return null;
  }


  const setupCountry =
    analysis.setupCountry;


  const labelCountry =
    analysis.labelCountry;


  if (
    analysis.status ===
    "CONSISTENT"
  ) {

    return createFinding(

      "PASS",

      "Manufacturer country is consistent",

      "The manufacturer country entered in Product Setup matches the Made in country identified on the Product label.",

      `Product Setup: ${setupCountry} · Product label: ${labelCountry}`,

      "No manufacturer-country correction is required for this consistency check.",

      {

        detailType:
          "MANUFACTURER_COUNTRY_CONSISTENCY",

        result:
          analysis.status,

        confidence:
          analysis.confidence,

        setupCountry:
          setupCountry,

        labelCountry:
          labelCountry

      }

    );

  }


  if (
    analysis.status ===
    "MISMATCH"
  ) {

    return createFinding(

      "BLOCK",

      "Manufacturer country mismatch",

      analysis.reason ||
        "The manufacturer country entered in Product Setup does not match the Made in country identified on the Product label.",

      `Product Setup: ${setupCountry} · Product label: ${labelCountry}`,

      "Verify the correct manufacturer/origin country and align Product Setup and the Product label before launch.",

      {

        detailType:
          "MANUFACTURER_COUNTRY_CONSISTENCY",

        result:
          analysis.status,

        confidence:
          analysis.confidence,

        setupCountry:
          setupCountry,

        labelCountry:
          labelCountry

      }

    );

  }


  return createFinding(

    "VERIFY",

    "Manufacturer country requires verification",

    analysis.reason ||
      "LAUNCHGUARD could not make a reliable manufacturer-country comparison.",

    `Product Setup: ${
      setupCountry || "not identified"
    } · Product label: ${
      labelCountry || "not identified"
    }`,

    "Verify the manufacturer/origin country and the Made in statement on the Product label.",

    {

      detailType:
        "MANUFACTURER_COUNTRY_CONSISTENCY",

      result:
        analysis.status,

      confidence:
        analysis.confidence,

      setupCountry:
        setupCountry,

      labelCountry:
        labelCountry

    }

  );

}


// ==================================================
// MODEL NUMBER FINDING
// ==================================================

function buildModelNumberFinding(
  productLabel
) {

  if (!productLabel) {
    return null;
  }


  const analysis =
    getModelNumberConsistency(
      productLabel
    );


  if (!analysis) {
    return null;
  }


  if (
    analysis.status ===
    "NOT_EVALUATED"
  ) {

    return null;
  }


  const productLabelModel =
    analysis.productLabelModel;


  const declarationModel =
    analysis.declarationModel;


  if (
    analysis.status ===
    "CONSISTENT"
  ) {

    return createFinding(

      "PASS",

      "Model number is consistent",

      "The model number identified on the Product label matches the model number identified in the Declaration of Conformity.",

      `Product label: ${productLabelModel} · Declaration of Conformity: ${declarationModel}`,

      "No model-number correction is required for this consistency check.",

      {

        detailType:
          "MODEL_NUMBER_CONSISTENCY",

        result:
          analysis.status,

        confidence:
          analysis.confidence,

        productLabelModel:
          productLabelModel,

        declarationModel:
          declarationModel

      }

    );

  }


  if (
    analysis.status ===
    "MISMATCH"
  ) {

    return createFinding(

      "BLOCK",

      "Model number mismatch",

      analysis.reason ||
        "The Product label and Declaration of Conformity identify different model numbers.",

      `Product label: ${productLabelModel} · Declaration of Conformity: ${declarationModel}`,

      "Verify which model number is correct and align the Product label and Declaration of Conformity before launch.",

      {

        detailType:
          "MODEL_NUMBER_CONSISTENCY",

        result:
          analysis.status,

        confidence:
          analysis.confidence,

        productLabelModel:
          productLabelModel,

        declarationModel:
          declarationModel

      }

    );

  }


  return createFinding(

    "VERIFY",

    "Model number requires verification",

    analysis.reason ||
      "LAUNCHGUARD could not make a reliable model-number comparison.",

    `Product label: ${productLabelModel || "not identified"} · Declaration of Conformity: ${declarationModel || "not identified"}`,

    "Verify the model number on the Product label and in the Declaration of Conformity.",

    {

      detailType:
        "MODEL_NUMBER_CONSISTENCY",

      result:
        analysis.status,

      confidence:
        analysis.confidence,

      productLabelModel:
        productLabelModel,

      declarationModel:
        declarationModel

    }

  );

}



// ==================================================
// TEST REPORT MODEL NUMBER FINDING
// ==================================================

function buildTestReportModelNumberFinding(
  productLabel
) {

  if (!productLabel) {
    return null;
  }

  const analysis =
    getTestReportModelNumberConsistency(
      productLabel
    );

  if (!analysis) {
    return null;
  }

  if (
    analysis.status ===
    "NOT_EVALUATED"
  ) {
    return null;
  }

  const productLabelModel =
    analysis.productLabelModel;

  const testReportModel =
    analysis.testReportModel;

  if (
    analysis.status ===
    "CONSISTENT"
  ) {

    return createFinding(
      "PASS",
      "Test report model number is consistent",
      "The model number identified on the Product label matches the model number identified in the Test report.",
      `Product label: ${productLabelModel} · Test report: ${testReportModel}`,
      "No model-number correction is required between the Product label and Test report.",
      {
        detailType:
          "TEST_REPORT_MODEL_NUMBER_CONSISTENCY",
        result:
          analysis.status,
        confidence:
          analysis.confidence,
        productLabelModel:
          productLabelModel,
        testReportModel:
          testReportModel
      }
    );

  }

  if (
    analysis.status ===
    "MISMATCH"
  ) {

    return createFinding(
      "BLOCK",
      "Test report model number mismatch",
      analysis.reason ||
        "The Product label and Test report identify different model numbers.",
      `Product label: ${productLabelModel} · Test report: ${testReportModel}`,
      "Verify which model number is correct and align the Product label and Test report before launch.",
      {
        detailType:
          "TEST_REPORT_MODEL_NUMBER_CONSISTENCY",
        result:
          analysis.status,
        confidence:
          analysis.confidence,
        productLabelModel:
          productLabelModel,
        testReportModel:
          testReportModel
      }
    );

  }

  return createFinding(
    "VERIFY",
    "Test report model number requires verification",
    analysis.reason ||
      "LAUNCHGUARD could not make a reliable model-number comparison between the Product label and Test report.",
    `Product label: ${productLabelModel || "not identified"} · Test report: ${testReportModel || "not identified"}`,
    "Verify the model number on the Product label and in the Test report.",
    {
      detailType:
        "TEST_REPORT_MODEL_NUMBER_CONSISTENCY",
      result:
        analysis.status,
      confidence:
        analysis.confidence,
      productLabelModel:
        productLabelModel,
      testReportModel:
        testReportModel
    }
  );

}



// ==================================================
// STANDARD CONSISTENCY FINDING
// ==================================================

function buildStandardConsistencyFinding(
  declaration,
  testReport
) {

  if (
    !declaration ||
    !testReport
  ) {
    return null;
  }

  const analysis =
    getStandardConsistency(
      declaration
    ) ||
    getStandardConsistency(
      testReport
    );

  if (!analysis) {
    return null;
  }

  if (
    analysis.status ===
    "NOT_EVALUATED"
  ) {
    return null;
  }

  const declarationStandards =
    Array.isArray(
      analysis.declarationStandards
    )
      ? analysis.declarationStandards
      : [];

  const testReportStandards =
    Array.isArray(
      analysis.testReportStandards
    )
      ? analysis.testReportStandards
      : [];

  const matchedStandards =
    Array.isArray(
      analysis.matchedStandards
    )
      ? analysis.matchedStandards
      : [];

  const declarationText =
    declarationStandards.length
      ? declarationStandards.join(", ")
      : "not identified";

  const testReportText =
    testReportStandards.length
      ? testReportStandards.join(", ")
      : "not identified";

  if (
    analysis.status ===
    "CONSISTENT"
  ) {

    return createFinding(
      "PASS",
      "Referenced EN standard is consistent",
      "At least one EN standard identified in the Declaration of Conformity is also identified in the Test report.",
      `Declaration of Conformity: ${declarationText} · Test report: ${testReportText}`,
      "No EN-standard correction is required for this consistency check.",
      {
        detailType:
          "STANDARD_CONSISTENCY",
        result:
          analysis.status,
        confidence:
          analysis.confidence,
        declarationStandards:
          declarationStandards,
        testReportStandards:
          testReportStandards,
        matchedStandards:
          matchedStandards
      }
    );

  }

  if (
    analysis.status ===
    "MISMATCH"
  ) {

    return createFinding(
      "BLOCK",
      "Referenced EN standard mismatch",
      analysis.reason ||
        "The Declaration of Conformity and Test report reference different EN standards.",
      `Declaration of Conformity: ${declarationText} · Test report: ${testReportText}`,
      "Verify which EN standards apply to the product and align the Declaration of Conformity and Test report before launch.",
      {
        detailType:
          "STANDARD_CONSISTENCY",
        result:
          analysis.status,
        confidence:
          analysis.confidence,
        declarationStandards:
          declarationStandards,
        testReportStandards:
          testReportStandards,
        matchedStandards:
          matchedStandards
      }
    );

  }

  return createFinding(
    "VERIFY",
    "Referenced EN standards require verification",
    analysis.reason ||
      "LAUNCHGUARD could not make a reliable EN-standard comparison between the Declaration of Conformity and Test report.",
    `Declaration of Conformity: ${declarationText} · Test report: ${testReportText}`,
    "Verify the applicable EN standards in the Declaration of Conformity and Test report.",
    {
      detailType:
        "STANDARD_CONSISTENCY",
      result:
        analysis.status,
      confidence:
        analysis.confidence,
      declarationStandards:
        declarationStandards,
      testReportStandards:
        testReportStandards,
      matchedStandards:
        matchedStandards
    }
  );

}


// ==================================================
// BUILD FINDINGS
// ==================================================

function buildFindings(
  check
) {

  const findings =
    [];


  const product =
    check.product || {};


  const listing =
    check.listing || {};


  const evidence =
    check.evidence || {};


  // =================================================
  // LISTING
  // =================================================

  if (
    listing.listingTitle &&
    listing.bulletPoints &&
    listing.description
  ) {

    findings.push(
      createFinding(

        "PASS",

        "Planned listing content provided",

        "The pre-launch review has the core listing content needed for further checks.",

        "Title, bullet points and description were provided.",

        "No input action required."

      )
    );

  } else {

    findings.push(
      createFinding(

        "INSUFFICIENT_DATA",

        "Planned listing content is incomplete",

        "LAUNCHGUARD cannot reliably review listing-related risks without the complete planned listing.",

        "One or more required listing fields are missing.",

        "Provide the missing title, bullet points or description."

      )
    );

  }


  // =================================================
  // PRODUCT LABEL TYPE
  // =================================================

  findings.push(
    buildDocumentFinding(
      "productLabel",
      evidence.productLabel,
      {

        missingWhy:
          "Label information may be required to compare product identity, warnings, claims and mandatory information.",

        missingAction:
          "Provide the final product label or label artwork if available."

      }
    )
  );


  // =================================================
  // WATTAGE
  // =================================================

  const wattageFinding =
    buildWattageFinding(
      evidence.productLabel
    );


  if (
    wattageFinding
  ) {

    findings.push(
      wattageFinding
    );

  }


  // =================================================
  // MANUFACTURER COUNTRY
  // =================================================

  const manufacturerCountryFinding =
    buildManufacturerCountryFinding(
      evidence.productLabel
    );


  if (
    manufacturerCountryFinding
  ) {

    findings.push(
      manufacturerCountryFinding
    );

  }


  // =================================================
  // PACKAGING
  // =================================================

  findings.push(
    buildDocumentFinding(
      "packaging",
      evidence.packaging,
      {

        missingWhy:
          "Some pre-launch risks can only be assessed when packaging claims and required information are visible.",

        missingAction:
          "Provide packaging artwork or clear packaging photos if available."

      }
    )
  );


  // =================================================
  // INSTRUCTIONS
  // =================================================

  if (
    evidence.instructions
  ) {

    findings.push(
      buildDocumentFinding(
        "instructions",
        evidence.instructions
      )
    );

  }


  // =================================================
  // ELECTRICAL
  // =================================================

  if (
    product.electrical ===
    "yes"
  ) {

    findings.push(
      buildDocumentFinding(
        "declaration",
        evidence.declaration,
        {

          missingWhy:
            "For this electrical product, the available information is not enough to verify conformity documentation.",

          missingAction:
            "Provide the applicable Declaration of Conformity if one is required for this product."

        }
      )
    );


    const modelNumberFinding =
      buildModelNumberFinding(
        evidence.productLabel
      );


    if (
      modelNumberFinding
    ) {

      findings.push(
        modelNumberFinding
      );

    }


    findings.push(
      buildDocumentFinding(
        "testReport",
        evidence.testReport,
        {

          missingWhy:
            "The available evidence may be insufficient for some technical product checks.",

          missingAction:
            "Provide relevant technical test documentation if available."

        }
      )
    );

    const testReportModelNumberFinding =
      buildTestReportModelNumberFinding(
        evidence.productLabel
      );


    if (
      testReportModelNumberFinding
    ) {

      findings.push(
        testReportModelNumberFinding
      );

    }


    const standardConsistencyFinding =
      buildStandardConsistencyFinding(
        evidence.declaration,
        evidence.testReport
      );


    if (
      standardConsistencyFinding
    ) {

      findings.push(
        standardConsistencyFinding
      );

    }


  }


  // =================================================
  // BATTERY
  // =================================================

  if (
    product.battery ===
    "yes"
  ) {

    findings.push(
      createFinding(

        "VERIFY",

        "Battery-related requirements require review",

        "Products containing or using batteries may trigger additional documentation, transport, labeling or marketplace requirements.",

        "Product Setup indicates that the product contains or uses a battery.",

        "Verify the battery-specific requirements and supporting evidence before launch."

      )
    );

  }


  // =================================================
  // WIRELESS
  // =================================================

  if (
    product.wireless ===
    "yes"
  ) {

    findings.push(
      createFinding(

        "VERIFY",

        "Wireless product requirements require review",

        "Wireless functionality may trigger additional regulatory and technical requirements that cannot be confirmed from the current inputs alone.",

        "Product Setup indicates wireless functionality.",

        "Verify the applicable radio/wireless requirements and supporting evidence."

      )
    );

  }


  // =================================================
  // CERTIFICATE
  // =================================================

  if (
    evidence.certificate
  ) {

    findings.push(
      buildDocumentFinding(
        "certificate",
        evidence.certificate
      )
    );

  }


  // =================================================
  // OTHER DOCUMENT
  // =================================================

  if (
    evidence.otherDocument
  ) {

    findings.push(
      buildDocumentFinding(
        "otherDocument",
        evidence.otherDocument
      )
    );

  }


  // =================================================
  // MANUAL REVIEW
  // =================================================

  findings.push(
    createFinding(

      "VERIFY",

      "Manual V0.9.1 compliance review still required",

      "The current validation version can inspect document-type signals and perform limited wattage, manufacturer-country, Declaration model-number, Test report model-number and EN-standard consistency checks, but it does not yet perform a complete automated compliance determination.",

      "Review mode: MANUAL_VALIDATION",

      "Complete the limited manual pre-launch compliance review before relying on the final launch decision."

    )
  );


  return findings;

}


// ==================================================
// STATUS CONFIG
// ==================================================

function getStatusConfig(
  status
) {

  const map = {

    PASS: {

      label:
        "PASS",

      className:
        "pass"

    },

    VERIFY: {

      label:
        "VERIFY",

      className:
        "verify"

    },

    BLOCK: {

      label:
        "BLOCK",

      className:
        "block"

    },

    INSUFFICIENT_DATA: {

      label:
        "INSUFFICIENT DATA",

      className:
        "insufficient"

    }

  };


  return (
    map[status] ||
    map.VERIFY
  );

}


// ==================================================
// DETAIL RENDERER
// ==================================================

function createAnalysisDetailsHtml(
  details
) {

  if (!details) {
    return "";
  }


  // =================================================
  // WATTAGE
  // =================================================

  if (
    details.detailType ===
    "WATTAGE_CONSISTENCY"
  ) {

    return `

      <div class="finding-row">

        <span>
          CONSISTENCY ANALYSIS
        </span>

        <p>

          Result:
          <strong>
            ${escapeHtml(
              details.result ||
              "—"
            )}
          </strong>

          <br>

          Confidence:
          <strong>
            ${escapeHtml(
              details.confidence ||
              "—"
            )}
          </strong>

          <br>

          Product / listing:
          <strong>
            ${
              typeof details.listingValue ===
              "number"
                ? escapeHtml(
                    `${details.listingValue}W`
                  )
                : "—"
            }
          </strong>

          <br>

          Product label:
          <strong>
            ${
              typeof details.labelValue ===
              "number"
                ? escapeHtml(
                    `${details.labelValue}W`
                  )
                : "—"
            }
          </strong>

        </p>

      </div>

    `;

  }


  // =================================================
  // MANUFACTURER COUNTRY
  // =================================================

  if (
    details.detailType ===
    "MANUFACTURER_COUNTRY_CONSISTENCY"
  ) {

    return `

      <div class="finding-row">

        <span>
          CONSISTENCY ANALYSIS
        </span>

        <p>

          Result:
          <strong>
            ${escapeHtml(
              details.result ||
              "—"
            )}
          </strong>

          <br>

          Confidence:
          <strong>
            ${escapeHtml(
              details.confidence ||
              "—"
            )}
          </strong>

          <br>

          Product Setup:
          <strong>
            ${escapeHtml(
              details.setupCountry ||
              "—"
            )}
          </strong>

          <br>

          Product label:
          <strong>
            ${escapeHtml(
              details.labelCountry ||
              "—"
            )}
          </strong>

        </p>

      </div>

    `;

  }


  // =================================================
  // MODEL NUMBER
  // =================================================

  if (
    details.detailType ===
    "MODEL_NUMBER_CONSISTENCY"
  ) {

    return `

      <div class="finding-row">

        <span>
          CONSISTENCY ANALYSIS
        </span>

        <p>

          Result:
          <strong>
            ${escapeHtml(
              details.result ||
              "—"
            )}
          </strong>

          <br>

          Confidence:
          <strong>
            ${escapeHtml(
              details.confidence ||
              "—"
            )}
          </strong>

          <br>

          Product label:
          <strong>
            ${escapeHtml(
              details.productLabelModel ||
              "—"
            )}
          </strong>

          <br>

          Declaration of Conformity:
          <strong>
            ${escapeHtml(
              details.declarationModel ||
              "—"
            )}
          </strong>

        </p>

      </div>

    `;

  }


  // =================================================
  // TEST REPORT MODEL NUMBER
  // =================================================

  if (
    details.detailType ===
    "TEST_REPORT_MODEL_NUMBER_CONSISTENCY"
  ) {

    return `

      <div class="finding-row">

        <span>
          CONSISTENCY ANALYSIS
        </span>

        <p>

          Result:
          <strong>
            ${escapeHtml(
              details.result ||
              "—"
            )}
          </strong>

          <br>

          Confidence:
          <strong>
            ${escapeHtml(
              details.confidence ||
              "—"
            )}
          </strong>

          <br>

          Product label:
          <strong>
            ${escapeHtml(
              details.productLabelModel ||
              "—"
            )}
          </strong>

          <br>

          Test report:
          <strong>
            ${escapeHtml(
              details.testReportModel ||
              "—"
            )}
          </strong>

        </p>

      </div>

    `;

  }


  // =================================================
  // STANDARD CONSISTENCY
  // =================================================

  if (
    details.detailType ===
    "STANDARD_CONSISTENCY"
  ) {

    const declarationStandards =
      Array.isArray(
        details.declarationStandards
      )
        ? details.declarationStandards.join(", ")
        : "—";

    const testReportStandards =
      Array.isArray(
        details.testReportStandards
      )
        ? details.testReportStandards.join(", ")
        : "—";

    const matchedStandards =
      Array.isArray(
        details.matchedStandards
      )
        ? details.matchedStandards
            .map(
              (
                item
              ) =>
                item && item.base
                  ? item.base
                  : ""
            )
            .filter(Boolean)
            .join(", ")
        : "";

    return `

      <div class="finding-row">

        <span>
          CONSISTENCY ANALYSIS
        </span>

        <p>

          Result:
          <strong>
            ${escapeHtml(
              details.result ||
              "—"
            )}
          </strong>

          <br>

          Confidence:
          <strong>
            ${escapeHtml(
              details.confidence ||
              "—"
            )}
          </strong>

          <br>

          Declaration of Conformity:
          <strong>
            ${escapeHtml(
              declarationStandards ||
              "—"
            )}
          </strong>

          <br>

          Test report:
          <strong>
            ${escapeHtml(
              testReportStandards ||
              "—"
            )}
          </strong>

          <br>

          Matching standard:
          <strong>
            ${escapeHtml(
              matchedStandards ||
              "—"
            )}
          </strong>

        </p>

      </div>

    `;

  }


  // =================================================
  // DOCUMENT TYPE
  // =================================================

  const expectedType =
    details.expectedType ||
    "—";


  const result =
    details.result ||
    "—";


  const confidence =
    details.confidence ||
    "—";


  const score =
    typeof details.score ===
    "number"
      ? details.score
      : "—";


  return `

    <div class="finding-row">

      <span>
        DOCUMENT ANALYSIS
      </span>

      <p>

        Expected:
        <strong>
          ${escapeHtml(expectedType)}
        </strong>

        <br>

        Result:
        <strong>
          ${escapeHtml(result)}
        </strong>

        <br>

        Confidence:
        <strong>
          ${escapeHtml(confidence)}
        </strong>

        <br>

        Score:
        <strong>
          ${escapeHtml(score)}
        </strong>

      </p>

    </div>

  `;

}


// ==================================================
// RENDER FINDINGS
// ==================================================

function renderFindings(
  findings
) {

  findingsList.innerHTML =
    "";


  findings.forEach(
    (
      finding
    ) => {

      const config =
        getStatusConfig(
          finding.status
        );


      const card =
        document.createElement(
          "article"
        );


      card.className =
        `finding-card ${config.className}`;


      card.innerHTML = `

        <div class="finding-top">

          <div>

            <div class="finding-status-badge">
              ${escapeHtml(config.label)}
            </div>

            <h3>
              ${escapeHtml(finding.issue)}
            </h3>

          </div>

        </div>


        <div class="finding-body">

          <div class="finding-row">

            <span>
              WHY IT MATTERS
            </span>

            <p>
              ${escapeHtml(finding.why)}
            </p>

          </div>


          <div class="finding-row">

            <span>
              EVIDENCE / RULE
            </span>

            <p>
              ${escapeHtml(finding.evidence)}
            </p>

          </div>


          ${createAnalysisDetailsHtml(
            finding.details
          )}


          <div class="finding-row action">

            <span>
              REQUIRED ACTION
            </span>

            <p>
              ${escapeHtml(finding.action)}
            </p>

          </div>

        </div>

      `;


      findingsList.appendChild(
        card
      );

    }
  );

}


// ==================================================
// COUNTS
// ==================================================

function calculateCounts(
  findings
) {

  return {

    block:
      findings.filter(
        (
          item
        ) =>
          item.status ===
          "BLOCK"
      ).length,

    verify:
      findings.filter(
        (
          item
        ) =>
          item.status ===
          "VERIFY"
      ).length,

    pass:
      findings.filter(
        (
          item
        ) =>
          item.status ===
          "PASS"
      ).length,

    insufficient:
      findings.filter(
        (
          item
        ) =>
          item.status ===
          "INSUFFICIENT_DATA"
      ).length

  };

}


function renderCounts(
  counts
) {

  document
    .getElementById(
      "blockCount"
    )
    .textContent =
    counts.block;


  document
    .getElementById(
      "verifyCount"
    )
    .textContent =
    counts.verify;


  document
    .getElementById(
      "passCount"
    )
    .textContent =
    counts.pass;


  document
    .getElementById(
      "missingCount"
    )
    .textContent =
    counts.insufficient;

}


// ==================================================
// LAUNCH DECISION
// ==================================================

function determineLaunchDecision(
  findings
) {

  const hasBlock =
    findings.some(
      (
        item
      ) =>
        item.status ===
        "BLOCK"
    );


  const hasVerify =
    findings.some(
      (
        item
      ) =>
        item.status ===
        "VERIFY"
    );


  const hasInsufficient =
    findings.some(
      (
        item
      ) =>
        item.status ===
        "INSUFFICIENT_DATA"
    );


  if (
    hasBlock
  ) {

    return {

      status:
        "NOT_READY",

      label:
        "NOT READY TO LAUNCH",

      reason:
        "BLOCKER_PRESENT"

    };

  }


  if (
    hasVerify ||
    hasInsufficient
  ) {

    return {

      status:
        "NOT_READY",

      label:
        "NOT READY TO LAUNCH",

      reason:
        "REVIEW_OR_DATA_REQUIRED"

    };

  }


  return {

    status:
      "READY",

    label:
      "READY TO LAUNCH",

    reason:
      "NO_OPEN_FINDINGS"

  };

}


// ==================================================
// RENDER LAUNCH DECISION
// ==================================================

function renderLaunchDecision(
  decision
) {

  decisionText.textContent =
    decision.label;


  launchDecision.classList.remove(
    "ready",
    "not-ready"
  );


  if (
    decision.status ===
    "READY"
  ) {

    launchDecision.classList.add(
      "ready"
    );

  } else {

    launchDecision.classList.add(
      "not-ready"
    );

  }

}


// ==================================================
// SAVE REPORT
// ==================================================

function saveReport(
  check,
  findings,
  counts,
  decision
) {

  const report = {

    checkId:
      check.checkId,

    analysisVersion:
      check.analysisVersion ||
      "unknown",

    findings:
      findings,

    summary:
      counts,

    decision:
      decision,

    reviewMode:
      check.reviewMode,

    generatedAt:
      new Date()
        .toISOString()

  };


  localStorage.setItem(
    "launchguard_current_report",
    JSON.stringify(
      report
    )
  );


  console.log(
    "LAUNCHGUARD_REPORT_GENERATED",
    report
  );

}


// ==================================================
// FEEDBACK
// ==================================================

function saveFeedback() {

  const selectedAction =
    document.querySelector(
      ".feedback-option.selected"
    );


  const selectedReuse =
    document.querySelector(
      ".reuse-btn.selected"
    );


  const check =
    getCurrentCheck();


  const feedback = {

    checkId:
      check
        ? check.checkId
        : null,

    action:
      selectedAction
        ? selectedAction.dataset.action
        : "",

    wouldReuse:
      selectedReuse
        ? selectedReuse.dataset.reuse
        : "",

    updatedAt:
      new Date()
        .toISOString()

  };


  localStorage.setItem(
    "launchguard_report_feedback",
    JSON.stringify(
      feedback
    )
  );


  console.log(
    "LAUNCHGUARD_REPORT_FEEDBACK",
    feedback
  );

}


// ==================================================
// FEEDBACK EVENTS
// ==================================================

actionOptions.forEach(
  (
    button
  ) => {

    button.addEventListener(
      "click",
      () => {

        actionOptions.forEach(
          (
            item
          ) => {

            item.classList.remove(
              "selected"
            );

          }
        );


        button.classList.add(
          "selected"
        );


        saveFeedback();

      }
    );

  }
);


reuseButtons.forEach(
  (
    button
  ) => {

    button.addEventListener(
      "click",
      () => {

        reuseButtons.forEach(
          (
            item
          ) => {

            item.classList.remove(
              "selected"
            );

          }
        );


        button.classList.add(
          "selected"
        );


        saveFeedback();

      }
    );

  }
);


// ==================================================
// RESTORE FEEDBACK
// ==================================================

function restoreFeedback() {

  const feedback =
    readLocalData(
      "launchguard_report_feedback"
    );


  if (!feedback) {
    return;
  }


  const check =
    getCurrentCheck();


  if (
    check &&
    feedback.checkId &&
    feedback.checkId !==
      check.checkId
  ) {

    return;
  }


  if (
    feedback.action
  ) {

    const actionButton =
      document.querySelector(
        `[data-action="${feedback.action}"]`
      );


    if (
      actionButton
    ) {

      actionButton.classList.add(
        "selected"
      );

    }

  }


  if (
    feedback.wouldReuse
  ) {

    const reuseButton =
      document.querySelector(
        `[data-reuse="${feedback.wouldReuse}"]`
      );


    if (
      reuseButton
    ) {

      reuseButton.classList.add(
        "selected"
      );

    }

  }

}


// ==================================================
// ESCAPE HTML
// ==================================================

function escapeHtml(
  value
) {

  return String(
    value
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );

}


// ==================================================
// INITIALIZE
// ==================================================

function initialize() {

  const check =
    getCurrentCheck();


  if (!check) {

    window.location.href =
      "prelaunch-check.html";

    return;
  }


  renderReportHeader(
    check
  );


  const findings =
    buildFindings(
      check
    );


  renderFindings(
    findings
  );


  const counts =
    calculateCounts(
      findings
    );


  renderCounts(
    counts
  );


  const decision =
    determineLaunchDecision(
      findings
    );


  renderLaunchDecision(
    decision
  );


  saveReport(
    check,
    findings,
    counts,
    decision
  );


  restoreFeedback();

}


// ==================================================
// START
// ==================================================

initialize();
