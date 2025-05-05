// assets/js/contact-calendar-toggle.js (Dynamic Loading Version)
document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  const showFormBtn = document.getElementById('show-form-btn');
  const showCalendarBtn = document.getElementById('show-calendar-btn');
  const formContainer = document.getElementById('contact-form-container');
  const calendarContainer = document.getElementById('calendar-container');
  const calEmbedDiv = document.getElementById('my-cal-inline');
  const calErrorMessageDiv = document.getElementById('cal-error-message');

  let calScriptLoaded = false; // Flag to track if the Cal script has been loaded
  let calInitialized = false; // Flag to track if Cal('inline',...) has been called

  // Function to display an error message
  function displayCalError(message, type = 'danger') {
    if (calErrorMessageDiv) {
      calErrorMessageDiv.className = `text-${type} text-center small mt-4`;
      calErrorMessageDiv.textContent = message;
    }
    // Also clear the loading message in the main embed div if it exists
    if (calEmbedDiv) {
      const loadingMsg = calEmbedDiv.querySelector('p');
      if (loadingMsg && loadingMsg.textContent.includes('Loading Calendar')) {
        loadingMsg.remove();
      }
    }
  }

  // Function to clear error messages
  function clearCalError() {
    if (calErrorMessageDiv) {
      calErrorMessageDiv.textContent = '';
      calErrorMessageDiv.className = 'text-center small mt-4'; // Reset class
    }
  }

  // Function to load the main Cal.com embed script
  function loadCalScript() {
    return new Promise((resolve, reject) => {
      if (calScriptLoaded) {
        console.log('Cal.com script already loaded.');
        resolve();
        return;
      }
      console.log('Loading Cal.com script...');
      const script = document.createElement('script');
      script.src = 'https://app.cal.com/embed/embed.js';
      script.async = true;
      script.onload = () => {
        console.log('Cal.com script loaded successfully.');
        calScriptLoaded = true;
        resolve();
      };
      script.onerror = (err) => {
        console.error('Failed to load Cal.com script:', err);
        displayCalError('Failed to load calendar script. Please refresh or use the message form.', 'danger');
        reject(err);
      };
      document.body.appendChild(script);
    });
  }

  // Function to initialize the inline calendar embed
  function initializeCalendar() {
    if (calInitialized || !calEmbedDiv) {
      console.log('Calendar already initialized or embed div missing.');
      return; // Don't re-initialize or if div is gone
    }
    const calLink = calEmbedDiv.dataset.calLink;
    if (!calLink) {
      displayCalError('Calendar configuration error (missing data-cal-link).', 'danger');
      return;
    }

    // Clear any previous error messages and remove loading text
    clearCalError();
    const loadingMsg = calEmbedDiv.querySelector('p');
    if (loadingMsg) loadingMsg.remove();


    console.log('Initializing Cal.com embed...');
    try {
      // Use the standard Cal() function now that the script is loaded
      Cal("init", "30min", {origin:"https://cal.com"}); // Initialize base Cal
      Cal.ns["30min"]("inline", { // Initialize the specific namespace and embed
        elementOrSelector:"#my-cal-inline",
        calLink: calLink, // Use data attribute
        config: {"layout":"month_view"} // Your config
      });
      Cal.ns["30min"]("ui", {"hideEventTypeDetails":false,"layout":"month_view"}); // Apply UI settings

      console.log('Cal.com inline embed initialized.');
      calInitialized = true; // Set flag
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
      clearCalError(); // Clear errors when switching away
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
      clearCalError(); // Clear previous errors

      // Load script if needed, then initialize calendar
      try {
        if (!calScriptLoaded) {
          displayCalError('Loading calendar...', 'info'); // Show loading message
          await loadCalScript(); // Wait for the script to load
        }
        // Ensure Cal function exists before trying to use it
        if (typeof Cal === 'function') {
          initializeCalendar(); // Initialize if not already done
        } else {
          // This case might happen if the script loaded but something went wrong internally
          console.error('Cal function is not available after script load.');
          displayCalError('Calendar components failed to initialize correctly.', 'danger');
        }
      } catch (error) {
        // Error during script loading is handled in loadCalScript
        console.error('Error occurred during calendar view setup:', error);
        // Potentially display a generic error if not already shown by loadCalScript
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
