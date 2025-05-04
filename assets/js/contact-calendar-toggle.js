document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  const showFormBtn = document.getElementById('show-form-btn');
  const showCalendarBtn = document.getElementById('show-calendar-btn');
  const formContainer = document.getElementById('contact-form-container');
  const calendarContainer = document.getElementById('calendar-container');
  const calEmbedDiv = document.getElementById('my-cal-inline');
  let calInitialized = false;
  let calInstance = null; // To potentially store the Cal instance

  // Function to display an error message within the calendar container
  function displayCalError(message, type = 'danger') {
    // Clear existing error messages first
    const existingError = calendarContainer.querySelector('.cal-error-message');
    if (existingError) {
      existingError.remove();
    }
    // Create and append new message
    const errorMsg = document.createElement('p');
    errorMsg.className = `text-${type} text-center small mt-4 cal-error-message`; // Add unique class
    errorMsg.textContent = message;
    calendarContainer.appendChild(errorMsg);
  }

  function showFormView() {
    if (formContainer && calendarContainer && showFormBtn && showCalendarBtn) {
      formContainer.classList.remove('d-none');
      calendarContainer.classList.add('d-none');
      showFormBtn.classList.add('btn-primary');
      showFormBtn.classList.remove('btn-outline-primary');
      showCalendarBtn.classList.add('btn-outline-primary');
      showCalendarBtn.classList.remove('btn-primary');
      // Optionally destroy or hide Cal instance if needed
      // e.g., if (calInstance && typeof calInstance.hide === 'function') calInstance.hide();
    }
  }

  function showCalendarView() {
    if (
      formContainer &&
      calendarContainer &&
      showFormBtn &&
      showCalendarBtn &&
      calEmbedDiv
    ) {
      formContainer.classList.add('d-none');
      calendarContainer.classList.remove('d-none');
      showCalendarBtn.classList.add('btn-primary');
      showCalendarBtn.classList.remove('btn-outline-primary');
      showFormBtn.classList.add('btn-outline-primary');
      showFormBtn.classList.remove('btn-primary');

      // Check if Cal.com library is loaded
      if (typeof Cal !== 'function') {
        displayCalError('Calendar components failed to load. Please refresh or use the message form.', 'danger');
        return;
      }

      // Check if the embed div has the necessary data attribute
      const calLink = calEmbedDiv.dataset.calLink;
      if (!calLink) {
        displayCalError('Calendar configuration error (missing data-cal-link attribute on #my-cal-inline).', 'danger');
        return;
      }

      // Check if initialization is needed OR if the iframe is missing/broken
      if (!calInitialized || !calEmbedDiv.querySelector('iframe')) {
        calEmbedDiv.innerHTML = ''; // Clear previous attempts or errors first
        displayCalError('Loading calendar...', 'warning'); // Show a loading/attempting message

        // Use the modern async initialization pattern for Cal.com embeds
        (async function () {
          try {
            calInstance = await Cal("inline", { // Store the instance if needed later
              elementOrSelector: "#my-cal-inline", // Target the div
              calLink: calLink,                    // Use the link from data attribute
              layout: "month_view"                 // Optional: customize layout
            });
            console.log("Calendar initialized successfully.");
            calInitialized = true;
            // Remove loading message on success
            const loadingMsg = calendarContainer.querySelector('.cal-error-message.text-warning');
            if (loadingMsg) loadingMsg.remove();

          } catch (initError) {
            console.error('Error initializing Cal.com inline embed:', initError);
            // Display a user-friendly error message IN the container
            displayCalError('Failed to load calendar. Please refresh or use the message form.', 'danger');
            calInitialized = false; // Reset flag so it tries again if clicked back
          }
        })(); // Immediately invoke the async function

      } else {
        // Calendar seems initialized and iframe exists, remove any stray error messages
        const existingError = calendarContainer.querySelector('.cal-error-message');
        if (existingError) existingError.remove();
        // Optionally ensure it's visible if previously hidden:
        // if (calInstance && typeof calInstance.show === 'function') calInstance.show();
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
    showFormView();
  } else {
    console.warn("Could not set initial view for contact/calendar toggle due to missing elements.");
  }

}); // End DOMContentLoaded
