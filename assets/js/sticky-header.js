document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  function handleStickyHeader() {
    const header = document.querySelector('.header'); // Main header element
    const navigation = document.querySelector('.navigation'); // The nav bar itself
    const topHeader = document.querySelector('.top-header'); // Optional top bar
    const breadcrumbs = document.querySelector('.sticky-breadcrumbs-wrapper');
    const mainContent = document.querySelector('main'); // Assumes <main> tag wraps primary content

    if (!header || !navigation) {
      return;
    }

    let isNavSticky = false;
    const topHeaderHeight = topHeader ? topHeader.offsetHeight : 0;
    let initialHeaderOffsetTop = header.offsetTop; // Cache initial offset

    const adjustBreadcrumbTop = () => {
      if (!breadcrumbs) return;
      const currentNavHeight = navigation.offsetHeight;
      breadcrumbs.style.top = `${currentNavHeight}px`;
    };

    const adjustMainPadding = () => {
      if (!mainContent || !breadcrumbs) return;
      // Use a minimum padding to avoid collapse if breadcrumbs hide temporarily
      const breadcrumbHeight = breadcrumbs ? breadcrumbs.offsetHeight : 0;
      const minPadding = 10; // Example minimum padding in pixels
      mainContent.style.paddingTop = `${Math.max(breadcrumbHeight, minPadding)}px`;
    };

    const onScroll = () => {
      const scrollPos =
        window.pageYOffset || document.documentElement.scrollTop;
      // Use cached initialHeaderOffsetTop for navStickPoint calculation during scroll
      const navStickPoint = initialHeaderOffsetTop + topHeaderHeight;
      const navShouldStick = scrollPos > navStickPoint;

      if (navShouldStick && !isNavSticky) {
        if (topHeader) topHeader.classList.add('hide');
        navigation.classList.add('nav-bg');
        document.body.classList.add('body-nav-sticky'); // Add class to body
        isNavSticky = true;
        requestAnimationFrame(() => {
          adjustBreadcrumbTop();
          adjustMainPadding();
        });
      } else if (!navShouldStick && isNavSticky) {
        if (topHeader) topHeader.classList.remove('hide');
        navigation.classList.remove('nav-bg');
        document.body.classList.remove('body-nav-sticky'); // Remove class from body
        isNavSticky = false;
        requestAnimationFrame(() => {
          adjustBreadcrumbTop();
          adjustMainPadding();
        });
      }
    };

    // Initial Setup
    requestAnimationFrame(() => {
      // adjustBreadcrumbTop(); // Potentially redundant, onScroll will handle if state changes
      // adjustMainPadding(); // Potentially redundant, onScroll will handle if state changes
      onScroll(); // Call onScroll once on load to set initial state
      // If breadcrumbs/nav heights are dynamic and affect layout even when not sticky,
      // we might need to ensure these are called once if onScroll doesn't trigger a change.
      // For now, let's see if onScroll is sufficient.
      // One initial call to set positions based on non-sticky nav might still be needed
      // if their default CSS state doesn't account for the nav height correctly.
      // Let's add them back but ensure they are called based on the *current* (non-sticky or sticky) state.
      // The onScroll function already does this.
      // The ResizeObservers should also handle initial sizing correctly.
    });

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => {
      requestAnimationFrame(() => { // Debounce resize adjustments slightly
        initialHeaderOffsetTop = header.offsetTop; // Recalculate on resize
        // Call onScroll to re-evaluate sticky state with new offset,
        // which will also trigger breadcrumb/main padding adjustments if state changes.
        onScroll();
        // Explicitly call adjustments too, in case sticky state doesn't change but dimensions do.
        adjustBreadcrumbTop();
        adjustMainPadding();
      });
    });

    // Use ResizeObserver for reliability
    if (breadcrumbs) {
      const breadcrumbObserver = new ResizeObserver(() => requestAnimationFrame(adjustMainPadding));
      breadcrumbObserver.observe(breadcrumbs);
    }
    if (navigation) {
      const navObserver = new ResizeObserver(() => requestAnimationFrame(adjustBreadcrumbTop));
      navObserver.observe(navigation);
    }
  }

  handleStickyHeader();
});
