# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The owner and a small circle of people they share the app with. It is a personal tool, not a public product. Typical use is a quick check of the current Finnish electricity price, often on a phone, before running something that uses a lot of power.

## Product Purpose

Shows Finnish electricity spot prices including VAT (25.5 %), so the user can tell at a glance whether electricity is cheap right now and when it will be cheapest today or tomorrow. Success means the owner uses this app instead of third-party spot-price sites for their daily price checks.

## Positioning

The original goal was to answer a bigger question: **is a fixed-price contract or a spot-price contract the better deal over time?** It would do this by comparing fixed-price history with spot-price history. That is still the intended differentiator, but it is **not built**: the history data proved hard to get (see Capabilities and Constraints). Today the app compares the user's own fixed rate against current and daily spot prices only.

## Operating Context

- Opened ad hoc for a quick price check, mostly in the moment of deciding whether to use electricity now or later.
- Tomorrow's prices are published around 14:15 Finnish time; the app shows them once available.
- Data refreshes every 15 minutes; prices come in 15-minute slots that can also be viewed hourly.

## Capabilities and Constraints

- Current price, colour-coded as cheap / moderate / expensive relative to the user's fixed rate (cheap below the fixed rate, moderate up to 40 % above it, expensive beyond that).
- Daily min, max and average; tomorrow's prices once published.
- Scrollable bar chart with 15-minute or hourly intervals.
- Fixed-price comparison against a user-entered rate (default 8.5 c/kWh).
- Best-time ranking of today's cheapest slots for scheduling high-consumption tasks.
- Light and dark theme.
- Prices are shown in c/kWh including VAT. The API returns EUR/kWh without VAT; negative and zero prices are valid and must display correctly.
- Data source: spot-hinta.fi (`/TodayAndDayForward`), fetched directly from the browser. Only today and tomorrow are available. **No spot-price history and no fixed-contract price history are currently available.**
- Stack: React 19 + Vite, Chart.js via react-chartjs-2, deployed on Netlify.
- **Open decision:** whether, and from which source, to add spot and fixed-price history for the fixed-vs-spot verdict.

## Brand Commitments

- Name: "Sähkön spot-hinnat".
- The UI is **Finnish only**; no other languages are planned.

## Evidence on Hand

- Behaviour specs in Gherkin: `features/*.feature` (best-time ranking, fixed comparison, price conversion, API data validation).
- Live price data from spot-hinta.fi.
- No historical price data, user counts, testimonials or other proof exist. Do not fabricate savings figures or historical comparisons.

## Product Principles

1. **Answer "is it cheap right now?" first.** The current price and its status come before everything else.
2. **Judge prices against the user's own contract.** Cheap and expensive are relative to their fixed rate, not to an abstract market average.
3. **Accurate numbers over impressive ones.** VAT-inclusive, correctly converted prices; never show a figure or verdict the available data cannot support.
4. **Help decide when, not just what.** Turn prices into a usable choice of when to run things.
