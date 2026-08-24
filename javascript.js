"use strict";

// ==================================================
// LAUNCHGUARD V0.1
// START SCREEN
// ==================================================

const startButtons = [
  document.getElementById("navStartBtn"),
  document.getElementById("heroStartBtn"),
  document.getElementById("cardStartBtn"),
  document.getElementById("bottomStartBtn")
].filter(Boolean);


// ==================================================
// PLAUSIBLE TRACKING
// ==================================================

function trackEvent(eventName, props = {}) {

  if (
    typeof window.plausible !== "function"
  ) {

    console.warn(
      "PLAUSIBLE_NOT_AVAILABLE",
      eventName
    );

    return;
  }


  try {

    window.plausible(
      eventName,
      {
        props: props
      }
    );


    console.log(
      "PLAUSIBLE_EVENT",
      eventName,
      props
    );

  } catch (error) {

    console.warn(
      "PLAUSIBLE_TRACKING_ERROR",
      eventName,
      error
    );

  }

}


function startPreLaunchCheck(source) {

  console.log(
    "LAUNCHGUARD_PRELAUNCH_START",
    {
      source: source
    }
  );


  trackEvent(
    "Pre-Launch Check Started",
    {
      source: source
    }
  );


  window.location.href =
    "screens/product-setup.html";
}

// ==================================================
// BUTTON EVENTS
// ==================================================

startButtons.forEach((button) => {

  button.addEventListener(
    "click",
    () => {

      startPreLaunchCheck(
        button.id
      );

    }
  );

});