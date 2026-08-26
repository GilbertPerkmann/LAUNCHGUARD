"use strict";

// ==================================================
// LAUNCHGUARD V0.11
// LOCAL MVP SERVER
//
// DOCUMENT ANALYSIS:
// - PDF text extraction
// - TXT text extraction
// - weighted document-type scoring
// - positive + strong + negative signals
// - structural pattern detection
//
// CROSS-EVIDENCE ANALYSIS:
// - wattage consistency
// - manufacturer-country / origin consistency
// - model-number consistency: Product label <-> Declaration of Conformity
// - model-number consistency: Product label <-> Test report
// - EN-standard consistency: Declaration of Conformity <-> Test report
//
// IMPORTANT:
// This is a pre-launch risk signal system.
// It does NOT make a legal compliance determination.
// ==================================================

const express = require("express");
const multer = require("multer");

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const pdfParse = require("pdf-parse");

// V0.9 PDF fallback parser.
// pdfjs-dist is loaded dynamically only when pdf-parse fails or returns no useful text.
async function extractPdfTextWithPdfJs(buffer) {

  const pdfjsLib =
    await import(
      "pdfjs-dist/legacy/build/pdf.mjs"
    );

  const loadingTask =
    pdfjsLib.getDocument({
      data:
        new Uint8Array(buffer),

      disableFontFace:
        true,

      useSystemFonts:
        false,

      verbosity:
        0
    });


  const pdf =
    await loadingTask.promise;


  const pages =
    [];


  for (
    let pageNumber = 1;
    pageNumber <= pdf.numPages;
    pageNumber += 1
  ) {

    const page =
      await pdf.getPage(
        pageNumber
      );


    const content =
      await page.getTextContent();


    const pageText =
      content.items
        .map(
          item =>
            typeof item.str === "string"
              ? item.str
              : ""
        )
        .filter(
          Boolean
        )
        .join(
          " "
        );


    pages.push(
      pageText
    );

  }


  return normalizeText(
    pages.join(
      "\n\n"
    )
  );

}


// ==================================================
// APP
// ==================================================

const app = express();

const PORT =
  process.env.PORT || 3000;


// ==================================================
// DIRECTORIES
// ==================================================

const ROOT_DIR =
  __dirname;

const DATA_DIR =
  path.join(
    ROOT_DIR,
    "data"
  );

const UPLOAD_DIR =
  path.join(
    ROOT_DIR,
    "uploads"
  );

const TEMP_UPLOAD_DIR =
  path.join(
    UPLOAD_DIR,
    "_temp"
  );


// ==================================================
// ENSURE DIRECTORIES
// ==================================================

function ensureDirectory(directory) {

  if (
    !fs.existsSync(
      directory
    )
  ) {

    fs.mkdirSync(
      directory,
      {
        recursive: true
      }
    );

  }

}


ensureDirectory(
  DATA_DIR
);

ensureDirectory(
  UPLOAD_DIR
);

ensureDirectory(
  TEMP_UPLOAD_DIR
);


// ==================================================
// BODY PARSING
// ==================================================

app.use(
  express.json({
    limit: "2mb"
  })
);


// ==================================================
// STATIC FRONTEND
// ==================================================

app.use(
  "/css",
  express.static(
    path.join(
      ROOT_DIR,
      "css"
    )
  )
);


app.use(
  "/js",
  express.static(
    path.join(
      ROOT_DIR,
      "js"
    )
  )
);


app.use(
  "/screens",
  express.static(
    path.join(
      ROOT_DIR,
      "screens"
    )
  )
);


app.use(
  "/assets",
  express.static(
    path.join(
      ROOT_DIR,
      "assets"
    )
  )
);


// ==================================================
// HOME ROUTES
// ==================================================

function sendIndex(
  req,
  res
) {

  res.sendFile(
    path.join(
      ROOT_DIR,
      "index.html"
    )
  );

}


app.get(
  "/",
  sendIndex
);


app.get(
  "/index.html",
  sendIndex
);


// ==================================================
// ROOT FILES
// ==================================================

app.get(
  "/styles.css",
  (
    req,
    res
  ) => {

    res.sendFile(
      path.join(
        ROOT_DIR,
        "styles.css"
      )
    );

  }
);


app.get(
  "/javascript.js",
  (
    req,
    res
  ) => {

    res.sendFile(
      path.join(
        ROOT_DIR,
        "javascript.js"
      )
    );

  }
);


// ==================================================
// CHECK ID
// ==================================================

function createCheckId() {

  const random =
    crypto
      .randomBytes(4)
      .toString("hex")
      .toUpperCase();


  const time =
    Date.now()
      .toString(36)
      .toUpperCase();


  return (
    "LG-" +
    time +
    "-" +
    random
  );

}


// ==================================================
// CHECK ID VALIDATION
// ==================================================

function isValidCheckId(
  checkId
) {

  return (
    /^LG-[A-Z0-9]+-[A-Z0-9]+$/
      .test(
        checkId
      )
  );

}


// ==================================================
// SAFE FILE NAME
// ==================================================

function fixUploadedFileName(
  fileName
) {

  return String(
    fileName || ""
  )
    .replace(
      /Ã¢Â€Â“/g,
      "â€“"
    )
    .replace(
      /Ã¢Â€Â”/g,
      "â€”"
    )
    .replace(
      /Ã¢Â€Â™/g,
      "â€™"
    )
    .replace(
      /Ã¢Â€Âœ|Ã¢Â€Â/g,
      '"'
    );

}


function createSafeFileName(
  originalName
) {

  const safeOriginalName =
    String(
      originalName || "file"
    )
      .replace(
        /[^a-zA-Z0-9._-]/g,
        "_"
      );


  const random =
    crypto
      .randomBytes(3)
      .toString("hex");


  return (
    Date.now() +
    "-" +
    random +
    "-" +
    safeOriginalName
  );

}


// ==================================================
// TEMP UPLOAD STORAGE
// ==================================================

const tempStorage =
  multer.diskStorage({

    destination:
      function (
        req,
        file,
        cb
      ) {

        cb(
          null,
          TEMP_UPLOAD_DIR
        );

      },


    filename:
      function (
        req,
        file,
        cb
      ) {

        cb(
          null,
          createSafeFileName(
            file.originalname
          )
        );

      }

  });


// ==================================================
// FILE TYPES
// ==================================================

const ALLOWED_MIME_TYPES =
  new Set([
    "application/pdf",
    "text/plain",
    "image/png",
    "image/jpeg",
    "image/webp"
  ]);


const ALLOWED_EXTENSIONS =
  new Set([
    ".pdf",
    ".txt",
    ".png",
    ".jpg",
    ".jpeg",
    ".webp"
  ]);


// ==================================================
// FILE FILTER
// ==================================================

function fileFilter(
  req,
  file,
  cb
) {

  const extension =
    path
      .extname(
        file.originalname || ""
      )
      .toLowerCase();


  const mimeAllowed =
    ALLOWED_MIME_TYPES.has(
      file.mimetype
    );


  const extensionAllowed =
    ALLOWED_EXTENSIONS.has(
      extension
    );


  const valid =
    extensionAllowed &&
    (
      mimeAllowed ||
      extension === ".txt"
    );


  if (
    valid
  ) {

    cb(
      null,
      true
    );

    return;
  }


  cb(
    new Error(
      "Unsupported file type. Only PDF, TXT, PNG, JPG, JPEG and WEBP are allowed."
    )
  );

}


// ==================================================
// MULTER
// ==================================================

const upload =
  multer({

    storage:
      tempStorage,

    fileFilter:
      fileFilter,

    limits: {

      fileSize:
        15 * 1024 * 1024,

      files:
        7

    }

  });


// ==================================================
// UPLOAD FIELDS
// ==================================================

const UPLOAD_FIELDS = [

  {
    name:
      "productLabel",

    maxCount:
      1
  },

  {
    name:
      "packaging",

    maxCount:
      1
  },

  {
    name:
      "instructions",

    maxCount:
      1
  },

  {
    name:
      "declaration",

    maxCount:
      1
  },

  {
    name:
      "testReport",

    maxCount:
      1
  },

  {
    name:
      "certificate",

    maxCount:
      1
  },

  {
    name:
      "otherDocument",

    maxCount:
      1
  }

];


// ==================================================
// TEXT NORMALIZATION
// ==================================================

function normalizeText(
  value
) {

  return String(
    value || ""
  )
    .replace(
      /\u0000/g,
      ""
    )
    .replace(
      /\r\n?/g,
      "\n"
    )
    .replace(
      /[ \t]+/g,
      " "
    )
    .replace(
      /\n{3,}/g,
      "\n\n"
    )
    .trim();

}


function normalizeSearchText(
  value
) {

  return normalizeText(
    value
  )
    .toLowerCase();

}


// ==================================================
// DOCUMENT TYPE RULES
// ==================================================

const DOCUMENT_TYPE_RULES = {

  // =================================================
  // PRODUCT LABEL
  // =================================================

  productLabel: {

    label:
      "Product label",

    strongPatterns: [

      {
        label:
          "Electrical input specification",

        regex:
          /\binput\s*:?\s*\d{2,3}\s*[-â€“]\s*\d{2,3}\s*v/i,

        weight:
          6
      },

      {
        label:
          "Electrical output specification",

        regex:
          /\boutput\s*:?\s*[\d.]+\s*v/i,

        weight:
          6
      },

      {
        label:
          "Model identifier",

        regex:
          /\b(model|model no\.?|model number)\s*[:#]?\s*[a-z0-9][a-z0-9._/-]{2,}/i,

        weight:
          5
      },

      {
        label:
          "Manufacturer field",

        regex:
          /\bmanufacturer\s*:/i,

        weight:
          4
      },

      {
        label:
          "Importer field",

        regex:
          /\bimporter\s*:/i,

        weight:
          4
      },

      {
        label:
          "Made in statement",

        regex:
          /\bmade in\s+[a-z][a-z ]{2,30}/i,

        weight:
          4
      },

      {
        label:
          "Serial number field",

        regex:
          /\b(serial|s\/n|sn)\s*[:#]\s*[a-z0-9._/-]{3,}/i,

        weight:
          4
      },

      {
        label:
          "Rated voltage",

        regex:
          /\b(rated voltage|rated input|rated output)\b/i,

        weight:
          4
      }

    ],


    positiveSignals: [

      {
        text:
          "manufacturer",

        weight:
          1
      },

      {
        text:
          "importer",

        weight:
          1
      },

      {
        text:
          "model",

        weight:
          1
      },

      {
        text:
          "warning",

        weight:
          1
      },

      {
        text:
          "voltage",

        weight:
          1
      },

      {
        text:
          "input",

        weight:
          1
      },

      {
        text:
          "output",

        weight:
          1
      },

      {
        text:
          "made in",

        weight:
          2
      },

      {
        text:
          "serial",

        weight:
          1
      }

    ],


    negativeSignals: [

      {
        text:
          "table of contents",

        weight:
          8
      },

      {
        text:
          "copyright",

        weight:
          5
      },

      {
        text:
          "all rights reserved",

        weight:
          5
      },

      {
        text:
          "chapter 1",

        weight:
          5
      },

      {
        text:
          "chapter one",

        weight:
          5
      },

      {
        text:
          "introduction",

        weight:
          3
      },

      {
        text:
          "isbn",

        weight:
          6
      },

      {
        text:
          "publisher",

        weight:
          4
      },

      {
        text:
          "ebook",

        weight:
          4
      },

      {
        text:
          "startup",

        weight:
          2
      },

      {
        text:
          "entrepreneur",

        weight:
          2
      }

    ],


    thresholds: {

      likelyMatch:
        9,

      strongMatch:
        14,

      likelyMismatch:
        2

    },


    maxReasonableCharacters:
      30000

  },


  // =================================================
  // PACKAGING
  // =================================================

  packaging: {

    label:
      "Packaging",

    strongPatterns: [

      {
        label:
          "Barcode / EAN",

        regex:
          /\b(ean|upc|barcode)\s*[:#]?\s*\d{8,14}\b/i,

        weight:
          5
      },

      {
        label:
          "Manufacturer field",

        regex:
          /\bmanufacturer\s*:/i,

        weight:
          4
      },

      {
        label:
          "Importer field",

        regex:
          /\bimporter\s*:/i,

        weight:
          4
      },

      {
        label:
          "Made in statement",

        regex:
          /\bmade in\s+[a-z][a-z ]{2,30}/i,

        weight:
          4
      },

      {
        label:
          "Model identifier",

        regex:
          /\bmodel\s*[:#]?\s*[a-z0-9][a-z0-9._/-]{2,}/i,

        weight:
          4
      }

    ],


    positiveSignals: [

      {
        text:
          "manufacturer",

        weight:
          1
      },

      {
        text:
          "importer",

        weight:
          1
      },

      {
        text:
          "warning",

        weight:
          1
      },

      {
        text:
          "barcode",

        weight:
          2
      },

      {
        text:
          "ean",

        weight:
          2
      },

      {
        text:
          "contents",

        weight:
          1
      },

      {
        text:
          "made in",

        weight:
          2
      }

    ],


    negativeSignals: [

      {
        text:
          "table of contents",

        weight:
          7
      },

      {
        text:
          "copyright",

        weight:
          4
      },

      {
        text:
          "chapter",

        weight:
          4
      },

      {
        text:
          "isbn",

        weight:
          6
      },

      {
        text:
          "publisher",

        weight:
          4
      }

    ],


    thresholds: {

      likelyMatch:
        7,

      strongMatch:
        12,

      likelyMismatch:
        1

    },


    maxReasonableCharacters:
      50000

  },


  // =================================================
  // INSTRUCTIONS
  // =================================================

  instructions: {

    label:
      "Instructions / manual",

    strongPatterns: [

      {
        label:
          "Safety instructions",

        regex:
          /\bsafety instructions\b/i,

        weight:
          5
      },

      {
        label:
          "Installation instructions",

        regex:
          /\binstallation instructions\b/i,

        weight:
          5
      },

      {
        label:
          "Operating instructions",

        regex:
          /\boperating instructions\b/i,

        weight:
          5
      },

      {
        label:
          "User manual",

        regex:
          /\b(user manual|instruction manual|owner'?s manual)\b/i,

        weight:
          6
      }

    ],


    positiveSignals: [

      {
        text:
          "warning",

        weight:
          1
      },

      {
        text:
          "safety",

        weight:
          2
      },

      {
        text:
          "installation",

        weight:
          2
      },

      {
        text:
          "operation",

        weight:
          2
      },

      {
        text:
          "maintenance",

        weight:
          2
      },

      {
        text:
          "troubleshooting",

        weight:
          2
      },

      {
        text:
          "instructions",

        weight:
          2
      }

    ],


    negativeSignals: [

      {
        text:
          "table of contents",

        weight:
          1
      },

      {
        text:
          "copyright",

        weight:
          1
      },

      {
        text:
          "startup",

        weight:
          3
      },

      {
        text:
          "marketing",

        weight:
          3
      }

    ],


    thresholds: {

      likelyMatch:
        7,

      strongMatch:
        12,

      likelyMismatch:
        1

    },


    maxReasonableCharacters:
      500000

  },


  // =================================================
  // DECLARATION
  // =================================================

  declaration: {

    label:
      "Declaration of Conformity",

    strongPatterns: [

      {
        label:
          "EU Declaration title",

        regex:
          /\beu declaration of conformity\b/i,

        weight:
          8
      },

      {
        label:
          "Declaration title",

        regex:
          /\bdeclaration of conformity\b/i,

        weight:
          7
      },

      {
        label:
          "Directive reference",

        regex:
          /\bdirective\s+\d{4}\/\d{2,4}\/(?:eu|ec)\b/i,

        weight:
          6
      },

      {
        label:
          "EU regulation reference",

        regex:
          /\bregulation\s*\(eu\)\s*\d{4}\/\d+/i,

        weight:
          6
      },

      {
        label:
          "EN standard",

        regex:
          /\ben\s+\d{3,5}(?:[-:]\d+)*(?:\+\w+\d*)?/i,

        weight:
          4
      },

      {
        label:
          "Authorized signature",

        regex:
          /\b(signature|signed for and on behalf of)\b/i,

        weight:
          3
      }

    ],


    positiveSignals: [

      {
        text:
          "manufacturer",

        weight:
          1
      },

      {
        text:
          "conformity",

        weight:
          2
      },

      {
        text:
          "directive",

        weight:
          2
      },

      {
        text:
          "regulation",

        weight:
          2
      },

      {
        text:
          "harmonised",

        weight:
          2
      },

      {
        text:
          "harmonized",

        weight:
          2
      },

      {
        text:
          "standard",

        weight:
          1
      },

      {
        text:
          "signature",

        weight:
          1
      }

    ],


    negativeSignals: [

      {
        text:
          "table of contents",

        weight:
          7
      },

      {
        text:
          "chapter",

        weight:
          5
      },

      {
        text:
          "isbn",

        weight:
          7
      },

      {
        text:
          "publisher",

        weight:
          5
      },

      {
        text:
          "novel",

        weight:
          5
      }

    ],


    thresholds: {

      likelyMatch:
        10,

      strongMatch:
        16,

      likelyMismatch:
        2

    },


    maxReasonableCharacters:
      100000

  },


  // =================================================
  // TEST REPORT
  // =================================================

  testReport: {

    label:
      "Test report",

    strongPatterns: [

      {
        label:
          "Test report title",

        regex:
          /\btest report\b/i,

        weight:
          6
      },

      {
        label:
          "Report number",

        regex:
          /\breport\s*(no\.?|number)\s*[:#]?\s*[a-z0-9._/-]+/i,

        weight:
          5
      },

      {
        label:
          "Test result",

        regex:
          /\btest result(s)?\b/i,

        weight:
          4
      },

      {
        label:
          "Laboratory",

        regex:
          /\blaborator(y|ies)\b/i,

        weight:
          3
      },

      {
        label:
          "PASS / FAIL result",

        regex:
          /\b(pass|fail|passed|failed)\b/i,

        weight:
          2
      }

    ],


    positiveSignals: [

      {
        text:
          "tested",

        weight:
          1
      },

      {
        text:
          "sample",

        weight:
          1
      },

      {
        text:
          "measurement",

        weight:
          2
      },

      {
        text:
          "standard",

        weight:
          1
      },

      {
        text:
          "laboratory",

        weight:
          2
      },

      {
        text:
          "test result",

        weight:
          2
      }

    ],


    negativeSignals: [

      {
        text:
          "table of contents",

        weight:
          4
      },

      {
        text:
          "chapter",

        weight:
          4
      },

      {
        text:
          "isbn",

        weight:
          6
      },

      {
        text:
          "publisher",

        weight:
          4
      }

    ],


    thresholds: {

      likelyMatch:
        8,

      strongMatch:
        14,

      likelyMismatch:
        1

    },


    maxReasonableCharacters:
      500000

  },


  // =================================================
  // CERTIFICATE
  // =================================================

  certificate: {

    label:
      "Certificate",

    strongPatterns: [

      {
        label:
          "Certificate title",

        regex:
          /\bcertificate\b/i,

        weight:
          3
      },

      {
        label:
          "Certificate number",

        regex:
          /\bcertificate\s*(no\.?|number)\s*[:#]?\s*[a-z0-9._/-]+/i,

        weight:
          6
      },

      {
        label:
          "Validity period",

        regex:
          /\b(valid from|valid until|expiry|expiration date)\b/i,

        weight:
          4
      },

      {
        label:
          "Certification statement",

        regex:
          /\b(this is to certify|hereby certifies|certifies that)\b/i,

        weight:
          6
      }

    ],


    positiveSignals: [

      {
        text:
          "issued",

        weight:
          1
      },

      {
        text:
          "valid",

        weight:
          1
      },

      {
        text:
          "scope",

        weight:
          2
      },

      {
        text:
          "certification",

        weight:
          2
      },

      {
        text:
          "certificate",

        weight:
          1
      }

    ],


    negativeSignals: [

      {
        text:
          "table of contents",

        weight:
          6
      },

      {
        text:
          "chapter",

        weight:
          5
      },

      {
        text:
          "isbn",

        weight:
          7
      },

      {
        text:
          "publisher",

        weight:
          5
      }

    ],


    thresholds: {

      likelyMatch:
        7,

      strongMatch:
        12,

      likelyMismatch:
        1

    },


    maxReasonableCharacters:
      100000

  },


  // =================================================
  // OTHER
  // =================================================

  otherDocument: {

    label:
      "Other compliance document",

    strongPatterns:
      [],

    positiveSignals:
      [],

    negativeSignals:
      [],

    thresholds: {

      likelyMatch:
        999,

      strongMatch:
        999,

      likelyMismatch:
        -999

    },

    maxReasonableCharacters:
      1000000

  }

};


// ==================================================
// DOCUMENT TEXT EXTRACTION
// ==================================================

async function extractDocumentText(
  filePath,
  mimeType,
  originalName = "",
  fieldName = ""
) {

  const extension =
    path
      .extname(
        originalName ||
        filePath
      )
      .toLowerCase();


  // =================================================
  // PDF
  // =================================================

  if (
    mimeType ===
    "application/pdf" ||
    extension ===
    ".pdf"
  ) {

    const buffer =
      fs.readFileSync(
        filePath
      );


    // =================================================
    // V0.11 TEST REPORT PARSER
    // Force pdfjs-dist for Test report PDFs.
    // This isolates a pdf-parse issue observed where a
    // Test report returned the previously parsed PDF text.
    // =================================================

    if (
      fieldName ===
      "testReport"
    ) {

      try {

        const testReportText =
          await extractPdfTextWithPdfJs(
            buffer
          );


        if (
          testReportText.length >=
          30
        ) {

          console.log(
            "LAUNCHGUARD_TEST_REPORT_PDFJS_SUCCESS",
            {
              filePath:
                filePath,

              characterCount:
                testReportText.length
            }
          );


          return {

            supported:
              true,

            reason:
              null,

            method:
              "PDF_TEXT_EXTRACTION_PDFJS_TEST_REPORT",

            text:
              testReportText

          };

        }


        console.warn(
          "LAUNCHGUARD_TEST_REPORT_PDFJS_EMPTY",
          {
            filePath:
              filePath,

            characterCount:
              testReportText.length
          }
        );


      } catch (testReportPdfError) {

        console.warn(
          "LAUNCHGUARD_TEST_REPORT_PDFJS_FAILED",
          {
            filePath:
              filePath,

            message:
              testReportPdfError.message
          }
        );

      }

    }


    // =================================================
    // PRIMARY PDF PARSER: pdf-parse
    // =================================================

    try {

      const result =
        await pdfParse(
          buffer
        );


      const text =
        normalizeText(
          result.text
        );


      if (
        text.length >=
        30
      ) {

        return {

          supported:
            true,

          reason:
            null,

          method:
            "PDF_TEXT_EXTRACTION_PDF_PARSE",

          text:
            text

        };

      }


      console.warn(
        "LAUNCHGUARD_PDF_PRIMARY_EMPTY",
        {
          filePath:
            filePath,

          characterCount:
            text.length
        }
      );


    } catch (primaryError) {

      console.warn(
        "LAUNCHGUARD_PDF_PRIMARY_FAILED",
        {
          filePath:
            filePath,

          message:
            primaryError.message
        }
      );

    }


    // =================================================
    // FALLBACK PDF PARSER: pdfjs-dist
    // =================================================

    try {

      const fallbackText =
        await extractPdfTextWithPdfJs(
          buffer
        );


      if (
        fallbackText.length >=
        30
      ) {

        console.log(
          "LAUNCHGUARD_PDF_FALLBACK_SUCCESS",
          {
            filePath:
              filePath,

            characterCount:
              fallbackText.length
          }
        );


        return {

          supported:
            true,

          reason:
            null,

          method:
            "PDF_TEXT_EXTRACTION_PDFJS_FALLBACK",

          text:
            fallbackText

        };

      }


      console.warn(
        "LAUNCHGUARD_PDF_FALLBACK_EMPTY",
        {
          filePath:
            filePath,

          characterCount:
            fallbackText.length
        }
      );


      return {

        supported:
          false,

        reason:
          "PDF_NO_READABLE_TEXT",

        method:
          "PDF_TEXT_EXTRACTION_PDFJS_FALLBACK",

        text:
          ""

      };


    } catch (fallbackError) {

      console.error(
        "LAUNCHGUARD_PDF_EXTRACTION_ERROR",
        {
          filePath:
            filePath,

          message:
            fallbackError.message
        }
      );


      return {

        supported:
          false,

        reason:
          "PDF_EXTRACTION_FAILED",

        method:
          "PDF_TEXT_EXTRACTION_PRIMARY_AND_FALLBACK_FAILED",

        text:
          ""

      };

    }

  }


  // =================================================
  // TXT
  // =================================================

  if (
    mimeType ===
    "text/plain" ||
    extension ===
    ".txt"
  ) {

    try {

      const rawText =
        fs.readFileSync(
          filePath,
          "utf8"
        );


      const text =
        normalizeText(
          rawText
        );


      return {

        supported:
          true,

        reason:
          null,

        method:
          "PLAIN_TEXT_EXTRACTION",

        text:
          text

      };


    } catch (error) {

      console.error(
        "LAUNCHGUARD_TEXT_EXTRACTION_ERROR",
        {
          filePath:
            filePath,

          message:
            error.message
        }
      );


      return {

        supported:
          false,

        reason:
          "TEXT_EXTRACTION_FAILED",

        method:
          "PLAIN_TEXT_EXTRACTION",

        text:
          ""

      };

    }

  }


  // =================================================
  // NOT SUPPORTED
  // =================================================

  return {

    supported:
      false,

    reason:
      "TEXT_EXTRACTION_NOT_SUPPORTED",

    method:
      null,

    text:
      ""

  };

}


// ==================================================
// COUNT TEXT OCCURRENCES
// ==================================================

function countOccurrences(
  haystack,
  needle
) {

  if (
    !haystack ||
    !needle
  ) {

    return 0;
  }


  let count =
    0;


  let startIndex =
    0;


  while (
    true
  ) {

    const index =
      haystack.indexOf(
        needle,
        startIndex
      );


    if (
      index === -1
    ) {

      break;
    }


    count +=
      1;


    startIndex =
      index +
      needle.length;

  }


  return count;

}


// ==================================================
// POSITIVE SIGNALS
// ==================================================

function analyzePositiveSignals(
  searchText,
  signals
) {

  const matches =
    [];


  let score =
    0;


  for (
    const signal
    of signals
  ) {

    const normalizedSignal =
      signal.text
        .toLowerCase();


    const occurrences =
      countOccurrences(
        searchText,
        normalizedSignal
      );


    if (
      occurrences === 0
    ) {

      continue;
    }


    const cappedOccurrences =
      Math.min(
        occurrences,
        2
      );


    const gainedScore =
      signal.weight *
      cappedOccurrences;


    score +=
      gainedScore;


    matches.push({

      signal:
        signal.text,

      occurrences:
        occurrences,

      score:
        gainedScore

    });

  }


  return {

    score:
      score,

    matches:
      matches

  };

}


// ==================================================
// NEGATIVE SIGNALS
// ==================================================

function analyzeNegativeSignals(
  searchText,
  signals
) {

  const matches =
    [];


  let penalty =
    0;


  for (
    const signal
    of signals
  ) {

    const normalizedSignal =
      signal.text
        .toLowerCase();


    const occurrences =
      countOccurrences(
        searchText,
        normalizedSignal
      );


    if (
      occurrences === 0
    ) {

      continue;
    }


    const cappedOccurrences =
      Math.min(
        occurrences,
        2
      );


    const signalPenalty =
      signal.weight *
      cappedOccurrences;


    penalty +=
      signalPenalty;


    matches.push({

      signal:
        signal.text,

      occurrences:
        occurrences,

      penalty:
        signalPenalty

    });

  }


  return {

    penalty:
      penalty,

    matches:
      matches

  };

}


// ==================================================
// STRUCTURAL PATTERNS
// ==================================================

function analyzeStrongPatterns(
  text,
  patterns
) {

  const matches =
    [];


  let score =
    0;


  for (
    const pattern
    of patterns
  ) {

    const matched =
      pattern.regex.test(
        text
      );


    pattern.regex.lastIndex =
      0;


    if (
      !matched
    ) {

      continue;
    }


    score +=
      pattern.weight;


    matches.push({

      signal:
        pattern.label,

      score:
        pattern.weight

    });

  }


  return {

    score:
      score,

    matches:
      matches

  };

}


// ==================================================
// LONG DOCUMENT PENALTY
// ==================================================

function calculateLengthPenalty(
  textLength,
  maxReasonableCharacters
) {

  if (
    !maxReasonableCharacters ||
    textLength <=
    maxReasonableCharacters
  ) {

    return {

      penalty:
        0,

      reason:
        null

    };

  }


  const ratio =
    textLength /
    maxReasonableCharacters;


  let penalty =
    2;


  if (
    ratio >= 3
  ) {

    penalty =
      5;

  }


  if (
    ratio >= 6
  ) {

    penalty =
      8;

  }


  return {

    penalty:
      penalty,

    reason:
      `Document contains ${textLength} readable characters, which is unusually large for this document type.`

  };

}


// ==================================================
// DOCUMENT TYPE ANALYSIS
// ==================================================

function analyzeDocumentType(
  fieldName,
  extractedText
) {

  const rule =
    DOCUMENT_TYPE_RULES[
    fieldName
    ];


  if (
    !rule
  ) {

    return {

      status:
        "VERIFY",

      confidence:
        "LOW",

      score:
        0,

      positiveScore:
        0,

      structuralScore:
        0,

      negativePenalty:
        0,

      lengthPenalty:
        0,

      positiveMatches:
        [],

      structuralMatches:
        [],

      negativeMatches:
        [],

      reason:
        "Unknown document type."

    };

  }


  const text =
    normalizeText(
      extractedText
    );


  const searchText =
    normalizeSearchText(
      text
    );


  // =================================================
  // NOT ENOUGH TEXT
  // =================================================

  if (
    text.length <
    30
  ) {

    return {

      status:
        "VERIFY",

      confidence:
        "LOW",

      score:
        0,

      positiveScore:
        0,

      structuralScore:
        0,

      negativePenalty:
        0,

      lengthPenalty:
        0,

      positiveMatches:
        [],

      structuralMatches:
        [],

      negativeMatches:
        [],

      reason:
        "Not enough readable text was extracted to verify the document type."

    };

  }


  // =================================================
  // OTHER DOCUMENT
  // =================================================

  if (
    fieldName ===
    "otherDocument"
  ) {

    return {

      status:
        "VERIFY",

      confidence:
        "LOW",

      score:
        0,

      positiveScore:
        0,

      structuralScore:
        0,

      negativePenalty:
        0,

      lengthPenalty:
        0,

      positiveMatches:
        [],

      structuralMatches:
        [],

      negativeMatches:
        [],

      reason:
        "Other compliance documents require manual classification."

    };

  }


  const positive =
    analyzePositiveSignals(
      searchText,
      rule.positiveSignals
    );


  const structural =
    analyzeStrongPatterns(
      text,
      rule.strongPatterns
    );


  const negative =
    analyzeNegativeSignals(
      searchText,
      rule.negativeSignals
    );


  const lengthResult =
    calculateLengthPenalty(
      text.length,
      rule.maxReasonableCharacters
    );


  const rawPositiveScore =
    positive.score +
    structural.score;


  const finalScore =
    rawPositiveScore -
    negative.penalty -
    lengthResult.penalty;


  const hasStrongNegativeEvidence =
    negative.penalty >=
    8;


  const hasStructuralEvidence =
    structural.matches.length >
    0;


  // =================================================
  // STRONG MATCH
  // =================================================

  if (
    finalScore >=
    rule.thresholds.strongMatch &&
    hasStructuralEvidence &&
    !hasStrongNegativeEvidence
  ) {

    return {

      status:
        "LIKELY_MATCH",

      confidence:
        "HIGH",

      score:
        finalScore,

      positiveScore:
        positive.score,

      structuralScore:
        structural.score,

      negativePenalty:
        negative.penalty,

      lengthPenalty:
        lengthResult.penalty,

      positiveMatches:
        positive.matches,

      structuralMatches:
        structural.matches,

      negativeMatches:
        negative.matches,

      lengthReason:
        lengthResult.reason,

      reason:
        `The document contains strong structural and textual indicators consistent with ${rule.label}.`

    };

  }


  // =================================================
  // MEDIUM MATCH
  // =================================================

  if (
    finalScore >=
    rule.thresholds.likelyMatch &&
    hasStructuralEvidence &&
    !hasStrongNegativeEvidence
  ) {

    return {

      status:
        "LIKELY_MATCH",

      confidence:
        "MEDIUM",

      score:
        finalScore,

      positiveScore:
        positive.score,

      structuralScore:
        structural.score,

      negativePenalty:
        negative.penalty,

      lengthPenalty:
        lengthResult.penalty,

      positiveMatches:
        positive.matches,

      structuralMatches:
        structural.matches,

      negativeMatches:
        negative.matches,

      lengthReason:
        lengthResult.reason,

      reason:
        `The document contains several structural indicators consistent with ${rule.label}, but manual confirmation is still advisable.`

    };

  }


  // =================================================
  // MISMATCH
  // =================================================

  if (
    finalScore <=
    rule.thresholds.likelyMismatch ||
    (
      hasStrongNegativeEvidence &&
      !hasStructuralEvidence
    )
  ) {

    return {

      status:
        "LIKELY_MISMATCH",

      confidence:
        hasStrongNegativeEvidence
          ? "HIGH"
          : "MEDIUM",

      score:
        finalScore,

      positiveScore:
        positive.score,

      structuralScore:
        structural.score,

      negativePenalty:
        negative.penalty,

      lengthPenalty:
        lengthResult.penalty,

      positiveMatches:
        positive.matches,

      structuralMatches:
        structural.matches,

      negativeMatches:
        negative.matches,

      lengthReason:
        lengthResult.reason,

      reason:
        `The extracted content does not sufficiently match the expected structure of ${rule.label}, or contains indicators suggesting a different document type.`

    };

  }


  // =================================================
  // UNCERTAIN
  // =================================================

  return {

    status:
      "VERIFY",

    confidence:
      "LOW",

    score:
      finalScore,

    positiveScore:
      positive.score,

    structuralScore:
      structural.score,

    negativePenalty:
      negative.penalty,

    lengthPenalty:
      lengthResult.penalty,

    positiveMatches:
      positive.matches,

    structuralMatches:
      structural.matches,

    negativeMatches:
      negative.matches,

    lengthReason:
      lengthResult.reason,

    reason:
      `Some indicators are present, but the document cannot be reliably classified as ${rule.label}. Manual review is required.`

  };

}


// ==================================================
// WATTAGE HELPERS
// ==================================================

function uniqueNumbers(
  values
) {

  return [
    ...new Set(
      values.filter(
        (
          value
        ) =>
          Number.isFinite(
            value
          )
      )
    )
  ];

}


// ==================================================
// GENERIC WATTAGE EXTRACTION
// ==================================================

function extractAllWattages(
  text
) {

  const normalized =
    normalizeText(
      text
    );


  const values =
    [];


  const regex =
    /\b(\d{1,4}(?:\.\d+)?)\s*w(?:att(?:s)?)?\b/gi;


  let match =
    null;


  while (
    (
      match =
      regex.exec(
        normalized
      )
    ) !== null
  ) {

    const value =
      Number(
        match[1]
      );


    if (
      Number.isFinite(
        value
      )
    ) {

      values.push(
        value
      );

    }

  }


  return uniqueNumbers(
    values
  );

}


// ==================================================
// PRIMARY LISTING WATTAGE
// ==================================================

function extractPrimaryListingWattage(
  product,
  listing
) {

  const parts = [

    product.productName,

    listing.listingTitle,

    listing.bulletPoints,

    listing.description

  ];


  const combinedText =
    parts
      .filter(
        Boolean
      )
      .join(
        "\n"
      );


  const normalized =
    normalizeText(
      combinedText
    );


  const regex =
    /\b(\d{1,4}(?:\.\d+)?)\s*w(?:att(?:s)?)?\b/gi;


  const counts =
    new Map();


  let match =
    null;


  while (
    (
      match =
      regex.exec(
        normalized
      )
    ) !== null
  ) {

    const value =
      Number(
        match[1]
      );


    if (
      !Number.isFinite(
        value
      )
    ) {

      continue;
    }


    counts.set(
      value,
      (
        counts.get(
          value
        ) || 0
      ) + 1
    );

  }


  const entries =
    [
      ...counts.entries()
    ]
      .sort(
        (
          a,
          b
        ) =>
          b[1] -
          a[1]
      );


  if (
    entries.length ===
    0
  ) {

    return {

      primaryValue:
        null,

      values:
        [],

      occurrences:
        {}

    };

  }


  const occurrences =
    {};


  for (
    const [
      value,
      count
    ]
    of entries
  ) {

    occurrences[
      value
    ] =
      count;

  }


  return {

    primaryValue:
      entries[0][0],

    values:
      entries.map(
        (
          entry
        ) =>
          entry[0]
      ),

    occurrences:
      occurrences

  };

}


// ==================================================
// PRODUCT LABEL WATTAGE
// ==================================================

function extractLabelWattage(
  text
) {

  const normalized =
    normalizeText(
      text
    );


  const strongPatterns = [

    {
      label:
        "Maximum Output",

      regex:
        /\bmaximum\s+(?:power\s+)?output\s*:?\s*(\d{1,4}(?:\.\d+)?)\s*w\b/i
    },

    {
      label:
        "Max Output",

      regex:
        /\bmax(?:imum)?\.?\s+output\s*:?\s*(\d{1,4}(?:\.\d+)?)\s*w\b/i
    },

    {
      label:
        "Rated Power",

      regex:
        /\brated\s+power\s*:?\s*(\d{1,4}(?:\.\d+)?)\s*w\b/i
    },

    {
      label:
        "Rated Output",

      regex:
        /\brated\s+output\s*:?\s*(\d{1,4}(?:\.\d+)?)\s*w\b/i
    },

    {
      label:
        "Power",

      regex:
        /\bpower\s*:?\s*(\d{1,4}(?:\.\d+)?)\s*w\b/i
    }

  ];


  const strongMatches =
    [];


  for (
    const pattern
    of strongPatterns
  ) {

    const match =
      normalized.match(
        pattern.regex
      );


    if (
      !match
    ) {

      continue;
    }


    const value =
      Number(
        match[1]
      );


    if (
      !Number.isFinite(
        value
      )
    ) {

      continue;
    }


    strongMatches.push({

      label:
        pattern.label,

      value:
        value

    });

  }


  if (
    strongMatches.length >
    0
  ) {

    return {

      primaryValue:
        strongMatches[0].value,

      values:
        uniqueNumbers(
          strongMatches.map(
            (
              item
            ) =>
              item.value
          )
        ),

      source:
        "EXPLICIT_POWER_FIELD",

      strongMatches:
        strongMatches,

      allDetectedValues:
        extractAllWattages(
          normalized
        )

    };

  }


  const allValues =
    extractAllWattages(
      normalized
    );


  if (
    allValues.length ===
    1
  ) {

    return {

      primaryValue:
        allValues[0],

      values:
        allValues,

      source:
        "SINGLE_WATTAGE_VALUE",

      strongMatches:
        [],

      allDetectedValues:
        allValues

    };

  }


  return {

    primaryValue:
      null,

    values:
      allValues,

    source:
      "AMBIGUOUS_OR_MISSING",

    strongMatches:
      [],

    allDetectedValues:
      allValues

  };

}


// ==================================================
// WATTAGE CONSISTENCY
// ==================================================

function analyzeWattageConsistency(
  product,
  listing,
  productLabelAnalysis,
  productLabelText
) {

  if (
    !productLabelAnalysis
  ) {

    return {

      status:
        "NOT_EVALUATED",

      confidence:
        "LOW",

      listingValues:
        [],

      labelValues:
        [],

      listingPrimaryValue:
        null,

      labelPrimaryValue:
        null,

      reason:
        "No product label analysis is available."

    };

  }


  if (
    productLabelAnalysis.status !==
    "LIKELY_MATCH"
  ) {

    return {

      status:
        "NOT_EVALUATED",

      confidence:
        "LOW",

      listingValues:
        [],

      labelValues:
        [],

      listingPrimaryValue:
        null,

      labelPrimaryValue:
        null,

      reason:
        "Wattage consistency was not evaluated because the uploaded file was not reliably classified as a Product label."

    };

  }


  const listingResult =
    extractPrimaryListingWattage(
      product,
      listing
    );


  const labelResult =
    extractLabelWattage(
      productLabelText
    );


  const listingValue =
    listingResult.primaryValue;


  const labelValue =
    labelResult.primaryValue;


  if (
    listingValue ===
    null
  ) {

    return {

      status:
        "VERIFY",

      confidence:
        "LOW",

      listingValues:
        listingResult.values,

      labelValues:
        labelResult.values,

      listingPrimaryValue:
        null,

      labelPrimaryValue:
        labelValue,

      labelSource:
        labelResult.source,

      reason:
        "No clear planned wattage could be identified in the product name or listing."

    };

  }


  if (
    labelValue ===
    null
  ) {

    return {

      status:
        "VERIFY",

      confidence:
        "LOW",

      listingValues:
        listingResult.values,

      labelValues:
        labelResult.values,

      listingPrimaryValue:
        listingValue,

      labelPrimaryValue:
        null,

      labelSource:
        labelResult.source,

      reason:
        "The product label does not contain a sufficiently clear primary wattage for an automatic comparison."

    };

  }


  if (
    listingValue ===
    labelValue
  ) {

    return {

      status:
        "CONSISTENT",

      confidence:
        "HIGH",

      listingValues:
        listingResult.values,

      labelValues:
        labelResult.values,

      listingPrimaryValue:
        listingValue,

      labelPrimaryValue:
        labelValue,

      labelSource:
        labelResult.source,

      reason:
        `The planned product/listing wattage (${listingValue}W) matches the primary wattage stated on the Product label (${labelValue}W).`

    };

  }


  return {

    status:
      "MISMATCH",

    confidence:
      "HIGH",

    listingValues:
      listingResult.values,

    labelValues:
      labelResult.values,

    listingPrimaryValue:
      listingValue,

    labelPrimaryValue:
      labelValue,

    labelSource:
      labelResult.source,

    reason:
      `The planned product/listing indicates ${listingValue}W, while the Product label indicates ${labelValue}W.`

  };

}


// ==================================================
// COUNTRY NORMALIZATION
// ==================================================

function normalizeCountry(
  value
) {

  const normalized =
    normalizeSearchText(
      value
    )
      .replace(
        /\s+/g,
        " "
      )
      .trim();


  const countryMap = {

    "china":
      "China",

    "prc":
      "China",

    "p.r.c.":
      "China",

    "people's republic of china":
      "China",


    "germany":
      "Germany",

    "deutschland":
      "Germany",


    "italy":
      "Italy",

    "italia":
      "Italy",


    "france":
      "France",


    "spain":
      "Spain",

    "espaÃ±a":
      "Spain",


    "netherlands":
      "Netherlands",

    "the netherlands":
      "Netherlands",


    "poland":
      "Poland",


    "united kingdom":
      "United Kingdom",

    "uk":
      "United Kingdom",

    "u.k.":
      "United Kingdom",


    "united states":
      "United States",

    "united states of america":
      "United States",

    "usa":
      "United States",

    "u.s.a.":
      "United States"

  };


  return (
    countryMap[
    normalized
    ] ||
    null
  );

}


// ==================================================
// MADE-IN COUNTRY EXTRACTION
// ==================================================

function extractLabelOriginCountry(
  text
) {

  const normalized =
    normalizeText(
      text
    );


  const knownPatterns = [

    {
      country:
        "China",

      regex:
        /\bmade\s+in\s+(?:china|prc|p\.?r\.?c\.?|people'?s republic of china)\b/i
    },

    {
      country:
        "Germany",

      regex:
        /\bmade\s+in\s+(?:germany|deutschland)\b/i
    },

    {
      country:
        "Italy",

      regex:
        /\bmade\s+in\s+(?:italy|italia)\b/i
    },

    {
      country:
        "France",

      regex:
        /\bmade\s+in\s+france\b/i
    },

    {
      country:
        "Spain",

      regex:
        /\bmade\s+in\s+(?:spain|espaÃ±a)\b/i
    },

    {
      country:
        "Netherlands",

      regex:
        /\bmade\s+in\s+(?:the\s+)?netherlands\b/i
    },

    {
      country:
        "Poland",

      regex:
        /\bmade\s+in\s+poland\b/i
    },

    {
      country:
        "United Kingdom",

      regex:
        /\bmade\s+in\s+(?:the\s+)?(?:united kingdom|uk|u\.k\.)\b/i
    },

    {
      country:
        "United States",

      regex:
        /\bmade\s+in\s+(?:the\s+)?(?:united states(?: of america)?|usa|u\.s\.a\.)\b/i
    }

  ];


  for (
    const pattern
    of knownPatterns
  ) {

    const match =
      normalized.match(
        pattern.regex
      );


    if (
      match
    ) {

      return {

        country:
          pattern.country,

        rawValue:
          match[0],

        source:
          "MADE_IN_STATEMENT"

      };

    }

  }


  // =================================================
  // UNKNOWN MADE-IN VALUE
  // =================================================

  const genericMatch =
    normalized.match(
      /\bmade\s+in\s+([^\n\r,.;]{2,50})/i
    );


  if (
    genericMatch
  ) {

    const rawValue =
      String(
        genericMatch[1] ||
        ""
      )
        .trim();


    return {

      country:
        normalizeCountry(
          rawValue
        ),

      rawValue:
        rawValue,

      source:
        "UNRECOGNIZED_MADE_IN_STATEMENT"

    };

  }


  return {

    country:
      null,

    rawValue:
      null,

    source:
      "NOT_FOUND"

  };

}


// ==================================================
// MANUFACTURER COUNTRY CONSISTENCY
// ==================================================

function analyzeManufacturerCountryConsistency(
  product,
  productLabelAnalysis,
  productLabelText
) {

  if (
    !productLabelAnalysis ||
    productLabelAnalysis.status !==
    "LIKELY_MATCH"
  ) {

    return {

      status:
        "NOT_EVALUATED",

      confidence:
        "LOW",

      setupCountry:
        null,

      labelCountry:
        null,

      labelRawValue:
        null,

      reason:
        "Manufacturer-country consistency was not evaluated because the uploaded file was not reliably classified as a Product label."

    };

  }


  const setupCountry =
    normalizeCountry(
      product.manufacturerCountry
    );


  const labelResult =
    extractLabelOriginCountry(
      productLabelText
    );


  // =================================================
  // SETUP VALUE CANNOT BE NORMALIZED
  // =================================================

  if (
    !setupCountry
  ) {

    return {

      status:
        "VERIFY",

      confidence:
        "LOW",

      setupCountry:
        product.manufacturerCountry ||
        null,

      labelCountry:
        labelResult.country,

      labelRawValue:
        labelResult.rawValue,

      source:
        labelResult.source,

      reason:
        "The manufacturer country from Product Setup could not be normalized for an automatic comparison."

    };

  }


  // =================================================
  // LABEL COUNTRY NOT FOUND
  // =================================================

  if (
    !labelResult.country
  ) {

    return {

      status:
        "VERIFY",

      confidence:
        "LOW",

      setupCountry:
        setupCountry,

      labelCountry:
        null,

      labelRawValue:
        labelResult.rawValue,

      source:
        labelResult.source,

      reason:
        labelResult.rawValue
          ? `A Made in statement was detected, but the country "${labelResult.rawValue}" could not be interpreted reliably.`
          : "No clear Made in country was identified on the Product label."

    };

  }


  // =================================================
  // CONSISTENT
  // =================================================

  if (
    setupCountry ===
    labelResult.country
  ) {

    return {

      status:
        "CONSISTENT",

      confidence:
        "HIGH",

      setupCountry:
        setupCountry,

      labelCountry:
        labelResult.country,

      labelRawValue:
        labelResult.rawValue,

      source:
        labelResult.source,

      reason:
        `The manufacturer country entered in Product Setup (${setupCountry}) matches the Made in country identified on the Product label (${labelResult.country}).`

    };

  }


  // =================================================
  // MISMATCH
  // =================================================

  return {

    status:
      "MISMATCH",

    confidence:
      "HIGH",

    setupCountry:
      setupCountry,

    labelCountry:
      labelResult.country,

    labelRawValue:
      labelResult.rawValue,

    source:
      labelResult.source,

    reason:
      `Product Setup indicates ${setupCountry}, while the Product label states Made in ${labelResult.country}.`

  };

}


// ==================================================
// MODEL NUMBER NORMALIZATION
// ==================================================

function normalizeModelNumber(
  value
) {

  return String(
    value || ""
  )
    .trim()
    .toUpperCase()
    .replace(
      /\s+/g,
      ""
    );

}


// ==================================================
// MODEL NUMBER EXTRACTION
// ==================================================

function isPlausibleModelNumber(
  value
) {

  const normalized =
    normalizeModelNumber(
      value
    );


  if (
    !normalized ||
    normalized.length < 3 ||
    normalized.length > 80
  ) {

    return false;

  }


  const reservedWords =
    new Set([
      "MODEL",
      "NUMBER",
      "NO",
      "PRODUCT",
      "REPORT",
      "TEST",
      "SAMPLE",
      "RESULT",
      "PASS",
      "FAIL",
      "LABORATORY",
      "STANDARD"
    ]);


  if (
    reservedWords.has(
      normalized
    )
  ) {

    return false;

  }


  /*
    A useful model identifier should normally contain
    at least one digit. This prevents headings such as
    MODEL or PRODUCT from being accepted as identifiers.
  */

  if (
    !/\d/.test(
      normalized
    )
  ) {

    return false;

  }


  return true;

}


function extractModelNumber(
  text
) {

  const normalized =
    normalizeText(
      text
    );


  const patterns = [

    {
      label:
        "Model number",

      regex:
        /\bmodel\s+number\s*[:#]?\s*(?:\n\s*)?([a-z0-9][a-z0-9._\/-]{2,})/i
    },

    {
      label:
        "Model no.",

      regex:
        /\bmodel\s+no\.?\s*[:#]?\s*(?:\n\s*)?([a-z0-9][a-z0-9._\/-]{2,})/i
    },

    {
      label:
        "Model",

      regex:
        /\bmodel\s*[:#]\s*(?:\n\s*)?([a-z0-9][a-z0-9._\/-]{2,})/i
    },

    {
      label:
        "Sample tested",

      regex:
        /\bsample\s+tested\s*[:#]?\s*(?:\n\s*)?([a-z0-9][a-z0-9._\/-]{2,})/i
    }

  ];


  for (
    const pattern
    of patterns
  ) {

    const match =
      normalized.match(
        pattern.regex
      );


    if (
      !match ||
      !match[1]
    ) {

      continue;

    }


    const rawValue =
      String(
        match[1]
      )
        .trim();


    const normalizedValue =
      normalizeModelNumber(
        rawValue
      );


    if (
      !isPlausibleModelNumber(
        normalizedValue
      )
    ) {

      continue;

    }


    return {

      value:
        normalizedValue,

      rawValue:
        rawValue,

      source:
        pattern.label

    };

  }


  return {

    value:
      null,

    rawValue:
      null,

    source:
      "NOT_FOUND"

  };

}



// ==================================================
// MODEL NUMBER CONSISTENCY
// PRODUCT LABEL <-> DECLARATION OF CONFORMITY
// ==================================================

function analyzeModelNumberConsistency(
  productLabelAnalysis,
  productLabelText,
  declarationAnalysis,
  declarationText
) {

  // =================================================
  // REQUIRED DOCUMENTS NOT AVAILABLE
  // =================================================

  if (
    !productLabelAnalysis ||
    !declarationAnalysis
  ) {

    return {

      status:
        "NOT_EVALUATED",

      confidence:
        "LOW",

      productLabelModel:
        null,

      declarationModel:
        null,

      reason:
        "Model-number consistency could not be evaluated because both the Product label and Declaration of Conformity are required."

    };

  }


  // =================================================
  // PRODUCT LABEL NOT RELIABLY CLASSIFIED
  // =================================================

  if (
    productLabelAnalysis.status !==
    "LIKELY_MATCH"
  ) {

    return {

      status:
        "NOT_EVALUATED",

      confidence:
        "LOW",

      productLabelModel:
        null,

      declarationModel:
        null,

      reason:
        "Model-number consistency was not evaluated because the Product label was not reliably classified."

    };

  }


  // =================================================
  // DECLARATION NOT RELIABLY CLASSIFIED
  // =================================================

  if (
    declarationAnalysis.status !==
    "LIKELY_MATCH"
  ) {

    return {

      status:
        "NOT_EVALUATED",

      confidence:
        "LOW",

      productLabelModel:
        null,

      declarationModel:
        null,

      reason:
        "Model-number consistency was not evaluated because the uploaded Declaration of Conformity was not reliably classified."

    };

  }


  const productLabelResult =
    extractModelNumber(
      productLabelText
    );


  const declarationResult =
    extractModelNumber(
      declarationText
    );


  // =================================================
  // PRODUCT LABEL MODEL MISSING
  // =================================================

  if (
    !productLabelResult.value
  ) {

    return {

      status:
        "VERIFY",

      confidence:
        "LOW",

      productLabelModel:
        null,

      declarationModel:
        declarationResult.value,

      productLabelRawValue:
        productLabelResult.rawValue,

      declarationRawValue:
        declarationResult.rawValue,

      reason:
        "No sufficiently clear model number could be identified on the Product label."

    };

  }


  // =================================================
  // DECLARATION MODEL MISSING
  // =================================================

  if (
    !declarationResult.value
  ) {

    return {

      status:
        "VERIFY",

      confidence:
        "LOW",

      productLabelModel:
        productLabelResult.value,

      declarationModel:
        null,

      productLabelRawValue:
        productLabelResult.rawValue,

      declarationRawValue:
        declarationResult.rawValue,

      reason:
        "No sufficiently clear model number could be identified in the Declaration of Conformity."

    };

  }


  // =================================================
  // CONSISTENT
  // =================================================

  if (
    productLabelResult.value ===
    declarationResult.value
  ) {

    return {

      status:
        "CONSISTENT",

      confidence:
        "HIGH",

      productLabelModel:
        productLabelResult.value,

      declarationModel:
        declarationResult.value,

      productLabelRawValue:
        productLabelResult.rawValue,

      declarationRawValue:
        declarationResult.rawValue,

      productLabelSource:
        productLabelResult.source,

      declarationSource:
        declarationResult.source,

      reason:
        `The model number on the Product label (${productLabelResult.value}) matches the model number identified in the Declaration of Conformity (${declarationResult.value}).`

    };

  }


  // =================================================
  // MISMATCH
  // =================================================

  return {

    status:
      "MISMATCH",

    confidence:
      "HIGH",

    productLabelModel:
      productLabelResult.value,

    declarationModel:
      declarationResult.value,

    productLabelRawValue:
      productLabelResult.rawValue,

    declarationRawValue:
      declarationResult.rawValue,

    productLabelSource:
      productLabelResult.source,

    declarationSource:
      declarationResult.source,

    reason:
      `The Product label identifies model ${productLabelResult.value}, while the Declaration of Conformity identifies model ${declarationResult.value}.`

  };

}



// ==================================================
// TEST REPORT MODEL NUMBER CONSISTENCY
// PRODUCT LABEL <-> TEST REPORT
// ==================================================

function analyzeTestReportModelNumberConsistency(
  productLabelAnalysis,
  productLabelText,
  testReportAnalysis,
  testReportText
) {

  if (
    !productLabelAnalysis ||
    !testReportAnalysis
  ) {

    return {

      status:
        "NOT_EVALUATED",

      confidence:
        "LOW",

      productLabelModel:
        null,

      testReportModel:
        null,

      reason:
        "Test-report model-number consistency could not be evaluated because both the Product label and Test report are required."

    };

  }


  if (
    productLabelAnalysis.status !==
    "LIKELY_MATCH"
  ) {

    return {

      status:
        "NOT_EVALUATED",

      confidence:
        "LOW",

      productLabelModel:
        null,

      testReportModel:
        null,

      reason:
        "Test-report model-number consistency was not evaluated because the Product label was not reliably classified."

    };

  }


  if (
    testReportAnalysis.status !==
    "LIKELY_MATCH"
  ) {

    return {

      status:
        "NOT_EVALUATED",

      confidence:
        "LOW",

      productLabelModel:
        null,

      testReportModel:
        null,

      reason:
        "Test-report model-number consistency was not evaluated because the uploaded Test report was not reliably classified."

    };

  }


  const productLabelResult =
    extractModelNumber(
      productLabelText
    );


  const testReportResult =
    extractModelNumber(
      testReportText
    );


  if (
    !productLabelResult.value
  ) {

    return {

      status:
        "VERIFY",

      confidence:
        "LOW",

      productLabelModel:
        null,

      testReportModel:
        testReportResult.value,

      productLabelRawValue:
        productLabelResult.rawValue,

      testReportRawValue:
        testReportResult.rawValue,

      reason:
        "No sufficiently clear model number could be identified on the Product label."

    };

  }


  if (
    !testReportResult.value
  ) {

    return {

      status:
        "VERIFY",

      confidence:
        "LOW",

      productLabelModel:
        productLabelResult.value,

      testReportModel:
        null,

      productLabelRawValue:
        productLabelResult.rawValue,

      testReportRawValue:
        testReportResult.rawValue,

      reason:
        "No sufficiently clear model number could be identified in the Test report."

    };

  }


  if (
    productLabelResult.value ===
    testReportResult.value
  ) {

    return {

      status:
        "CONSISTENT",

      confidence:
        "HIGH",

      productLabelModel:
        productLabelResult.value,

      testReportModel:
        testReportResult.value,

      productLabelRawValue:
        productLabelResult.rawValue,

      testReportRawValue:
        testReportResult.rawValue,

      productLabelSource:
        productLabelResult.source,

      testReportSource:
        testReportResult.source,

      reason:
        `The model number on the Product label (${productLabelResult.value}) matches the model number identified in the Test report (${testReportResult.value}).`

    };

  }


  return {

    status:
      "MISMATCH",

    confidence:
      "HIGH",

    productLabelModel:
      productLabelResult.value,

    testReportModel:
      testReportResult.value,

    productLabelRawValue:
      productLabelResult.rawValue,

    testReportRawValue:
      testReportResult.rawValue,

    productLabelSource:
      productLabelResult.source,

    testReportSource:
      testReportResult.source,

    reason:
      `The Product label identifies model ${productLabelResult.value}, while the Test report identifies model ${testReportResult.value}.`

  };

}

// ==================================================
// PACKAGING MODEL NUMBER CONSISTENCY
// PRODUCT LABEL <-> PACKAGING
// ==================================================

function analyzePackagingModelNumberConsistency(
  productLabelAnalysis,
  productLabelText,
  packagingAnalysis,
  packagingText
) {

  if (
    !productLabelAnalysis ||
    !packagingAnalysis
  ) {

    return {

      status:
        "NOT_EVALUATED",

      confidence:
        "LOW",

      productLabelModel:
        null,

      packagingModel:
        null,

      reason:
        "Packaging model-number consistency could not be evaluated because both the Product label and Packaging are required."

    };

  }


  if (
    productLabelAnalysis.status !==
    "LIKELY_MATCH"
  ) {

    return {

      status:
        "NOT_EVALUATED",

      confidence:
        "LOW",

      productLabelModel:
        null,

      packagingModel:
        null,

      reason:
        "Packaging model-number consistency was not evaluated because the Product label was not reliably classified."

    };

  }


  if (
    packagingAnalysis.status !==
    "LIKELY_MATCH"
  ) {

    return {

      status:
        "NOT_EVALUATED",

      confidence:
        "LOW",

      productLabelModel:
        null,

      packagingModel:
        null,

      reason:
        "Packaging model-number consistency was not evaluated because the uploaded Packaging was not reliably classified."

    };

  }


  const productLabelResult =
    extractModelNumber(
      productLabelText
    );


  const packagingResult =
    extractModelNumber(
      packagingText
    );


  if (
    !productLabelResult.value
  ) {

    return {

      status:
        "VERIFY",

      confidence:
        "LOW",

      productLabelModel:
        null,

      packagingModel:
        packagingResult.value,

      reason:
        "No sufficiently clear model number could be identified on the Product label."

    };

  }


  if (
    !packagingResult.value
  ) {

    return {

      status:
        "VERIFY",

      confidence:
        "LOW",

      productLabelModel:
        productLabelResult.value,

      packagingModel:
        null,

      reason:
        "No sufficiently clear model number could be identified on the Packaging."

    };

  }


  if (
    productLabelResult.value ===
    packagingResult.value
  ) {

    return {

      status:
        "CONSISTENT",

      confidence:
        "HIGH",

      productLabelModel:
        productLabelResult.value,

      packagingModel:
        packagingResult.value,

      reason:
        `The model number on the Product label (${productLabelResult.value}) matches the model number identified on the Packaging (${packagingResult.value}).`

    };

  }


  return {

    status:
      "MISMATCH",

    confidence:
      "HIGH",

    productLabelModel:
      productLabelResult.value,

    packagingModel:
      packagingResult.value,

    reason:
      `The Product label identifies model ${productLabelResult.value}, while the Packaging identifies model ${packagingResult.value}.`

  };

}
// ==================================================
// EN STANDARD NORMALIZATION
// ==================================================

function normalizeEnStandard(
  value
) {

  return String(
    value || ""
  )
    .toUpperCase()
    .replace(
      /\s+/g,
      " "
    )
    .replace(
      /\s*:\s*/g,
      ":"
    )
    .replace(
      /\s*-\s*/g,
      "-"
    )
    .trim();

}


// ==================================================
// EN STANDARD EXTRACTION
// ==================================================

function extractEnStandards(
  text
) {

  const normalized =
    normalizeText(
      text
    );

  const regex =
    /\bEN\s+\d{3,5}(?:-\d+)*(?::\d{4})?(?:\+\w+\d*)?/gi;

  const values =
    [];

  let match =
    null;

  while (
    (
      match =
      regex.exec(
        normalized
      )
    ) !== null
  ) {

    const value =
      normalizeEnStandard(
        match[0]
      );

    if (
      value
    ) {

      values.push(
        value
      );

    }

  }

  return [
    ...new Set(
      values
    )
  ];

}


// ==================================================
// EN STANDARD BASE ID
// ==================================================

function getEnStandardBase(
  value
) {

  const normalized =
    normalizeEnStandard(
      value
    );

  const match =
    normalized.match(
      /^EN\s+\d{3,5}(?:-\d+)*/
    );

  return match
    ? match[0]
    : normalized;

}


// ==================================================
// DECLARATION <-> TEST REPORT STANDARD CONSISTENCY
// ==================================================

function analyzeStandardConsistency(
  declarationAnalysis,
  declarationText,
  testReportAnalysis,
  testReportText
) {

  if (
    !declarationAnalysis ||
    !testReportAnalysis
  ) {

    return {

      status:
        "NOT_EVALUATED",

      confidence:
        "LOW",

      declarationStandards:
        [],

      testReportStandards:
        [],

      matchedStandards:
        [],

      reason:
        "Standard consistency could not be evaluated because both the Declaration of Conformity and Test report are required."

    };

  }

  if (
    declarationAnalysis.status !==
    "LIKELY_MATCH"
  ) {

    return {

      status:
        "NOT_EVALUATED",

      confidence:
        "LOW",

      declarationStandards:
        [],

      testReportStandards:
        [],

      matchedStandards:
        [],

      reason:
        "Standard consistency was not evaluated because the Declaration of Conformity was not reliably classified."

    };

  }

  if (
    testReportAnalysis.status !==
    "LIKELY_MATCH"
  ) {

    return {

      status:
        "NOT_EVALUATED",

      confidence:
        "LOW",

      declarationStandards:
        [],

      testReportStandards:
        [],

      matchedStandards:
        [],

      reason:
        "Standard consistency was not evaluated because the Test report was not reliably classified."

    };

  }

  const declarationStandards =
    extractEnStandards(
      declarationText
    );

  const testReportStandards =
    extractEnStandards(
      testReportText
    );

  if (
    declarationStandards.length ===
    0
  ) {

    return {

      status:
        "VERIFY",

      confidence:
        "LOW",

      declarationStandards:
        [],

      testReportStandards:
        testReportStandards,

      matchedStandards:
        [],

      reason:
        "No EN standard could be identified reliably in the Declaration of Conformity."

    };

  }

  if (
    testReportStandards.length ===
    0
  ) {

    return {

      status:
        "VERIFY",

      confidence:
        "LOW",

      declarationStandards:
        declarationStandards,

      testReportStandards:
        [],

      matchedStandards:
        [],

      reason:
        "No EN standard could be identified reliably in the Test report."

    };

  }

  const declarationBases =
    new Map(
      declarationStandards.map(
        (
          value
        ) => [
            getEnStandardBase(
              value
            ),
            value
          ]
      )
    );

  const testReportBases =
    new Map(
      testReportStandards.map(
        (
          value
        ) => [
            getEnStandardBase(
              value
            ),
            value
          ]
      )
    );

  const matchedBases =
    [
      ...declarationBases.keys()
    ]
      .filter(
        (
          base
        ) =>
          testReportBases.has(
            base
          )
      );

  const matchedStandards =
    matchedBases.map(
      (
        base
      ) => ({

        base:
          base,

        declaration:
          declarationBases.get(
            base
          ),

        testReport:
          testReportBases.get(
            base
          )

      })
    );

  if (
    matchedStandards.length >
    0
  ) {

    return {

      status:
        "CONSISTENT",

      confidence:
        "HIGH",

      declarationStandards:
        declarationStandards,

      testReportStandards:
        testReportStandards,

      matchedStandards:
        matchedStandards,

      reason:
        `The Declaration of Conformity and Test report reference at least one matching EN standard (${matchedStandards.map(item => item.base).join(", ")}).`

    };

  }

  return {

    status:
      "MISMATCH",

    confidence:
      "HIGH",

    declarationStandards:
      declarationStandards,

    testReportStandards:
      testReportStandards,

    matchedStandards:
      [],

    reason:
      `The Declaration of Conformity references ${declarationStandards.join(", ")}, while the Test report references ${testReportStandards.join(", ")}. No matching EN standard was identified.`

  };

}


// ==================================================
// ANALYZE STORED FILE
// ==================================================

async function analyzeStoredFile(
  fieldName,
  file,
  finalPath
) {

  const extraction =
    await extractDocumentText(
      finalPath,
      file.mimetype,
      file.originalname,
      fieldName
    );


  let typeAnalysis =
    null;


  if (
    extraction.supported
  ) {

    typeAnalysis =
      analyzeDocumentType(
        fieldName,
        extraction.text
      );

  } else {

    typeAnalysis = {

      status:
        "VERIFY",

      confidence:
        "LOW",

      score:
        0,

      positiveScore:
        0,

      structuralScore:
        0,

      negativePenalty:
        0,

      lengthPenalty:
        0,

      positiveMatches:
        [],

      structuralMatches:
        [],

      negativeMatches:
        [],

      reason:
        "The document content could not be automatically extracted. Manual review is required."

    };

  }


  const expectedRule =
    DOCUMENT_TYPE_RULES[
    fieldName
    ];


  return {

    originalName:
      fixUploadedFileName(
        file.originalname
      ),

    storedName:
      file.filename,

    mimeType:
      file.mimetype,

    size:
      file.size,


    textExtraction: {

      supported:
        extraction.supported,

      reason:
        extraction.reason,

      method:
        extraction.method ||
        null,

      characterCount:
        extraction.text.length

    },


    documentTypeAnalysis: {

      expectedType:
        expectedRule
          ? expectedRule.label
          : fieldName,

      status:
        typeAnalysis.status,

      confidence:
        typeAnalysis.confidence,

      score:
        typeAnalysis.score,

      positiveScore:
        typeAnalysis.positiveScore,

      structuralScore:
        typeAnalysis.structuralScore,

      negativePenalty:
        typeAnalysis.negativePenalty,

      lengthPenalty:
        typeAnalysis.lengthPenalty,

      positiveMatches:
        typeAnalysis.positiveMatches,

      structuralMatches:
        typeAnalysis.structuralMatches,

      negativeMatches:
        typeAnalysis.negativeMatches,

      lengthReason:
        typeAnalysis.lengthReason ||
        null,

      reason:
        typeAnalysis.reason

    },


    /*
      Temporary full text.

      Required only during this request so that
      cross-evidence analysis can work on the
      complete extracted content.

      It is removed before the JSON is stored.
    */

    extractedText:
      extraction.text,


    extractedTextPreview:
      extraction.text.slice(
        0,
        1800
      )

  };

}


// ==================================================
// SAFE JSON PARSE
// ==================================================

function safeParseJson(
  value
) {

  if (
    typeof value !==
    "string"
  ) {

    return {};

  }


  try {

    return JSON.parse(
      value
    );

  } catch {

    return {};

  }

}


// ==================================================
// DELETE TEMP FILES AFTER ERROR
// ==================================================

function removeFilesIfPresent(
  files
) {

  if (
    !files
  ) {

    return;
  }


  for (
    const fileArray
    of Object.values(
      files
    )
  ) {

    if (
      !Array.isArray(
        fileArray
      )
    ) {

      continue;
    }


    for (
      const file
      of fileArray
    ) {

      if (
        file &&
        file.path &&
        fs.existsSync(
          file.path
        )
      ) {

        try {

          fs.unlinkSync(
            file.path
          );

        } catch (error) {

          console.warn(
            "LAUNCHGUARD_TEMP_FILE_DELETE_ERROR",
            {

              path:
                file.path,

              message:
                error.message

            }
          );

        }

      }

    }

  }

}


// ==================================================
// POST SUBMISSION
// ==================================================

app.post(
  "/api/submissions",

  upload.fields(
    UPLOAD_FIELDS
  ),

  async (
    req,
    res
  ) => {

    try {

      const checkId =
        createCheckId();


      const checkUploadDir =
        path.join(
          UPLOAD_DIR,
          checkId
        );


      ensureDirectory(
        checkUploadDir
      );


      const product =
        safeParseJson(
          req.body.product
        );


      const listing =
        safeParseJson(
          req.body.listing
        );


      const storedFiles =
        {};


      const files =
        req.files ||
        {};


      // =================================================
      // PROCESS + ANALYZE FILES
      // =================================================

      for (
        const [
          fieldName,
          fileArray
        ]
        of Object.entries(
          files
        )
      ) {

        if (
          !Array.isArray(
            fileArray
          ) ||
          fileArray.length ===
          0
        ) {

          continue;
        }


        const file =
          fileArray[0];


        const finalPath =
          path.join(
            checkUploadDir,
            file.filename
          );


        fs.renameSync(
          file.path,
          finalPath
        );


        const analyzedFile =
          await analyzeStoredFile(
            fieldName,
            file,
            finalPath
          );


        storedFiles[
          fieldName
        ] =
          analyzedFile;

      }


      // =================================================
      // CROSS-EVIDENCE CONSISTENCY
      // =================================================

      const consistencyAnalysis =
        {};


      const productLabel =
        storedFiles.productLabel ||
        null;

      const packaging =
        storedFiles.packaging ||
        null;

      const declaration =
        storedFiles.declaration ||
        null;


      const testReport =
        storedFiles.testReport ||
        null;


      if (
        productLabel
      ) {

        // =============================================
        // WATTAGE
        // =============================================

        const wattage =
          analyzeWattageConsistency(

            product,

            listing,

            productLabel
              .documentTypeAnalysis,

            productLabel
              .extractedText ||
            ""

          );


        consistencyAnalysis.wattage =
          wattage;


        // =============================================
        // MANUFACTURER COUNTRY / ORIGIN
        // =============================================

        const manufacturerCountry =
          analyzeManufacturerCountryConsistency(

            product,

            productLabel
              .documentTypeAnalysis,

            productLabel
              .extractedText ||
            ""

          );


        consistencyAnalysis.manufacturerCountry =
          manufacturerCountry;


        /*
          Store both structured consistency checks
          inside documentTypeAnalysis as well.

          This keeps the existing Screen 4 data flow
          compatible with risk-report.js.
        */

        productLabel
          .documentTypeAnalysis
          .contentConsistency = {

          wattage:
            wattage,

          manufacturerCountry:
            manufacturerCountry

        };

      }


      // =================================================
      // MODEL NUMBER
      // PRODUCT LABEL <-> DECLARATION OF CONFORMITY
      // =================================================

      if (
        productLabel &&
        declaration
      ) {

        const modelNumber =
          analyzeModelNumberConsistency(

            productLabel
              .documentTypeAnalysis,

            productLabel
              .extractedText ||
            "",

            declaration
              .documentTypeAnalysis,

            declaration
              .extractedText ||
            ""

          );


        consistencyAnalysis.modelNumber =
          modelNumber;


        if (
          !productLabel
            .documentTypeAnalysis
            .contentConsistency
        ) {

          productLabel
            .documentTypeAnalysis
            .contentConsistency =
            {};

        }


        productLabel
          .documentTypeAnalysis
          .contentConsistency
          .modelNumber =
          modelNumber;


        if (
          !declaration
            .documentTypeAnalysis
            .contentConsistency
        ) {

          declaration
            .documentTypeAnalysis
            .contentConsistency =
            {};

        }


        declaration
          .documentTypeAnalysis
          .contentConsistency
          .modelNumber =
          modelNumber;

      }

      // =================================================
      // PACKAGING MODEL NUMBER
      // PRODUCT LABEL <-> PACKAGING
      // =================================================

      if (
        productLabel &&
        packaging
      ) {

        const packagingModelNumber =
          analyzePackagingModelNumberConsistency(

            productLabel
              .documentTypeAnalysis,

            productLabel
              .extractedText ||
            "",

            packaging
              .documentTypeAnalysis,

            packaging
              .extractedText ||
            ""

          );


        consistencyAnalysis.packagingModelNumber =
          packagingModelNumber;


        if (
          !productLabel
            .documentTypeAnalysis
            .contentConsistency
        ) {

          productLabel
            .documentTypeAnalysis
            .contentConsistency =
            {};

        }


        productLabel
          .documentTypeAnalysis
          .contentConsistency
          .packagingModelNumber =
          packagingModelNumber;


        if (
          !packaging
            .documentTypeAnalysis
            .contentConsistency
        ) {

          packaging
            .documentTypeAnalysis
            .contentConsistency =
            {};

        }


        packaging
          .documentTypeAnalysis
          .contentConsistency
          .modelNumber =
          packagingModelNumber;

      }


      // =================================================
      // TEST REPORT MODEL NUMBER
      // PRODUCT LABEL <-> TEST REPORT
      // =================================================

      if (
        productLabel &&
        testReport
      ) {

        const testReportModelNumber =
          analyzeTestReportModelNumberConsistency(

            productLabel
              .documentTypeAnalysis,

            productLabel
              .extractedText ||
            "",

            testReport
              .documentTypeAnalysis,

            testReport
              .extractedText ||
            ""

          );


        consistencyAnalysis.testReportModelNumber =
          testReportModelNumber;


        if (
          !productLabel
            .documentTypeAnalysis
            .contentConsistency
        ) {

          productLabel
            .documentTypeAnalysis
            .contentConsistency =
            {};

        }


        productLabel
          .documentTypeAnalysis
          .contentConsistency
          .testReportModelNumber =
          testReportModelNumber;


        if (
          !testReport
            .documentTypeAnalysis
            .contentConsistency
        ) {

          testReport
            .documentTypeAnalysis
            .contentConsistency =
            {};

        }


        testReport
          .documentTypeAnalysis
          .contentConsistency
          .modelNumber =
          testReportModelNumber;

      }



      // =================================================
      // EN STANDARD CONSISTENCY
      // DECLARATION OF CONFORMITY <-> TEST REPORT
      // =================================================

      if (
        declaration &&
        testReport
      ) {

        const standardConsistency =
          analyzeStandardConsistency(

            declaration
              .documentTypeAnalysis,

            declaration
              .extractedText ||
            "",

            testReport
              .documentTypeAnalysis,

            testReport
              .extractedText ||
            ""

          );

        consistencyAnalysis.standardConsistency =
          standardConsistency;

        if (
          !declaration
            .documentTypeAnalysis
            .contentConsistency
        ) {

          declaration
            .documentTypeAnalysis
            .contentConsistency =
            {};

        }

        declaration
          .documentTypeAnalysis
          .contentConsistency
          .standardConsistency =
          standardConsistency;

        if (
          !testReport
            .documentTypeAnalysis
            .contentConsistency
        ) {

          testReport
            .documentTypeAnalysis
            .contentConsistency =
            {};

        }

        testReport
          .documentTypeAnalysis
          .contentConsistency
          .standardConsistency =
          standardConsistency;

      }


      // =================================================
      // REMOVE FULL EXTRACTED TEXT
      // =================================================

      for (
        const file
        of Object.values(
          storedFiles
        )
      ) {

        delete file.extractedText;

      }


      // =================================================
      // SUBMISSION ACCESS TOKEN
      // =================================================
      // Return the raw token once to the submitting client.
      // Persist only its SHA-256 hash.

      const accessToken =
        crypto
          .randomBytes(32)
          .toString("hex");


      const accessTokenHash =
        crypto
          .createHash("sha256")
          .update(accessToken)
          .digest("hex");


      // =================================================
      // SUBMISSION
      // =================================================

      const submission = {

        checkId:
          checkId,

        accessTokenHash:
          accessTokenHash,

        status:
          "SUBMITTED_FOR_REVIEW",

        reviewMode:
          "MANUAL_VALIDATION",

        analysisVersion:
          "0.11-secure-submission-access",

        product:
          product,

        listing:
          listing,

        files:
          storedFiles,

        consistencyAnalysis:
          consistencyAnalysis,

        createdAt:
          new Date()
            .toISOString()

      };


      // =================================================
      // SAVE JSON
      // =================================================

      const dataFile =
        path.join(
          DATA_DIR,
          `${checkId}.json`
        );


      fs.writeFileSync(
        dataFile,

        JSON.stringify(
          submission,
          null,
          2
        ),

        "utf8"
      );


      // =================================================
      // LOG
      // =================================================

      console.log(
        "LAUNCHGUARD_SUBMISSION_RECEIVED",
        {

          checkId:
            checkId,

          fileCount:
            Object.keys(
              storedFiles
            ).length,


          analyzedFiles:
            Object.entries(
              storedFiles
            )
              .map(
                (
                  [
                    fieldName,
                    file
                  ]
                ) => {

                  return {

                    fieldName:
                      fieldName,

                    expectedType:
                      file
                        .documentTypeAnalysis
                        .expectedType,

                    status:
                      file
                        .documentTypeAnalysis
                        .status,

                    confidence:
                      file
                        .documentTypeAnalysis
                        .confidence,

                    score:
                      file
                        .documentTypeAnalysis
                        .score

                  };

                }
              ),


          wattageConsistency:
            consistencyAnalysis.wattage
              ? {

                status:
                  consistencyAnalysis
                    .wattage
                    .status,

                listing:
                  consistencyAnalysis
                    .wattage
                    .listingPrimaryValue,

                label:
                  consistencyAnalysis
                    .wattage
                    .labelPrimaryValue,

                confidence:
                  consistencyAnalysis
                    .wattage
                    .confidence

              }
              : null,


          manufacturerCountryConsistency:
            consistencyAnalysis.manufacturerCountry
              ? {

                status:
                  consistencyAnalysis
                    .manufacturerCountry
                    .status,

                setup:
                  consistencyAnalysis
                    .manufacturerCountry
                    .setupCountry,

                label:
                  consistencyAnalysis
                    .manufacturerCountry
                    .labelCountry,

                confidence:
                  consistencyAnalysis
                    .manufacturerCountry
                    .confidence

              }
              : null,


          modelNumberConsistency:
            consistencyAnalysis.modelNumber
              ? {

                status:
                  consistencyAnalysis
                    .modelNumber
                    .status,

                productLabel:
                  consistencyAnalysis
                    .modelNumber
                    .productLabelModel,

                declaration:
                  consistencyAnalysis
                    .modelNumber
                    .declarationModel,

                confidence:
                  consistencyAnalysis
                    .modelNumber
                    .confidence

              }
              : null
          ,
          packagingModelNumberConsistency:
            consistencyAnalysis.packagingModelNumber
              ? {

                status:
                  consistencyAnalysis
                    .packagingModelNumber
                    .status,

                productLabel:
                  consistencyAnalysis
                    .packagingModelNumber
                    .productLabelModel,

                packaging:
                  consistencyAnalysis
                    .packagingModelNumber
                    .packagingModel,

                confidence:
                  consistencyAnalysis
                    .packagingModelNumber
                    .confidence

              }
              : null,

          testReportModelNumberConsistency:
            consistencyAnalysis.testReportModelNumber
              ? {

                status:
                  consistencyAnalysis
                    .testReportModelNumber
                    .status,

                productLabel:
                  consistencyAnalysis
                    .testReportModelNumber
                    .productLabelModel,

                testReport:
                  consistencyAnalysis
                    .testReportModelNumber
                    .testReportModel,

                confidence:
                  consistencyAnalysis
                    .testReportModelNumber
                    .confidence

              }
              : null
          ,


          standardConsistency:
            consistencyAnalysis.standardConsistency
              ? {

                status:
                  consistencyAnalysis
                    .standardConsistency
                    .status,

                declaration:
                  consistencyAnalysis
                    .standardConsistency
                    .declarationStandards,

                testReport:
                  consistencyAnalysis
                    .standardConsistency
                    .testReportStandards,

                matched:
                  consistencyAnalysis
                    .standardConsistency
                    .matchedStandards,

                confidence:
                  consistencyAnalysis
                    .standardConsistency
                    .confidence

              }
              : null

        }
      );


      // =================================================
      // RESPONSE
      // =================================================

      return res
        .status(
          201
        )
        .json({

          ok:
            true,

          checkId:
            checkId,

          accessToken:
            accessToken,

          status:
            submission.status,

          analysisVersion:
            submission.analysisVersion,

          fileCount:
            Object.keys(
              storedFiles
            ).length

        });


    } catch (error) {

      console.error(
        "LAUNCHGUARD_SUBMISSION_ERROR",
        error
      );


      removeFilesIfPresent(
        req.files
      );


      return res
        .status(
          500
        )
        .json({

          ok:
            false,

          error:
            "Submission could not be stored."

        });

    }

  }
);


// ==================================================
// GET SUBMISSION
// ==================================================
// SECURITY:
// Submission data can contain confidential product,
// listing and compliance information.
//
// Retrieval requires the access token returned by
// POST /api/submissions. Only the SHA-256 token hash
// is stored with the submission.
// ==================================================

app.get(
  "/api/submissions/:checkId",

  (
    req,
    res
  ) => {

    try {

      const checkId =
        String(
          req.params.checkId ||
          ""
        )
          .trim()
          .toUpperCase();


      if (
        !isValidCheckId(
          checkId
        )
      ) {

        return res
          .status(400)
          .json({
            ok: false,
            error: "Invalid check ID."
          });

      }


      const authorization =
        String(
          req.get("authorization") ||
          ""
        )
          .trim();


      const bearerMatch =
        authorization.match(
          /^Bearer\s+([a-f0-9]{64})$/i
        );


      if (
        !bearerMatch
      ) {

        return res
          .status(401)
          .json({
            ok: false,
            error: "Submission access token is required."
          });

      }


      const dataFile =
        path.join(
          DATA_DIR,
          `${checkId}.json`
        );


      if (
        !fs.existsSync(
          dataFile
        )
      ) {

        return res
          .status(404)
          .json({
            ok: false,
            error: "Submission not found."
          });

      }


      let submission =
        null;


      try {

        submission =
          JSON.parse(
            fs.readFileSync(
              dataFile,
              "utf8"
            )
          );

      } catch (
        readError
      ) {

        console.error(
          "LAUNCHGUARD_SUBMISSION_READ_ERROR",
          {
            checkId: checkId,
            message: readError.message
          }
        );


        return res
          .status(500)
          .json({
            ok: false,
            error: "Submission could not be loaded."
          });

      }


      const storedHash =
        String(
          submission.accessTokenHash ||
          ""
        );


      if (
        !/^[a-f0-9]{64}$/i.test(
          storedHash
        )
      ) {

        return res
          .status(403)
          .json({
            ok: false,
            error: "Submission access denied."
          });

      }


      const providedHash =
        crypto
          .createHash("sha256")
          .update(bearerMatch[1])
          .digest("hex");


      const storedBuffer =
        Buffer.from(
          storedHash,
          "hex"
        );


      const providedBuffer =
        Buffer.from(
          providedHash,
          "hex"
        );


      const tokenMatches =
        storedBuffer.length ===
          providedBuffer.length &&
        crypto.timingSafeEqual(
          storedBuffer,
          providedBuffer
        );


      if (
        !tokenMatches
      ) {

        console.warn(
          "LAUNCHGUARD_SUBMISSION_ACCESS_DENIED",
          {
            checkId: checkId
          }
        );


        return res
          .status(403)
          .json({
            ok: false,
            error: "Submission access denied."
          });

      }


      const clientSubmission = {
        ...submission
      };


      delete clientSubmission.accessTokenHash;


      return res.json({
        ok: true,
        submission: clientSubmission
      });


    } catch (
      error
    ) {

      console.error(
        "LAUNCHGUARD_SUBMISSION_READ_ERROR",
        error
      );


      return res
        .status(500)
        .json({
          ok: false,
          error: "Submission could not be loaded."
        });

    }

  }
);

// ==================================================
// HEALTH CHECK
// ==================================================

app.get(
  "/api/health",

  (
    req,
    res
  ) => {

    res.json({

      ok:
        true,

      service:
        "LAUNCHGUARD",

        
      version:
        "0.11",

      documentAnalysis:
        true,

      supportedTextDocuments: [
        "PDF",
        "TXT"
      ],

      analysisMode:
        "WEIGHTED_DOCUMENT_TYPE",

      consistencyChecks: [
        "WATTAGE",
        "MANUFACTURER_COUNTRY",
        "MODEL_NUMBER",
        "TEST_REPORT_MODEL_NUMBER",
        "STANDARD_CONSISTENCY",
        "PACKAGING_MODEL_NUMBER"
      ]

    });

  }
);

// ==================================================
// SAVE REPORT FEEDBACK
// ==================================================

app.post(
  "/api/feedback",

  express.json(),

  (
    req,
    res
  ) => {

    try {

      const checkId =
        String(
          req.body.checkId ||
          ""
        )
          .trim()
          .toUpperCase();


      const action =
        String(
          req.body.action ||
          ""
        )
          .trim();


      const wouldReuse =
        String(
          req.body.wouldReuse ||
          ""
        )
          .trim();


      if (
        !isValidCheckId(
          checkId
        )
      ) {

        return res
          .status(
            400
          )
          .json({

            ok:
              false,

            error:
              "Invalid check ID."

          });

      }


      const allowedActions = [
        "changed_listing",
        "changed_documentation",
        "changed_packaging",
        "asked_expert",
        "delayed_launch",
        "no_action"
      ];


      const allowedReuse = [
        "yes",
        "no"
      ];


      if (
        action &&
        !allowedActions.includes(
          action
        )
      ) {

        return res
          .status(
            400
          )
          .json({

            ok:
              false,

            error:
              "Invalid feedback action."

          });

      }


      if (
        wouldReuse &&
        !allowedReuse.includes(
          wouldReuse
        )
      ) {

        return res
          .status(
            400
          )
          .json({

            ok:
              false,

            error:
              "Invalid reuse answer."

          });

      }


      const feedbackFile =
        path.join(
          DATA_DIR,
          "feedback.json"
        );


      let feedbackEntries = [];


      if (
        fs.existsSync(
          feedbackFile
        )
      ) {

        try {

          const raw =
            fs.readFileSync(
              feedbackFile,
              "utf8"
            );


          const parsed =
            JSON.parse(
              raw
            );


          if (
            Array.isArray(
              parsed
            )
          ) {

            feedbackEntries =
              parsed;

          }

        } catch (
          readError
        ) {

          console.error(
            "LAUNCHGUARD_FEEDBACK_READ_ERROR",
            readError
          );

        }

      }


      const feedback = {

        checkId:
          checkId,

        action:
          action,

        wouldReuse:
          wouldReuse,

        updatedAt:
          new Date()
            .toISOString()

      };


      const existingIndex =
        feedbackEntries.findIndex(
          (
            item
          ) =>
            item &&
            item.checkId ===
              checkId
        );


      if (
        existingIndex >= 0
      ) {

        feedbackEntries[
          existingIndex
        ] =
          feedback;

      } else {

        feedbackEntries.push(
          feedback
        );

      }


      fs.writeFileSync(
        feedbackFile,
        JSON.stringify(
          feedbackEntries,
          null,
          2
        ),
        "utf8"
      );


      console.log(
        "LAUNCHGUARD_REPORT_FEEDBACK_SAVED",
        feedback
      );


      return res.json({

        ok:
          true,

        feedback:
          feedback

      });


    } catch (
      error
    ) {

      console.error(
        "LAUNCHGUARD_FEEDBACK_SAVE_ERROR",
        error
      );


      return res
        .status(
          500
        )
        .json({

          ok:
            false,

          error:
            "Feedback could not be saved."

        });

    }

  }
);

// ==================================================
// API 404
// ==================================================

app.use(
  "/api",

  (
    req,
    res
  ) => {

    res
      .status(
        404
      )
      .json({

        ok:
          false,

        error:
          "API endpoint not found."

      });

  }
);


// ==================================================
// ERROR HANDLER
// ==================================================

app.use(
  (
    error,
    req,
    res,
    next
  ) => {

    console.error(
      "LAUNCHGUARD_SERVER_ERROR",
      error
    );


    removeFilesIfPresent(
      req.files
    );


    if (
      error instanceof
      multer.MulterError
    ) {

      return res
        .status(
          400
        )
        .json({

          ok:
            false,

          error:
            error.message

        });

    }


    return res
      .status(
        400
      )
      .json({

        ok:
          false,

        error:
          error.message ||
          "Request failed."

      });

  }
);


// ==================================================
// START SERVER
// ==================================================

app.listen(
  PORT,

  () => {

    console.log(
      ""
    );


    console.log(
      "======================================"
    );


    console.log(
      "LAUNCHGUARD V0.11"
    );


    console.log(
      "======================================"
    );


    console.log(
      `Running: http://localhost:${PORT}`
    );


    console.log(
      `Uploads: ${UPLOAD_DIR}`
    );


    console.log(
      `Data: ${DATA_DIR}`
    );


    console.log(
      "Document analysis: ENABLED"
    );


    console.log(
      "Text extraction: PDF (primary + fallback; Test report via pdfjs) + TXT"
    );


    console.log(
      "Analysis mode: WEIGHTED_DOCUMENT_TYPE"
    );


    console.log(
      "Consistency check: WATTAGE ENABLED"
    );


    console.log(
      "Consistency check: MANUFACTURER COUNTRY ENABLED"
    );


    console.log(
      "Consistency check: MODEL NUMBER ENABLED"
    );


    console.log(
      "Consistency check: TEST REPORT MODEL NUMBER ENABLED"
    );


    console.log(
      "Consistency check: STANDARD CONSISTENCY ENABLED"
    );

    console.log(
      "======================================"
    );


    console.log(
      ""
    );

  }
);
