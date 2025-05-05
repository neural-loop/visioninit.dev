document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  const showFormBtn = document.getElementById('show-form-btn');
  const showCalendarBtn = document.getElementById('show-calendar-btn');
  const formContainer = document.getElementById('contact-form-container');
  const calendarContainer = document.getElementById('calendar-container');
  const calEmbedDiv = document.getElementById('my-cal-inline');
  const calErrorMessageDiv = document.getElementById('cal-error-message');

  let calScriptLoaded = false;
  let calInitialized = false; // Now specifically tracks if the *inline embed* was initialized

  function displayCalError(message, type = 'danger') {
    if (calErrorMessageDiv) {
      calErrorMessageDiv.className = `text-${type} text-center small mt-4`;
      calErrorMessageDiv.textContent = message;
    }
    if (calEmbedDiv) {
      const loadingMsg = calEmbedDiv.querySelector('p');
      if (loadingMsg && loadingMsg.textContent.includes('Loading Calendar')) {
        loadingMsg.remove();
      }
    }
  }

  function clearCalError() {
    if (calErrorMessageDiv) {
      calErrorMessageDiv.textContent = '';
      calErrorMessageDiv.className = 'text-center small mt-4';
    }
  }

  // Function to load the Cal.com embed script AND initialize the base Cal object
  function loadAndInitCalBase() {
    return new Promise((resolve, reject) => {
      if (calScriptLoaded) {
        console.log('Cal.com script already processed.');
        // Ensure Cal exists if script was loaded but maybe initialization failed before
        if (typeof Cal === 'function') {
          resolve();
        } else {
          reject(new Error("Cal script marked loaded, but Cal function not found."));
        }
        return;
      }

      console.log('Loading and initializing Cal.com base...');
      displayCalError('Loading calendar...', 'info'); // Show loading message

      // --- Replicate the IIFE logic manually ---
      (function (C, A, L) {
        let p = function (a, ar) { a.q.push(ar); };
        let d = C.document;
        C.Cal = C.Cal || function () {
          let cal = C.Cal;
          let ar = arguments;
          if (!cal.loaded) {
            cal.ns = {};
            cal.q = cal.q || [];
            const script = d.createElement("script"); // Create script tag
            script.src = A;
            script.async = true;
            script.onload = () => { // === Success Callback ===
              console.log('Cal.com embed.js script loaded successfully.');
              calScriptLoaded = true;
              // Now that the script is loaded, the queued commands (like "init")
              // should be processed automatically by embed.js
              // We can now resolve the promise
              resolve();
            };
            script.onerror = (err) => { // === Error Callback ===
              console.error('Failed to load Cal.com embed.js script:', err);
              displayCalError('Failed to load calendar script. Please refresh or use the message form.', 'danger');
              reject(err); // Reject the promise on script load error
            };
            d.head.appendChild(script); // Append script to start loading
            cal.loaded = true;
          }
          // Queue arguments
          if (ar[0] === L) {
            const api = function () { p(api, arguments); };
            const namespace = ar[1];
            api.q = api.q || [];
            if(typeof namespace === "string"){
              cal.ns[namespace] = cal.ns[namespace] || api;
              p(cal.ns[namespace], ar);
              p(cal, ["initNamespace", namespace]);
            } else p(cal, ar);
            return;
          }
          p(cal, ar);
        };
      })(window, "https://app.cal.com/embed/embed.js", "init");

      // --- Manually call the first initialization commands ---
      // These will be queued by the function above if Cal wasn't loaded,
      // or executed directly if it was (though we check calScriptLoaded first).
      try {
        if (typeof Cal === 'function') { // Check if Cal was created by the IIFE
          Cal("init", "30min", {origin:"https://cal.com"}); // Queue the base init
          console.log('Cal("init") command queued/executed.');
          // Don't resolve here yet, wait for the script.onload
        } else {
          throw new Error("Cal function was not created by the IIFE.");
        }
      } catch (initError) {
        console.error("Error during initial Cal setup:", initError);
        displayCalError('Failed to setup calendar components.', 'danger');
        reject(initError);
      }

    }); // End Promise
  }

  // Function to initialize JUST the inline embed part (assumes base is initialized)
  function initializeInlineEmbed() {
    if (calInitialized || !calEmbedDiv || typeof Cal !== 'function' || !Cal.ns || !Cal.ns["30min"]) {
      console.log('Skipping inline initialization (already done, div missing, or Cal base not ready).');
      return;
    }
    const calLink = calEmbedDiv.dataset.calLink;
    if (!calLink) {
      displayCalError('Calendar configuration error (missing data-cal-link).', 'danger');
      return;
    }

    // Clear loading/error messages
    clearCalError();
    const loadingMsg = calEmbedDiv.querySelector('p');
    if (loadingMsg) loadingMsg.remove();

    console.log('Initializing Cal.com *inline* embed...');
    try {
      // Initialize the specific namespace and embed
      Cal.ns["30min"]("inline", {
        elementOrSelector: "#my-cal-inline",
        calLink: calLink,
        config: { "layout": "month_view" }
      });
      // Apply UI settings
      Cal.ns["30min"]("ui", { "hideEventTypeDetails": false, "layout": "month_view" });

      console.log('Cal.com inline embed initialized.');
      calInitialized = true; // Mark inline embed as initialized
    } catch (error) {
      console.error('Error initializing Cal.com inline embed:', error);
      displayCalError('Failed to initialize calendar view. Please refresh or use the message form.', 'danger');
    }
  }

  // --- Event Handlers for Buttons ---

  function showFormView() {
    if (formContainer && calendarContainer && showFormBtn && showCalendarBtn) {
      formContainer.classList.remove('d-none');
      calendarContainer.classList.add('d-none');
      showFormBtn.classList.add('btn-primary');
      showFormBtn.classList.remove('btn-outline-primary');
      showCalendarBtn.classList.add('btn-outline-primary');
      showCalendarBtn.classList.remove('btn-primary');
      clearCalError();
    } else {
      console.warn("Toggle elements missing for form view.");
    }
  }

  async function showCalendarView() {
    if (formContainer && calendarContainer && showFormBtn && showCalendarBtn && calEmbedDiv) {
      formContainer.classList.add('d-none');
      calendarContainer.classList.remove('d-none');
      showCalendarBtn.classList.add('btn-primary');
      showCalendarBtn.classList.remove('btn-outline-primary');
      showFormBtn.classList.add('btn-outline-primary');
      showFormBtn.classList.remove('btn-primary');
      clearCalError();

      try {
        // Load the script and initialize the base Cal object if needed
        if (!calScriptLoaded) {
          await loadAndInitCalBase(); // This now handles loading and base init
        }

        // Once the base script is loaded and Cal is available, init the inline part
        if (typeof Cal === 'function' && Cal.ns && Cal.ns["30min"]) {
          initializeInlineEmbed(); // Initialize the specific embed
        } else {
          // This might happen if script load succeeded but internal setup failed
          console.error('Cal function or namespace not available after script load.');
          if (!calErrorMessageDiv || !calErrorMessageDiv.textContent) { // Avoid overwriting specific load errors
            displayCalError('Calendar components failed to initialize correctly.', 'danger');
          }
        }
      } catch (error) {
        // Errors during loading/base init are caught here
        console.error('Error occurred during calendar view setup:', error);
        // Display a generic error if a specific one wasn't already shown
        if (!calErrorMessageDiv || !calErrorMessageDiv.textContent) {
          displayCalError('An error occurred loading the calendar.', 'danger');
        }
      }

    } else {
      // Log issues if elements are missing
      if (!formContainer) console.warn("Calendar Toggle: Form container not found.");
      if (!calendarContainer) console.warn("Calendar Toggle: Calendar container not found.");
      if (!showFormBtn || !showCalendarBtn) console.warn("Calendar Toggle: Toggle buttons not found.");
      if (!calEmbedDiv) console.warn("Calendar Toggle: Cal.com embed div (#my-cal-inline) not found.");
    }
  }

  // Add Event Listeners
  if (showFormBtn) {
    showFormBtn.addEventListener('click', showFormView);
  }
  if (showCalendarBtn) {
    showCalendarBtn.addEventListener('click', showCalendarView);
  }

  // Set Initial State (show form by default)
  if (formContainer && calendarContainer && showFormBtn && showCalendarBtn) {
    showFormView(); // Start with the form visible
  } else {
    console.warn("Could not set initial view for contact/calendar toggle due to missing elements.");
  }

}); // End DOMContentLoaded
