document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  function handleStickyHeader() {
    const header = document.querySelector('.header');
    const navigation = document.querySelector('.navigation');
    const topHeader = document.querySelector('.top-header');
    const breadcrumbs = document.querySelector('.sticky-breadcrumbs-wrapper');
    const mainContent = document.querySelector('main');

    if (!header || !navigation) {
      return;
    }

    let isNavSticky = false;
    const topHeaderHeight = topHeader ? topHeader.offsetHeight : 0;
    let initialHeaderOffsetTop;
    // Cached dimensions are still useful for ResizeObservers and initial setup
    let cachedNavHeight = 0;
    let cachedBreadcrumbsHeight = 0;

    const updateCachedDimensions = () => {
      if (navigation) cachedNavHeight = navigation.offsetHeight;
      if (breadcrumbs) cachedBreadcrumbsHeight = breadcrumbs.offsetHeight;
    };

    // This function still uses cached values, primarily for window resize scenarios
    const adjustPositionsFromCache = () => {
      if (breadcrumbs) {
        breadcrumbs.style.top = `${cachedNavHeight}px`;
      }
      if (mainContent && breadcrumbs) {
        const minPadding = 10;
        mainContent.style.paddingTop = `${Math.max(cachedBreadcrumbsHeight, minPadding)}px`;
      } else if (mainContent) {
        // Fallback if breadcrumbs are not present but mainContent is
        mainContent.style.paddingTop = '10px';
      }
    };
    
    const onScroll = () => {
      const scrollPos =
        window.pageYOffset || document.documentElement.scrollTop;
      const navStickPoint = initialHeaderOffsetTop + topHeaderHeight;
      const navShouldStick = scrollPos > navStickPoint;

      if (navShouldStick && !isNavSticky) {
        if (topHeader) topHeader.classList.add('hide');
        navigation.classList.add('nav-bg');
        document.body.classList.add('body-nav-sticky');
        isNavSticky = true;

        requestAnimationFrame(() => {
          // Read current dimensions directly after class changes for immediate adjustment
          const currentNavHeight = navigation ? navigation.offsetHeight : 0;
          if (breadcrumbs) breadcrumbs.style.top = `${currentNavHeight}px`;

          const currentBreadcrumbsHeight = breadcrumbs ? breadcrumbs.offsetHeight : 0;
          if (mainContent) {
            const minPadding = 10; // Example minimum padding
            mainContent.style.paddingTop = `${Math.max(currentBreadcrumbsHeight, minPadding)}px`;
          }
        });
      } else if (!navShouldStick && isNavSticky) {
        if (topHeader) topHeader.classList.remove('hide');
        navigation.classList.remove('nav-bg');
        document.body.classList.remove('body-nav-sticky');
        isNavSticky = false;

        requestAnimationFrame(() => {
          // Read current dimensions directly
          const currentNavHeight = navigation ? navigation.offsetHeight : 0;
          if (breadcrumbs) breadcrumbs.style.top = `${currentNavHeight}px`;
          
          const currentBreadcrumbsHeight = breadcrumbs ? breadcrumbs.offsetHeight : 0;
          if (mainContent) {
            const minPadding = 10;
            mainContent.style.paddingTop = `${Math.max(currentBreadcrumbsHeight, minPadding)}px`;
          }
        });
      }
    };

    // Initial Setup
    requestAnimationFrame(() => {
      initialHeaderOffsetTop = header.offsetTop;
      updateCachedDimensions(); // Populate caches for initial state
      adjustPositionsFromCache(); // Set initial positions using cached values
      onScroll(); // Set initial sticky state based on current scroll position
    });

    window.addEventListener('scroll', onScroll, { passive: true });
    
    window.addEventListener('resize', () => {
      requestAnimationFrame(() => {
        initialHeaderOffsetTop = header.offsetTop;
        updateCachedDimensions(); // Update caches on resize
        onScroll(); // Re-evaluate sticky state
        // Adjust positions based on new cached dimensions from resize
        // This is important if sticky state doesn't change but dimensions do
        adjustPositionsFromCache(); 
      });
    });

    if (breadcrumbs) {
      const breadcrumbObserver = new ResizeObserver(() => {
        requestAnimationFrame(() => {
          updateCachedDimensions();
          // When breadcrumbs resize, only main padding needs to react to breadcrumbs height
          if (mainContent) {
            const minPadding = 10;
            mainContent.style.paddingTop = `${Math.max(cachedBreadcrumbsHeight, minPadding)}px`;
          }
        });
      });
      breadcrumbObserver.observe(breadcrumbs);
    }
    if (navigation) {
      const navObserver = new ResizeObserver(() => {
        requestAnimationFrame(() => {
          updateCachedDimensions();
          // When navigation resizes, breadcrumbs top and potentially main padding need to react
          if (breadcrumbs) breadcrumbs.style.top = `${cachedNavHeight}px`;
          if (mainContent && breadcrumbs) {
             const minPadding = 10;
             mainContent.style.paddingTop = `${Math.max(cachedBreadcrumbsHeight, minPadding)}px`;
          }
        });
      });
      navObserver.observe(navigation);
    }
  }

  handleStickyHeader();
});
