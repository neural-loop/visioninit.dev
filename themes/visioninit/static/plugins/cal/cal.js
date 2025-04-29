// themes/visioninit/assets/js/cal.js

// Check if the target element exists before running Cal.com code
if (document.getElementById('my-cal-inline')) {
  (function (C, A, L) { let p = function (a, ar) { a.q.push(ar); }; let d = C.document; C.Cal = C.Cal || function () { let cal = C.Cal; let ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement("script")).src = A; cal.loaded = true; } if (ar[0] === L) { const api = function () { p(api, arguments); }; const namespace = ar[1]; api.q = api.q || []; if(typeof namespace === "string"){cal.ns[namespace] = cal.ns[namespace] || api;p(cal.ns[namespace], ar);p(cal, ["initNamespace", namespace]);} else p(cal, ar); return;} p(cal, ar); }; })(window, "https://app.cal.com/embed/embed.js", "init");
  Cal("init", "visioninit-embed", {origin:"https://cal.com"});

  Cal.ns["visioninit-embed"]("inline", {
    elementOrSelector:"#my-cal-inline",
    config: {"layout":"month_view"},
    calLink: "visioninit/30min", // Ensure this is your correct Cal.com link slug
  });

  Cal.ns["visioninit-embed"]("ui", {"theme": "light", "hideEventTypeDetails":false,"layout":"month_view"});
} else {
  // Optional: Log a message if the element isn't found on the current page
  // console.log("Cal.com embed target #my-cal-inline not found on this page.");
}
