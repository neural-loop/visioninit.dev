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
      const navStickPoint = header.offsetTop + topHeaderHeight;
      const navShouldStick = scrollPos > navStickPoint;

      if (navShouldStick && !isNavSticky) {
        if (topHeader) topHeader.classList.add('hide');
        navigation.classList.add('nav-bg');
        isNavSticky = true;
        requestAnimationFrame(() => {
          adjustBreadcrumbTop();
          adjustMainPadding();
        });
      } else if (!navShouldStick && isNavSticky) {
        if (topHeader) topHeader.classList.remove('hide');
        navigation.classList.remove('nav-bg');
        isNavSticky = false;
        requestAnimationFrame(() => {
          adjustBreadcrumbTop();
          adjustMainPadding();
        });
      }
    };

    // Initial Setup
    requestAnimationFrame(() => {
      adjustBreadcrumbTop();
      adjustMainPadding();
      onScroll(); // Call onScroll once on load to set initial state
    });

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => {
      requestAnimationFrame(() => { // Debounce resize adjustments slightly
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
