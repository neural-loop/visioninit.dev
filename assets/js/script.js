(function ($) {
  'use strict';

  // --- START: Sticky Header Logic ---
  function handleStickyHeader() {
    const header = document.querySelector('.header'); // Main header element
    const navigation = document.querySelector('.navigation'); // The nav bar itself
    const topHeader = document.querySelector('.top-header'); // Optional top bar
    const breadcrumbs = document.querySelector('.sticky-breadcrumbs-wrapper');
    const mainContent = document.querySelector('main'); // Assumes <main> tag wraps primary content
    const body = document.body;

    if (!header || !navigation) {
      // console.warn("Sticky Header: Missing header or navigation element.");
      return;
    }

    let isNavSticky = false;
    const topHeaderHeight = topHeader ? topHeader.offsetHeight : 0;

    // --- Function to update breadcrumb position ---
    const adjustBreadcrumbTop = () => {
      if (!breadcrumbs) return;
      // Always measure the current height of the navigation element
      const currentNavHeight = navigation.offsetHeight;
      breadcrumbs.style.top = `${currentNavHeight}px`;
      // console.log(`JS: Set breadcrumb top to ${currentNavHeight}px`);
    };

    // --- Function to update main content padding ---
    const adjustMainPadding = () => {
      if (!mainContent || !breadcrumbs) return;
      const breadcrumbHeight = breadcrumbs.offsetHeight;
      mainContent.style.paddingTop = `${breadcrumbHeight}px`;
      // console.log(`JS: Set main padding top to ${breadcrumbHeight}px`);
    };

    // --- Scroll handler ---
    const onScroll = () => {
      const scrollPos = window.pageYOffset || document.documentElement.scrollTop;
      // Stick point is when the top of the .navigation element is about to go off-screen
      const navStickPoint = header.offsetTop + topHeaderHeight; // Calculate where nav normally sits
      const navShouldStick = scrollPos > navStickPoint;

      if (navShouldStick && !isNavSticky) {
        // Becoming sticky
        // console.log('JS: Nav becoming sticky');
        if (topHeader) topHeader.classList.add('hide');
        navigation.classList.add('nav-bg'); // This class triggers height reduction via CSS
        isNavSticky = true;
        // Use rAF to ensure styles applied *after* class change potentially affects height
        requestAnimationFrame(() => {
          adjustBreadcrumbTop(); // Update top based on potentially new nav height
          adjustMainPadding(); // Main padding depends on breadcrumb height, recalculate
        });

      } else if (!navShouldStick && isNavSticky) {
        // Becoming un-sticky
        // console.log('JS: Nav becoming un-sticky');
        if (topHeader) topHeader.classList.remove('hide');
        navigation.classList.remove('nav-bg');
        isNavSticky = false;
        // Use rAF to ensure styles applied *after* class change potentially affects height
        requestAnimationFrame(() => {
          adjustBreadcrumbTop(); // Update top based on potentially new nav height
          adjustMainPadding(); // Recalculate main padding
        });
      }
    };

    // --- Initial Setup ---
    // Set initial position for breadcrumbs immediately
    adjustBreadcrumbTop();
    // Set initial main padding after a tiny delay for rendering accuracy
    requestAnimationFrame(adjustMainPadding);


    // --- Event Listeners ---
    window.addEventListener('scroll', onScroll, { passive: true }); // Use passive listener for scroll performance
    window.addEventListener('resize', () => { // Recalculate on resize
      // We don't need to change body padding here as it's fixed in CSS
      adjustBreadcrumbTop();
      adjustMainPadding();
    });

    // Use ResizeObserver for reliability on element height changes
    if (breadcrumbs) {
      const breadcrumbObserver = new ResizeObserver(adjustMainPadding);
      breadcrumbObserver.observe(breadcrumbs);
    }
    const navObserver = new ResizeObserver(adjustBreadcrumbTop);
    navObserver.observe(navigation);

  }
  // --- END: Sticky Header Logic ---


  // --- START: OG Preview Effect Function ---
  function initializeOgPreviewEffects() {
    const effectWrappers = document.querySelectorAll(
      '.og-preview-wrapper[data-effect-probability]'
    );
    effectWrappers.forEach((wrapper) => {
      const probability = parseInt(wrapper.dataset.effectProbability, 10) || 0;
      const duration = parseInt(wrapper.dataset.effectDuration, 10) || 750;
      const effectOverlay = wrapper.querySelector('.og-effect-overlay');
      const availableEffects = ['glitch', 'static', 'warble'];

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

        const imageElement = wrapper.querySelector('.og-preview-image');
        if (chosenEffect === 'warble' && imageElement) {
          imageElement.style.filter = 'url(#og-warble-filter)';
        }

        effectOverlay.addEventListener(
          'animationend',
          () => {
            effectOverlay.classList.remove(effectClass, 'animate-effect');
            effectOverlay.style.animationDuration = '';
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


  // --- Background-images ---
  $('[data-background]').each(function () {
    $(this).css({
      'background-image': 'url(' + $(this).data('background') + ')',
    });
  });
  // --- End Background-images ---


  $(document).ready(function () {
    // <<< Initialize Sticky Header Logic >>>
    handleStickyHeader();

    // <<< Initialize OG Preview Effects >>>
    setTimeout(initializeOgPreviewEffects, 100);

    // <<< Cookie Consent Logic >>>
    const cookieBox = document.getElementById('js-cookie-box');
    const cookieButton = document.getElementById('js-cookie-button');
    if (cookieBox && cookieButton && typeof Cookies !== 'undefined') {
      if (!Cookies.get('cookie-box')) {
        cookieBox.classList.remove('cookie-box-hide');
        cookieButton.onclick = function () {
          const expireDaysAttr = cookieBox.getAttribute('data-expire-days');
          const expireDays = parseInt(expireDaysAttr) || 30;
          Cookies.set('cookie-box', true, { expires: expireDays, path: '/' });
          cookieBox.classList.add('cookie-box-hide');
        };
      }
    }

    // <<< Contact/Calendar Toggle Logic >>>
    const showFormBtn = document.getElementById('show-form-btn');
    const showCalendarBtn = document.getElementById('show-calendar-btn');
    const formContainer = document.getElementById('contact-form-container');
    const calendarContainer = document.getElementById('calendar-container');
    const calEmbedDiv = document.getElementById('my-cal-inline');
    let calInitialized = false;

    function showFormView() {
      if (formContainer && calendarContainer && showFormBtn && showCalendarBtn) {
        formContainer.classList.remove('d-none');
        calendarContainer.classList.add('d-none');
        showFormBtn.classList.add('btn-light');
        showFormBtn.classList.remove('btn-outline-light');
        showCalendarBtn.classList.add('btn-outline-light');
        showCalendarBtn.classList.remove('btn-light');
      }
    }

    function showCalendarView() {
      if (formContainer && calendarContainer && showFormBtn && showCalendarBtn && calEmbedDiv) {
        formContainer.classList.add('d-none');
        calendarContainer.classList.remove('d-none');
        showCalendarBtn.classList.add('btn-light');
        showCalendarBtn.classList.remove('btn-outline-light');
        showFormBtn.classList.add('btn-outline-light');
        showFormBtn.classList.remove('btn-light');

        if (typeof Cal === 'function') {
          if (!calInitialized || !calEmbedDiv.querySelector('iframe')) {
            try {
              Cal('init');
              if (calEmbedDiv.querySelector('iframe')) {
                calInitialized = true;
              } else {
                if (!calendarContainer.querySelector('.cal-error-message')) {
                  const errorMsg = document.createElement('p');
                  errorMsg.className = 'text-warning text-center small mt-4 cal-error-message';
                  errorMsg.textContent = "Trying to load calendar... If it doesn't appear, please refresh.";
                  calendarContainer.appendChild(errorMsg);
                }
              }
            } catch (e) {
              if (!calendarContainer.querySelector('.cal-error-message')) {
                const errorMsg = document.createElement('p');
                errorMsg.className = 'text-danger text-center small mt-4 cal-error-message';
                errorMsg.textContent = 'Error initializing calendar. Please refresh or use the message form.';
                calendarContainer.appendChild(errorMsg);
              }
              calInitialized = false;
            }
          }
        } else {
          if (!calendarContainer.querySelector('.cal-error-message')) {
            const errorMsg = document.createElement('p');
            errorMsg.className = 'text-danger text-center small mt-4 cal-error-message';
            errorMsg.textContent = 'Calendar components failed to load. Please refresh or use the message form.';
            calendarContainer.appendChild(errorMsg);
          }
        }
        if (!calEmbedDiv.dataset.calLink) {
          if (!calendarContainer.querySelector('.cal-error-message')) {
            const errorMsg = document.createElement('p');
            errorMsg.className = 'text-danger text-center small mt-4 cal-error-message';
            errorMsg.textContent = 'Calendar configuration error.';
            calendarContainer.appendChild(errorMsg);
          }
        }
      }
    }

    if (showFormBtn) showFormBtn.addEventListener('click', showFormView);
    if (showCalendarBtn) showCalendarBtn.addEventListener('click', showCalendarView);
    if (formContainer && calendarContainer && showFormBtn && showCalendarBtn) {
      showFormView(); // Start with form visible
    }

    // <<< AJAX Contact Form Submission >>>
    const contactForm = document.getElementById('contact-message-form');
    const formFeedback = document.getElementById('form-feedback');
    const submitButton = contactForm ? contactForm.querySelector('button[type="submit"]') : null;

    if (contactForm && formFeedback && submitButton) {
      contactForm.addEventListener('submit', function (event) {
        event.preventDefault();
        const formData = new FormData(contactForm);
        const submitButtonOriginalText = submitButton.innerHTML;

        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Sending...';
        formFeedback.innerHTML = '';
        formFeedback.className = 'mt-3 small';

        fetch(contactForm.action, {
          method: 'POST',
          body: formData,
          headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' },
        })
          .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
          })
          .then(data => {
            if (data.status === 'success') {
              formFeedback.textContent = data.message;
              formFeedback.classList.add('alert', 'alert-success');
              contactForm.reset();
            } else {
              formFeedback.textContent = data.message || 'An error occurred.';
              formFeedback.classList.add('alert', 'alert-danger');
            }
          })
          .catch(error => {
            console.error('Form submission error:', error);
            formFeedback.textContent = 'A network error occurred sending your message. Please try again.';
            formFeedback.classList.add('alert', 'alert-danger');
          })
          .finally(() => {
            submitButton.disabled = false;
            submitButton.innerHTML = submitButtonOriginalText;
          });
      });
    }

  }); // END $(document).ready()

})(jQuery);
