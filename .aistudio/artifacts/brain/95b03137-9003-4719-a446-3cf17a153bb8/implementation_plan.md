# YURFAT — US Restaurant Search, List Organizer & CSV Exporter

**YURFAT** is an account-free web application that lets users search United States restaurants with live Yelp data, organize spots into `"Want to Go"`, `"Been Here"`, and unlimited custom lists, log shared notes, personal 1–5 star ratings, and `"Will Go Back" (Y/N)` decisions, and export or share lists as structured CSV files at zero cost.

### User Review & Critical Decisions

> [!IMPORTANT]
> The app name is now locked in as **YURFAT**, alongside your confirmed Phase 1 product and architecture choices below. Click **Proceed** when you are ready to build!

- **Confirmed App Name — `YURFAT`**: Displayed in the top navigation bar, page metadata, and exported files.
- **Confirmed Decision 1 — Free Live Yelp Data Engine**: Because Yelp eliminated its free API tier (now starting at $229/month), Phase 1 uses AI Studio's built-in server-side `gemini-3.8-flash` with **Google Search Grounding** (`googleSearch: {}`) to query live U.S. Yelp restaurant listings (`yelp.com/biz/...`), returning accurate restaurant names, cuisine types, Yelp star ratings, review counts, price tiers, U.S. addresses, and direct Yelp page URLs at $0 cost.
- **Confirmed Decision 2 — Strict Mutual Exclusivity Prompt for Default Lists**: The app initializes with `"Want to Go"` and `"Been Here"`. If a user tries to select both—or tries to add a restaurant to one while it already exists in the other—the interface blocks the conflict with an explicit prompt: *"Saves can't be in both 'Want to Go' and 'Been Here'"* and forces the user to pick one or the other. Custom lists have no mutual exclusivity constraint.
- **Confirmed Decision 3 — Account-Free Local Persistence, CSV Download & Link Sharing (Phase 1)**: All lists, notes, and ratings persist automatically in browser storage with zero sign-up required. Users can download any list as a standard `.csv` file to their device or generate a self-contained shareable link so friends can view or import the list without an account. Direct Google Drive OAuth upload is scoped into Phase 2.
- **Confirmed Decision 4 — Editable 1–5 Star User Rating & Synced Notes Across Lists**: Every saved restaurant supports an editable 1–5 star user rating and a shared note (editable during the initial Star quick-save modal and inline within any list). Because notes and user ratings are linked to the restaurant record, viewing that restaurant in *any* list displays the same up-to-date note and rating.

---

### 1. Overview & Core Concept

- **What It Does**: **YURFAT** provides a fast, uncluttered U.S. restaurant search and personal dining log. Users search for any restaurant across the United States, view its Yelp rating, cuisine type, address, and direct Yelp link, and click the star icon to save it to `"Want to Go"`, `"Been Here"`, or custom lists created on the fly.
- **Target Audience / Persona**: Food enthusiasts, travelers, and everyday diners who want a clean, spreadsheet-ready restaurant tracker they can organize and export/share with friends without creating another social network account.
- **Key Value**: Combines Yelp's discovery metadata with frictionless multi-list curation, batch management, global restaurant notes, `"Will Go Back" (Y/N)` tracking, and one-click CSV export.

#### Phase 1 (MVP) vs. Phase 2 Scope

| Capability | Phase 1 (MVP — Included Now) | Phase 2 (Future Enhancement) |
| :--- | :--- | :--- |
| **US Restaurant Search** | Live U.S.-only restaurant search powered by free Gemini Search Grounding + instant local search cache | Optional direct Yelp Places API key toggle or multi-source review aggregation |
| **List Management** | Pre-built `"Want to Go"` & `"Been Here"` (mutually exclusive) + unlimited custom lists (create, rename, modify, multi-select mass delete) | Collaborative real-time multi-user lists via cloud database |
| **Restaurant Logging** | Star quick-add from search, assign to 1 or multiple lists, create new list on the fly, global synced notes, 1–5 star user rating, `'Y'/'N'` Will Go Back toggle on `"Been Here"` | Photo uploads, receipt scanning, and dish-level tagging |
| **List Operations** | Multi-select restaurants to batch delete from a list; sort by Alphabetical (A–Z), Date Added, or Yelp Rating | Interactive map pins view & neighborhood radius filtering |
| **Export & Sharing** | Local device `.csv` download (all 7 required columns) + zero-account shareable list URL & JSON backup/restore | Direct 1-click export to Google Drive / Google Sheets via Google Workspace OAuth |

---

### 2. User Experience & Visual Design

#### Key User Flows

1. **Home Screen (US Restaurant Search & Quick-Save Star)**:
   - Opens directly on the **Search** workspace.
   - Users enter a restaurant name or cuisine (e.g., *"Katz's Delicatessen"*, *"Texas BBQ"*, *"Best Ramen"*) and a U.S. location (City/State or 5-digit U.S. ZIP code, restricted strictly to the United States).
   - Search results render as clean, high-signal cards displaying: Restaurant Name, Cuisine Type, Price Range, U.S. Street Address & City/State, Yelp Star Rating (`tabular-nums`), Review Count, a direct **"View on Yelp ↗"** link, and a prominent **Star (`★`) button** on the top-right of each result.
   - If a restaurant is already saved in one or more lists, the Star icon appears filled in crimson-gold and shows which lists it belongs to.

2. **Quick-Save Star Modal (Multi-List Selection, On-the-Fly List Creation & Mutual Exclusivity)**:
   - Clicking the Star button on any search result opens the **Save to Lists** modal.
   - **List Checkboxes**: Users can check one list, multiple custom lists, or type a name in the **"+ Create New List on the Fly"** input to immediately create and select a new list without leaving the modal.
   - **"Want to Go" vs. "Been Here" Rule**: If the restaurant is currently checked in `"Want to Go"` and the user clicks `"Been Here"` (or vice versa), an inline alert banner immediately appears:
     > *"Saves can't be in both 'Want to Go' and 'Been Here'. Please choose one or the other."*
     with quick action buttons (**Switch to "Been Here"** or **Keep in "Want to Go"**) so the user is forced to pick one or the other.
   - **Personal Rating, Global Note & "Will Go Back" Toggle**: Directly inside the modal, the user can set their **1–5 Star Personal Rating**, type a **Note** (which automatically syncs across all lists containing this restaurant), and—when `"Been Here"` is selected—toggle **Will Go Back: `Y` / `N`**.

3. **All Lists Tab (Create, Modify & Multi-Select Mass Delete)**:
   - Displays the two default pinned lists (`"Want to Go"` and `"Been Here"`) followed by all user-created custom lists.
   - Users can create a new list, edit a list's name/description, or activate **Select Lists** mode to check multiple custom lists and **Mass Delete** them in one click (default lists `"Want to Go"` and `"Been Here"` have locked checkboxes so they cannot be deleted).

4. **List Detail View (Sorting, Quick-View Notes, `'Y'/'N'` Toggle, Multi-Select Remove & CSV Export)**:
   - Clicking any list opens its saved restaurants table/grid view.
   - **Sort Controls**: Segmented control to sort restaurants **Alphabetically (A–Z)**, by **Date Added (Newest First)**, or by **Yelp Rating (Highest to Lowest)**.
   - **Inline Note & Controls**: Each saved restaurant displays its synced **Note** directly in the list row/card (with one-click inline editing), its **Yelp Rating**, its editable **1–5 Star User Rating**, a direct **Yelp Page Link**, and—specifically inside the `"Been Here"` list—an interactive **`Y` / `N` ("Will Go Back")** toggle switch.
   - **Multi-Select Restaurants**: Users can check multiple restaurants inside the list and click **Remove Selected** to batch-remove them from that list.
   - **Export CSV & Share**: Clicking **Export CSV** downloads a standard RFC-4180 `.csv` file containing the exact 7 required columns:
     1. `Restaurant Name`
     2. `Type of Restaurant`
     3. `Yelp Page Link`
     4. `User Rating`
     5. `Yelp Rating`
     6. `Notes`
     7. `Will Go Back (Y/N)`
   - Clicking **Share List** generates a zero-account shareable link (or copies a formatted summary) that recipients can open to inspect or import the list into their own browser.

5. **Settings Tab & Build/Deployment Guide**:
   - Allows setting a default U.S. home city/state for faster searching, default list sort order, full local data management (Export/Import JSON backup, Reset Demo Data), and an interactive **Step-by-Step AI Studio Build & Free Deployment Guide**.

#### Visual Identity & Theme

- **Aesthetic Direction**: Editorial Culinary Utility — inspired by modern Michelin/Beli/Eater guides and crisp SaaS data organizers. Warm, appetizing, and structured with high scannability and zero visual clutter.
- **Color Palette & Mood (60-30-10 Allocation)**:
  - *60% Dominant Neutral Canvas*: Crisp Alabaster (`#FAF9F6`) workspace background with pure white (`#FFFFFF`) elevated surfaces.
  - *30% Structural Surfaces & Typography*: Deep Espresso Slate (`#18181B`) primary text, Muted Stone (`#71717A`) metadata text, and subtle `1px solid #E4E4E7` hairline dividers.
  - *10% Accent Budget*: Culinary Vermilion (`#D32323`) for primary CTAs, Yelp rating stars, and active states; Warm Amber (`#D97706`) for personal user star ratings; Semantic Emerald (`#16A34A`) and Rose (`#E11D48`) paired with explicit `'Y'` and `'N'` labels for the "Will Go Back" toggle.
- **Typography & Hierarchy**:
  - *Display & Navigation*: `Plus Jakarta Sans` (600/700 weight) for crisp headings and the `YURFAT` brand wordmark.
  - *Body & Notes*: `DM Sans` (400/500 weight) for clean reading of restaurant notes and descriptions.
  - *Numeric Data & Ratings*: `JetBrains Mono` with `tabular-nums` for star ratings (`4.5 ★`), review counts, dates added, and CSV previews.
- **Layout & Anti-Slop Discipline**:
  - **Top Bar Contract**: Single-row header with three zones separated by `gap-8`: Brand wordmark (`YURFAT`) on the left, concise single-line navigation tabs (`Search`, `My Lists`, `Settings`) in the center, and one primary action (`Quick Export CSV`) on the right.
  - **Zero-Pill Metadata**: Restaurant categories, price tiers, and U.S. cities are rendered as clean inline text separated by interpuncts (`Seafood · $$$ · Seattle, WA`) rather than cluttered badge sandwiches.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Server-Side Gemini Search Grounding (`gemini-3.8-flash`) vs. Paid Yelp API**
  - *Chosen Approach*: Route U.S. restaurant queries through an Express `/api/search` endpoint that calls `gemini-3.8-flash` with `googleSearch: {}` grounding constrained to United States Yelp listings, paired with a rich starter catalog of iconic U.S. restaurants for immediate zero-latency testing.
  - *Why*: Yelp's official API now costs $229+/month. Gemini 3.8 Flash with Google Search grounding is built into Google AI Studio at no cost, retrieves real Yelp URLs, ratings, and cuisine categories across all 50 U.S. states, and requires zero external API keys or credit cards.
- **Decision 2: Normalized Restaurant Store vs. Duplicated List Items**
  - *Chosen Approach*: Store restaurant metadata, user rating (1–5), `willGoBack` (`'Y' | 'N' | ''`), and `notes` in a normalized `savedRestaurants` dictionary keyed by `restaurantId`, while each `SavedList` stores an array of `{ restaurantId, addedAt }` entries.
  - *Why*: Requirement 16 specifies that a note added to a restaurant must be viewable across *all* lists that restaurant is part of. Normalizing the restaurant record guarantees that updating a note or user rating in one list immediately updates it everywhere and in every CSV export.
- **Decision 3: Mutual Exclusivity Enforcement with Explicit Choice Prompt**
  - *Chosen Approach*: Whenever a user selects `"Been Here"` for a restaurant already in `"Want to Go"` (or vice versa), display a clear conflict prompt: *"Saves can't be in both 'Want to Go' and 'Been Here'"* with explicit buttons letting the user choose which list to keep or switch to.
  - *Why*: Prevents accidental rule violations while making it effortless to transition a restaurant from `"Want to Go"` to `"Been Here"` once visited.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

#### Architecture & Component Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        Top Navigation Bar (3-Zone)                         │
│   [YURFAT]             [Search]  [My Lists]  [Settings]     [Export CSV]   │
└───────────────┬──────────────────────┬───────────────────────┬─────────────┘
                │                      │                       │
                ▼                      ▼                       ▼
┌───────────────────────────┐ ┌──────────────────────┐ ┌─────────────────────┐
│   Home: US Search View    │ │    My Lists View     │ │    Settings View    │
│ ───────────────────────── │ │ ──────────────────── │ │ ─────────────────── │
│ • Query + US City/State   │ │ • Default Lists:     │ │ • Default US City   │
│ • US-Only Filter Guard    │ │   "Want to Go" (🔒)  │ │ • JSON Backup /     │
│ • Result Cards:           │ │   "Been Here"  (🔒)  │ │   Share Link Import │
│   - Yelp Rating & Link    │ │ • Unlimited Custom   │ │ • Step-by-Step      │
│   - Cuisine & Address     │ │   Lists (CRUD)       │ │   AI Studio Build & │
│   - Quick-Add Star [★]    │ │ • Multi-Select Lists │ │   Free Deploy Guide │
└───────────────┬───────────┘ │   for Mass Delete    │ └─────────────────────┘
                │             └──────────┬───────────┘
                │                        │
                ▼                        ▼
┌───────────────────────────┐ ┌──────────────────────────────────────────────┐
│  Save / Star Modal [★]    │ │           Single List Detail View            │
│ ───────────────────────── │ │ ──────────────────────────────────────────── │
│ • Select 1 or Many Lists  │ │ • Sort: Alphabetical | Date Added | Rating   │
│ • + Create List on Fly    │ │ • Inline Shared Note Viewer & Quick Editor   │
│ • Mutual Exclusivity Rule │ │ • Editable 1–5 Star User Rating              │
│   ("Want to Go" vs        │ │ • "Been Here" Exclusive: Will Go Back (Y/N)  │
│    "Been Here" Prompt)    │ │ • Multi-Select Restaurants -> Batch Remove   │
│ • 1–5 User Star Rating    │ │ • Export List to CSV (7 Columns) & Share URL │
│ • Shared Restaurant Note  │ └──────────────────────┬───────────────────────┘
└───────────────┬───────────┘                        │
                └──────────────────┬─────────────────┘
                                   ▼
┌────────────────────────────────────────────────────────────────────────────┐
│              Normalized Client State Store (Browser Storage)               │
│  • lists: SavedList[] ("Want to Go", "Been Here", + Custom Lists)          │
│  • restaurants: Record<id, { yelpData, userRating, notes, willGoBack }>    │
└───────────────┬────────────────────────────────────────────────────────────┘
                │ POST /api/search (query, usLocation)
                ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                 Express Backend Server & Gemini Proxy                      │
│  • Validates US-only location constraint                                   │
│  • Calls gemini-3.8-flash with googleSearch grounding for Yelp US listings │
│  • Parses structured restaurant metadata, Yelp rating, type & Yelp URL     │
└────────────────────────────────────────────────────────────────────────────┘
```

#### Data Model & State

1. **`RestaurantRecord` (Normalized per unique restaurant)**:
   - `id`: Unique slug/identifier (e.g., `katzs-delicatessen-new-york`).
   - `name`: Restaurant display name.
   - `cuisineType`: Primary category/type of restaurant (e.g., `"Deli, Sandwiches"`, `"Authentic Mexican"`, `"Seafood"`).
   - `yelpUrl`: Direct URL to the Yelp business page (`https://www.yelp.com/biz/...` or grounded Yelp search link).
   - `yelpRating`: Numeric Yelp rating (`1.0` to `5.0`).
   - `reviewCount`: Number of Yelp reviews.
   - `price`: Price tier (`$`, `$$`, `$$$`, `$$$$`).
   - `address`: Street address, US City, State code, and ZIP.
   - `userRating`: User's personal rating (`0` if unrated, or `1`–`5`).
   - `notes`: User's text notes for this restaurant (synced globally across all lists).
   - `willGoBack`: `'Y' | 'N' | ''` marker indicating if the user will return (prominently toggled in `"Been Here"` and exported in CSV).

2. **`SavedList`**:
   - `id`: Unique ID (`want-to-go`, `been-here`, or custom UUID).
   - `name`: Display name (`"Want to Go"`, `"Been Here"`, or custom name).
   - `description`: Optional subtitle/description.
   - `isDefault`: Boolean (`true` only for `"Want to Go"` and `"Been Here"`, preventing deletion and enforcing mutual exclusivity).
   - `items`: Array of `{ restaurantId: string; addedAt: string }` to track exact per-list `Date Added` sorting.

#### Interactive Component & State Mapping

- **US-Only Restaurant Search Handler**: Validates that the location input is within the United States (US states, cities, or 5-digit ZIP codes; rejects non-US countries with a helpful prompt), queries `/api/search`, and displays grounded Yelp restaurant matches.
- **Star Button (`★`) & Mutual Exclusivity Guard**: Clicking the Star on any search card opens the multi-list modal. If the user checks `"Been Here"` while `"Want to Go"` is checked (or vice versa), the state handler intercepts the click, displays the message *"Saves can't be in both 'Want to Go' and 'Been Here'"*, and lets the user confirm which of the two lists to use.
- **On-the-Fly List Creation**: Inside the Star modal, typing a new list name and clicking **Create & Select** immediately creates the list, checks its box for the current restaurant, and persists it.
- **Multi-Select Batch Operations**:
  - *Within a List*: Checking multiple restaurant rows reveals a contextual bulk action bar with **Remove X Selected from List** and **Export Selected to CSV**.
  - *Across Lists*: In the **My Lists** tab, toggling **Multi-Select Lists** allows checking any number of custom lists and clicking **Delete Selected Lists** (with `"Want to Go"` and `"Been Here"` protected).
- **Sorting Engine**: Each list view computes sorted rows on the fly using:
  - `alphabetical`: `a.name.localeCompare(b.name)`
  - `dateAdded`: `new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()`
  - `yelpRating`: `b.yelpRating - a.yelpRating`
- **CSV Exporter**: Generates a properly escaped UTF-8 CSV file (`Blob` + `URL.createObjectURL`) with header:
  `Restaurant Name,Type of Restaurant,Yelp Page Link,User Rating,Yelp Rating,Notes,Will Go Back`
  and triggers an immediate local download named `yurfat-<list-slug>.csv`.

---

### 5. Step-by-Step Instructions: How to Build & Deploy for Free in Google AI Studio

Once you click **Proceed** to approve this plan, I will build the complete **YURFAT** Phase 1 MVP right here in your Google AI Studio workspace. Below is the end-to-end guide for how we build, test, and deploy it at **$0 cost**:

1. **Step 1 — Approve Plan & Automated Full-Stack Build (In AI Studio)**:
   - Click **Proceed** on this plan. AI Studio will automatically generate the Express backend (`/api/search` with free Gemini Search Grounding for US Yelp data) and the React + Tailwind frontend implementing all 17 requirements under the **YURFAT** brand.
2. **Step 2 — Verify Free Gemini API Key Configuration**:
   - AI Studio automatically injects `GEMINI_API_KEY` into the backend environment at runtime. Using `gemini-3.8-flash` keeps search grounding fast and within the free tier—no Yelp API subscription ($229/mo) or credit card required.
3. **Step 3 — Test the Core MVP Workflows in Preview**:
   - Search any U.S. restaurant + city/state on the Home Screen.
   - Click the Star (`★`) on results to test adding to `"Want to Go"`, `"Been Here"` (verifying the mutual exclusivity prompt), and creating new custom lists on the fly with notes and 1–5 star ratings.
   - Open `"Been Here"` to toggle `'Y' / 'N'` ("Will Go Back"), test sorting (Alphabetical, Date Added, Yelp Rating), test multi-select deletion, and click **Export CSV** to inspect the downloaded 7-column spreadsheet.
4. **Step 4 — Deploy & Share for Free via Google AI Studio / Cloud Run**:
   - Use the **Share / Deploy** button in the top-right corner of Google AI Studio to publish **YURFAT** to a public URL (`*.run.app`).
   - Because all user lists are stored in the visitor's browser (`localStorage`) and shareable via self-contained URL links or CSV exports, every user who visits your deployed URL gets their own private workspace without you paying for a database or authentication service.
5. **Step 5 — Phase 2 Expansion (When Ready)**:
   - In Phase 2, we can enable one-click **Save CSV to Google Drive / Google Sheets** using client-side Google Workspace OAuth (`https://www.googleapis.com/auth/drive.file`), which is also 100% free and only requires configuring a Google Cloud OAuth Consent screen.
