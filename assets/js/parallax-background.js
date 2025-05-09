document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  const parallaxElements = document.querySelectorAll('.portfolio-card-wide-image-col');
  const parallaxSpeed = 0.7; // Adjust this value for more or less parallax effect (0.1 to 1) - Increased for testing

  if (!parallaxElements.length) {
    return;
  }

  function updateParallax() {
    const windowHeight = window.innerHeight;

    parallaxElements.forEach(element => {
      const rect = element.getBoundingClientRect();

      // Check if the element is roughly in the viewport
      if (rect.bottom >= 0 && rect.top <= windowHeight) {
        // Calculate the percentage of the element that is visible or how far it is from center
        // This is a simple calculation, can be made more sophisticated
        const scrollPercent = (windowHeight - rect.top) / (windowHeight + rect.height);
        
        // Calculate the offset. We want the background to move less than the scroll.
        // The movement will be relative to the center of the background image.
        // (scrollPercent - 0.5) makes the movement pivot around the center.
        const offset = (scrollPercent - 0.5) * 100 * parallaxSpeed; // Percentage offset

        // Set the CSS custom property. The SCSS will use this.
        // We apply it to the ::before pseudo-element via the parent.
        element.style.setProperty('--parallax-bg-y-offset', `${50 + offset}%`);
      }
    });
  }

  // Initial call and on scroll
  window.addEventListener('scroll', updateParallax, { passive: true });
  window.addEventListener('resize', updateParallax, { passive: true });
  updateParallax(); // Initial call to set positions
});