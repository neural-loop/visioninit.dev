(function ($) {
  'use strict';

  // Sticky Menu
  $(window).scroll(function () {
    var height = $('.top-header').innerHeight();
    if ($('header').offset().top > 10) {
      $('.top-header').addClass('hide');
      $('.navigation').addClass('nav-bg');
      $('.navigation').css('margin-top','-'+height+'px');
    } else {
      $('.top-header').removeClass('hide');
      $('.navigation').removeClass('nav-bg');
      $('.navigation').css('margin-top','-'+0+'px');
    }
  });

  // Background-images
  $('[data-background]').each(function () {
    $(this).css({
      'background-image': 'url(' + $(this).data('background') + ')'
    });
  });

  function initializeOgPreviewEffects() {
    const effectWrappers = document.querySelectorAll('.og-preview-wrapper[data-effect-probability]');

    effectWrappers.forEach(wrapper => {
      const probability = parseInt(wrapper.dataset.effectProbability, 10) || 0;
      const duration = parseInt(wrapper.dataset.effectDuration, 10) || 750;
      const effectOverlay = wrapper.querySelector('.og-effect-overlay');
      // Get available effects from config (passed via hugo.toml -> JS variable if needed, or hardcode)
      // Hardcoding is simpler for now if hugo.toml list doesn't change often:
      const availableEffects = ['glitch', 'static', 'warble']; // Match CSS classes 'effect-...'

      if (!effectOverlay || availableEffects.length === 0) {
        console.warn('OG Preview effect overlay not found or no effects defined.');
        return; // Skip if overlay doesn't exist or no effects configured
      }

      // Roll the dice!
      const shouldPlayEffect = Math.random() * 100 < probability;

      if (shouldPlayEffect) {
        console.log('Playing OG Preview effect...');
        // Choose a random effect
        const chosenEffect = availableEffects[Math.floor(Math.random() * availableEffects.length)];
        const effectClass = `effect-${chosenEffect}`;

        // --- Special handling for Warble ---
        // Warble looks best applied to the image itself.
        // For simplicity here, we'll apply it to the overlay and give overlay the bg.
        // If applying to image: const imageElement = wrapper.querySelector('.og-preview-image');

        // Apply classes and duration
        effectOverlay.style.animationDuration = `${duration}ms`;
        effectOverlay.classList.add(effectClass, 'animate-effect');

        // --- Clean up after animation ---
        effectOverlay.addEventListener('animationend', () => {
          console.log('OG Preview effect finished.');
          effectOverlay.classList.remove(effectClass, 'animate-effect');
          effectOverlay.style.animationDuration = ''; // Reset duration
          // If applying filter to image for warble, remove it here:
          // if (chosenEffect === 'warble' && imageElement) {
          //   imageElement.style.filter = '';
          // }
        }, { once: true }); // Listener removes itself after firing once

        // --- Optional: Apply warble filter to image element directly ---
        // if (chosenEffect === 'warble' && imageElement) {
        //   imageElement.style.filter = 'url(#og-warble-filter)';
        // }
      }
    });
  }
  // --- END: OG Preview Effect Function ---


  // Execute when the DOM is fully loaded
  $(document).ready(function () {

    // Animation
    $('.has-animation').each(function (index) {
      $(this).delay($(this).data('delay')).queue(function () {
        $(this).addClass('animate-in');
        $(this).dequeue(); // Important to continue the queue
      });
    });
    setTimeout(initializeOgPreviewEffects, 100); // Small delay

    // Cookie Consent Logic
    const cookieBox = document.getElementById('js-cookie-box');
    const cookieButton = document.getElementById('js-cookie-button');

    // Check if the cookie box element exists on the page and js-cookie is loaded
    if (cookieBox && cookieButton && typeof Cookies !== 'undefined') {
      // Check if the cookie hasn't been set
      if (!Cookies.get('cookie-box')) {
        // Show the cookie box
        cookieBox.classList.remove('cookie-box-hide');

        // Add click listener to the accept button
        cookieButton.onclick = function () {
          // Read expire days from data attribute
          const expireDaysAttr = cookieBox.getAttribute('data-expire-days');
          const expireDays = parseInt(expireDaysAttr) || 30; // Default to 30 if attribute is missing or invalid

          // Set the cookie using js-cookie library
          Cookies.set('cookie-box', true, {
            expires: expireDays,
            path: '/' // Set path to ensure cookie applies site-wide
          });
          // Hide the cookie box
          cookieBox.classList.add('cookie-box-hide');
        };
      }
    } // End if (cookieBox && cookieButton && Cookies)
  }); // END $(document).ready()


})(jQuery);
