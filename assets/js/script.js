(function ($) {
  'use strict';

  // Sticky Menu
  $(window).scroll(function () {
    var height = $('.top-header').innerHeight();
    if ($('header').offset().top > 10) {
      $('.top-header').addClass('hide');
      $('.navigation').addClass('nav-bg');
      $('.navigation').css('margin-top', '-' + height + 'px');
    } else {
      $('.top-header').removeClass('hide');
      $('.navigation').removeClass('nav-bg');
      $('.navigation').css('margin-top', '-' + 0 + 'px');
    }
  });

  // Background-images
  $('[data-background]').each(function () {
    $(this).css({
      'background-image': 'url(' + $(this).data('background') + ')',
    });
  });

  // --- START: OG Preview Effect Function ---
  function initializeOgPreviewEffects() {
    const effectWrappers = document.querySelectorAll(
      '.og-preview-wrapper[data-effect-probability]'
    );
    effectWrappers.forEach((wrapper) => {
      const probability = parseInt(wrapper.dataset.effectProbability, 10) || 0;
      const duration = parseInt(wrapper.dataset.effectDuration, 10) || 750;
      const effectOverlay = wrapper.querySelector('.og-effect-overlay');
      const availableEffects = ['glitch', 'static', 'warble']; // Make sure these classes exist in CSS

      if (!effectOverlay || availableEffects.length === 0) {
        return;
      }

      const shouldPlayEffect = Math.random() * 100 < probability;

      if (shouldPlayEffect) {
        const chosenEffect =
          availableEffects[Math.floor(Math.random() * availableEffects.length)];
        const effectClass = `effect-${chosenEffect}`;

        effectOverlay.style.animationDuration = `${duration}ms`;
        effectOverlay.classList.add(effectClass, 'animate-effect');

        // Optional: Add specific setup for certain effects if needed (like applying SVG filter)
        const imageElement = wrapper.querySelector('.og-preview-image');
        if (chosenEffect === 'warble' && imageElement) {
          imageElement.style.filter = 'url(#og-warble-filter)';
        }

        effectOverlay.addEventListener(
          'animationend',
          () => {
            effectOverlay.classList.remove(effectClass, 'animate-effect');
            effectOverlay.style.animationDuration = '';
            // Optional: Remove filter after animation
            if (chosenEffect === 'warble' && imageElement) {
              imageElement.style.filter = '';
            }
          },
          { once: true }
        );
      }
    });
  }
  // --- END: OG Preview Effect Function ---

  // Execute when the DOM is fully loaded
  $(document).ready(function () {
    // Initialize OG Preview Effects (if enabled)
    setTimeout(initializeOgPreviewEffects, 100); // Small delay

    // Cookie Consent Logic
    const cookieBox = document.getElementById('js-cookie-box');
    const cookieButton = document.getElementById('js-cookie-button');

    if (cookieBox && cookieButton && typeof Cookies !== 'undefined') {
      if (!Cookies.get('cookie-box')) {
        cookieBox.classList.remove('cookie-box-hide');
        cookieButton.onclick = function () {
          const expireDaysAttr = cookieBox.getAttribute('data-expire-days');
          const expireDays = parseInt(expireDaysAttr) || 30;
          Cookies.set('cookie-box', true, {
            expires: expireDays,
            path: '/',
          });
          cookieBox.classList.add('cookie-box-hide');
        };
      }
    } // End Cookie Consent Logic

    // --- START: Contact/Calendar Toggle Logic ---
    const showFormBtn = document.getElementById('show-form-btn');
    const showCalendarBtn = document.getElementById('show-calendar-btn');
    const formContainer = document.getElementById('contact-form-container');
    const calendarContainer = document.getElementById('calendar-container');
    const calEmbedDiv = document.getElementById('my-cal-inline'); // Get the target div

    let calInitialized = false; // Flag to track if we've tried to initialize Cal

    function showFormView() {
      if (
        formContainer &&
        calendarContainer &&
        showFormBtn &&
        showCalendarBtn
      ) {
        formContainer.classList.remove('d-none');
        calendarContainer.classList.add('d-none');
        // Update button styles
        showFormBtn.classList.add('btn-light');
        showFormBtn.classList.remove('btn-outline-light');
        showCalendarBtn.classList.add('btn-outline-light');
        showCalendarBtn.classList.remove('btn-light');
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
        // Update view visibility
        formContainer.classList.add('d-none');
        calendarContainer.classList.remove('d-none');
        // Update button styles
        showCalendarBtn.classList.add('btn-light');
        showCalendarBtn.classList.remove('btn-outline-light');
        showFormBtn.classList.add('btn-outline-light');
        showFormBtn.classList.remove('btn-light');

        // Check if Cal object exists and if the embed div needs initialization
        if (typeof Cal === 'function') {
          // Only try to initialize if we haven't successfully done it before OR if the iframe isn't there yet
          if (!calInitialized || !calEmbedDiv.querySelector('iframe')) {
            try {
              Cal('init'); // Trigger initialization for elements with data-cal-link
              // Check *after* calling init if the iframe appeared
              if (calEmbedDiv.querySelector('iframe')) {
                calInitialized = true; // Mark as initialized successfully
              } else {
                // Optional: Display a message if init doesn't seem to work
                if (!calendarContainer.querySelector('.cal-error-message')) {
                  // Avoid adding multiple error messages
                  const errorMsg = document.createElement('p');
                  errorMsg.className =
                    'text-warning text-center small mt-4 cal-error-message';
                  errorMsg.textContent =
                    "Trying to load calendar... If it doesn't appear, please refresh the page.";
                  calendarContainer.appendChild(errorMsg);
                }
              }
            } catch (e) {
              // Error during Cal("init")
              if (!calendarContainer.querySelector('.cal-error-message')) {
                const errorMsg = document.createElement('p');
                errorMsg.className =
                  'text-danger text-center small mt-4 cal-error-message';
                errorMsg.textContent =
                  'Error initializing calendar. Please refresh or use the message form.';
                calendarContainer.appendChild(errorMsg);
              }
              calInitialized = false; // Reset flag on error
            }
          }
        } else {
          // Cal object not found - global script might have failed
          if (!calendarContainer.querySelector('.cal-error-message')) {
            const errorMsg = document.createElement('p');
            errorMsg.className =
              'text-danger text-center small mt-4 cal-error-message';
            errorMsg.textContent =
              'Calendar components failed to load. Please refresh or use the message form.';
            calendarContainer.appendChild(errorMsg);
          }
        }

        // Check for data-cal-link attribute presence (independent of Cal object)
        if (!calEmbedDiv.dataset.calLink) {
          if (!calendarContainer.querySelector('.cal-error-message')) {
            const errorMsg = document.createElement('p');
            errorMsg.className =
              'text-danger text-center small mt-4 cal-error-message';
            errorMsg.textContent = 'Calendar configuration error.';
            calendarContainer.appendChild(errorMsg);
          }
        }
      } else {
        // Could not show calendar view - essential elements missing
      }
    }

    // Add Event Listeners for Toggle
    if (showFormBtn) {
      showFormBtn.addEventListener('click', showFormView);
    }
    if (showCalendarBtn) {
      showCalendarBtn.addEventListener('click', showCalendarView);
    }

    // Initial State for Toggle
    if (formContainer && calendarContainer && showFormBtn && showCalendarBtn) {
      showFormView(); // Start with the form visible
    }
    // --- END: Contact/Calendar Toggle Logic ---

    // --- START: AJAX Contact Form Submission ---
    const contactForm = document.getElementById('contact-message-form');
    const formFeedback = document.getElementById('form-feedback');
    const submitButton = contactForm
      ? contactForm.querySelector('button[type="submit"]')
      : null;

    if (contactForm && formFeedback && submitButton) {
      contactForm.addEventListener('submit', function (event) {
        event.preventDefault();

        const formData = new FormData(contactForm);
        const submitButtonOriginalText = submitButton.innerHTML;

        // Provide visual feedback
        submitButton.disabled = true;
        submitButton.innerHTML =
          '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Sending...';
        formFeedback.innerHTML = ''; // Clear previous feedback
        formFeedback.className = 'mt-3 small'; // Reset classes

        fetch(contactForm.action, {
          // Action should be "/send_email.php"
          method: 'POST',
          body: formData,
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
            Accept: 'application/json', // Expect JSON response
          },
        })
          .then((response) => {
            if (!response.ok) {
              // Handle HTTP errors (like 404, 500)
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json(); // Parse the JSON response from PHP
          })
          .then((data) => {
            if (data.status === 'success') {
              formFeedback.textContent = data.message;
              formFeedback.classList.add('alert', 'alert-success');
              contactForm.reset(); // Clear the form fields
            } else {
              // Display error message from PHP
              formFeedback.textContent = data.message || 'An error occurred.';
              formFeedback.classList.add('alert', 'alert-danger');
            }
          })
          .catch((error) => {
            console.error('Form submission error:', error); // Keep this console error for debugging fetch issues
            formFeedback.textContent =
              'A network error occurred sending your message. Please try again.';
            formFeedback.classList.add('alert', 'alert-danger');
          })
          .finally(() => {
            // Restore button regardless of success or error
            submitButton.disabled = false;
            submitButton.innerHTML = submitButtonOriginalText;
          });
      });
    }
    // --- END: AJAX Contact Form Submission ---
  }); // END $(document).ready()
})(jQuery);
