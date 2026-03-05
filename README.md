# Fairs — Split bills fairly

![Expo](https://img.shields.io/badge/Expo-54-000020?style=flat&logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-0.81-61DAFB?style=flat&logo=react&logoColor=white)
![Platform](https://img.shields.io/badge/Platform-Android-3DDC84?style=flat&logo=android&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-purple?style=flat)
![Version](https://img.shields.io/badge/Version-1.0.0-B953D3?style=flat)

---

We have all been there. Eight people, one bill, several different meals, a couple of beers each, a shared dessert, and one person on a diet who insisted she only owed for the salad. Someone pulled out a calculator app. Someone else opened the notes app. A third person started doing mental math out loud, and i busted open a spreadsheet. There has to be a better way.

Most bill-splitting apps either assume everyone pays the same (they don't) or require you to sign up, create a profile, and connect to a cloud service just to calculate who owes what at a pizza place. Fairs does it all offline, on-device, in about thirty seconds — because that's all it should take.

---

## Overveiw

Fairs is an Android app for splitting bills between groups of people. You create a group for an occasion — a dinner, a trip, a night out — one person pays everithing, adds the items from the bill, adds the people at the table, ands assign who had what. The app handles the arithmetic, including tip in any form you prefer.

Everything lives on your phone. No accounts, no syncing, no subscriptions. Your data is stored locally via AsyncStorage and can be backed up or restored as a plain JSON file at any time. The app works on a plane, in a basement, and in any country.

---

## Features

**Groups** — Create named groups with a custom icon and automatic date; search, filter by icon type, and sort by name or date.

**Items tab** — Add items with a name, price, and optional multiplier for repeated orders (e.g. ×3 beers); tip support as a fixed amount or percentage.

**People tab** — Add people to a group, then split either equally across everyone or by assigning specific items to specific people.

**Separate split** — Assign each item to one or more people; the app calculates each person's exact share including their portion of the tip.

**Equal split** — Divide the total evenly across a custom number of people with a single tap.

**Paid tracking** — Mark each person as settled; paid names show in green on the group card so you know at a glance who still owes.

**Receipt scanner** — Point the camera at a bill or pick an image from the gallery; the app extracts item names and prices using on-device OCR and presents a reviewable list before importing.

**Export / Import** — Save a full JSON backup to any folder on the device; restore it later or selectively import only the groups you want.

**Share as text** — Export a human-readable summary of any group — items, tip, and per-person totals — via the system share sheet.

> **Note on the receipt scanner:** OCR accuracy depends on image quality and receipt layout. The parser uses two heuristic strategies (inline price detection and split-column detection) and works entirely on-device with no network calls. Some receipts will need manual corrections — the review step before importing exists precisely for this reason. Powered by `@react-native-ml-kit/text-recognition`.

---

## Screenshots

| Groups list | Group detail | People & split |
|---|---|---|
| ![Groups screen](assets/screenshots/groups.jpg) | ![Group detail](assets/screenshots/detail.jpg) | ![People tab](assets/screenshots/people.jpg) |

| Receipt scanner | Settings | Dark mode |
|---|---|---|
| ![Scanner](assets/screenshots/scanner.jpg) | ![Settings](assets/screenshots/settings.jpg) | ![Dark mode](assets/screenshots/dark.jpg) |

---

## Demo

| Adding a group | Scanning a receipt | Splitting the bill |
|---|---|---|
| ![Add group](assets/demo/add-group.gif) | ![Scan receipt](assets/demo/scan-receipt.gif) | ![Split bill](assets/demo/split-bill.gif) |
| *Create a group with icon and name in seconds* | *OCR extracts items straight from a photo* | *Assign items per person, totals update live* |

---

## Receipt Scanner — how it actually works

The scanner is the most technically interesting part of the app. There are no API calls, no cloud vision services, no sending your grocery receipts to a third-party server. Everything runs on the device using ML Kit's text recognition engine.

Once the text is extracted as a raw string, a custom parser takes over. It first tries an inline strategy: scan each line for a price at the end (matching `\d{1,4}[.,]\d{2}$`) and treat everything before it as the item name. This covers the majority of European and American receipts. If that yields no results — because the receipt puts names and prices in separate columns — it falls back to a split-column strategy, collecting name lines and price lines independently and pairing them by position. A blocklist of common noise words (`subtotal`, `tax`, `vat`, `thank you`, `www.`, etc.) filters out lines that should never become items.

The results land in a review screen where every extracted item is editable inline — name, price, and a toggle to deselect lines the parser got wrong. Only the selected items get imported into the group. It's not perfect, but it handles the realistic variety of receipts well enough that correcting one or two lines is usually all that's needed.

---

## Tech stack

| Library | Role |
|---|---|
| React Native 0.81 | Core UI framework |
| Expo ~54 | Toolchain, build system (EAS), native module access |
| React Navigation 7 | Stack + material top tabs navigation |
| AsyncStorage | Local persistence for groups, theme, and currency |
| react-native-gesture-handler | Swipeable list rows (edit/delete) |
| react-native-reanimated 4 | Swipe action animations |
| @react-native-ml-kit/text-recognition | On-device OCR for receipt scanning |
| expo-image-picker | Camera and gallery access for the scanner |
| expo-document-picker | JSON backup import |
| expo-file-system | Write backup files to device storage |
| expo-sharing | Share text summaries and backup files |
| @expo/vector-icons (Ionicons + MaterialCommunityIcons) | All iconography |
| expo-font | Custom Ysabeau font family loading |
| expo-splash-screen | Splash screen held until fonts are ready |

---

## Architecture

State lives in three React Contexts: `GroupsContext` owns the entire data model — all groups, items, people, tip values, and split modes — and persists it to AsyncStorage automatically on every change. `ThemeContext` manages the active palette (light/dark/system) using `useColorScheme` as the system signal, also persisted. `CurrencyContext` holds the selected currency code, which resolves to a symbol at render time. There is no external state library; the data model is simple enough that prop-drilling would have been the real problem, not state complexity.

The navigation stack is intentionally shallow: Groups → GroupDetail → Settings, all headerless. GroupDetail hosts a material top-tab navigator between the Items and People tabs, both of which read from and write to `GroupsContext` directly. This means the group total displayed in the header updates as you add items, with no lifting or callbacks needed.

The receipt parser is defined as a pure function outside the component tree — no hooks, no closures over component state — so it never causes unnecessary re-renders and is trivial to unit-test in isolation.

---

## Future ideas

- **iOS build** — The codebase is cross-platform; the only blocker is an Apple Developer account and some SAF-specific file handling on the export path.
- **History chart** — A simple per-person spending chart across multiple groups; useful for trips.
- **Widgets** — A home screen widget showing the outstanding balance from the most recently active group.

---

## About

Fairs was built because the apps that existed were either too simple (equal split only) or too heavy (accounts, sync, the works). It's a small, sharp tool for one specific job, and it tries to do that job without getting in the way. If it saved you from doing mental maths at a dinner table, it worked.
