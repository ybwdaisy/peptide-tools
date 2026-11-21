# Project instructions


## Analytics test isolation
- Production development/acceptance visits must use `?analytics_test=1` (also accepts `?qa=1`). QA mode is stored in both sessionStorage and localStorage before consent; it survives navigation and new same-origin tabs. Use `?analytics_test=0` in a normal browser to explicitly reset it. Automated browsers remain excluded even with a reset flag.
- QA and automated visits must never load the GA4 SDK or send events, including page views, learning/tool actions and checkout/purchase. Local/preview origin gates and normal visitors' consent behavior must stay intact.
- Intercept all Google collection endpoints before every automated production visit. SDK contract fixtures may simulate a human browser only after transport interception is installed; never allow a test event to reach real GA4.
- Historical unmarked visits cannot be reliably identified. Do not guess exclusions from country, device, small counts or entire dates; preserve explicitly documented legacy rules.
