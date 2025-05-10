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
    let initialHeaderOffsetTop; // Will be set after DOM settle
    let cachedNavHeight = 0;
    let cachedBreadcrumbsHeight = 0;

    const updateCachedDimensions = () => {
      if (navigation) cachedNavHeight = navigation.offsetHeight;
      if (breadcrumbs) cachedBreadcrumbsHeight = breadcrumbs.offsetHeight;
    };

    const adjustBreadcrumbTop = () => {
      if (!breadcrumbs) return;
      // Use cachedNavHeight
      breadcrumbs.style.top = `${cachedNavHeight}px`;
    };

    const adjustMainPadding = () => {
      if (!mainContent || !breadcrumbs) return;
      // Use a minimum padding to avoid collapse if breadcrumbs hide temporarily
      // Use cachedBreadcrumbsHeight
      const minPadding = 10; // Example minimum padding in pixels
      mainContent.style.paddingTop = `${Math.max(cachedBreadcrumbsHeight, minPadding)}px`;
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
      initialHeaderOffsetTop = header.offsetTop; // Calculate initial offset after DOM has a chance to settle
      updateCachedDimensions(); // Initial cache of dimensions
      adjustBreadcrumbTop(); // Initial adjustment based on cached dimensions
      adjustMainPadding(); // Initial adjustment

      // Optional: If you want to ensure the correct state is set if page loads at the very top
      // without waiting for a scroll event, you could call onScroll() here.
      // However, this might re-introduce a slight reflow on initial load.
      // Test without it first to see if the "header not showing" issue is resolved by deferring offset calculation.
      // If still an issue, uncommenting the onScroll() below might be necessary.
      onScroll(); // Call onScroll() here to set initial state based on current scroll position
    });

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => {
      requestAnimationFrame(() => { // Debounce resize adjustments slightly
        initialHeaderOffsetTop = header.offsetTop; // Recalculate on resize
        updateCachedDimensions(); // Update cached dimensions on resize
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
      const breadcrumbObserver = new ResizeObserver(() => {
        requestAnimationFrame(() => {
          updateCachedDimensions(); // Update on breadcrumb resize
          adjustMainPadding();
        });
      });
      breadcrumbObserver.observe(breadcrumbs);
    }
    if (navigation) {
      const navObserver = new ResizeObserver(() => {
        requestAnimationFrame(() => {
          updateCachedDimensions(); // Update on navigation resize
          adjustBreadcrumbTop();
          // If nav height changes, breadcrumbs top might change, which in turn might affect main padding if breadcrumbs are visible
          if (breadcrumbs && breadcrumbs.offsetHeight > 0) {
            adjustMainPadding();
          }
        });
      });
      navObserver.observe(navigation);
    }
  }

  handleStickyHeader();
});
