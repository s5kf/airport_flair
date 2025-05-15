# Nitan Airport Flair

[![Install Nitan Airport Flair](https://img.shields.io/badge/Install%20Directly-brightgreen.svg?style=for-the-badge)](https://raw.githubusercontent.com/s5kf/airport_flair/main/airport_flair.user.js)
[![Install from Greasy Fork](https://img.shields.io/badge/Install%20from%20GreasyFork-informational.svg?style=for-the-badge)](https://greasyfork.org/en/scripts/536026-nitan-airport-flair)

A Tampermonkey/Violentmonkey userscript that enhances webpages by identifying 3-letter airport IATA codes, styling them with a "flair" including the country flag, and adding interactive tooltips and hyperlinks.

## Features

*   **Automatic Detection**: Identifies 3-letter airport IATA codes (e.g., LAX, YYZ, LHR) within webpage text.
*   **Enhanced Appearance**: Styles recognized codes with a distinctive flair, including:
    *   Country flag (flag displayed after the code).
    *   Monospaced font for readability.
    *   Custom background and text colors, with dark mode adaptation.
*   **Interactive Tooltips**: Hovering over a flair shows a tooltip with the airport name, municipality, and country code.
*   **Hyperlinks**: Clicking a flair opens a Google search for that airport.
*   **User-Controlled Recognition & Reversion**:
    *   **Potential Flairs (Non-All-Caps Codes)**: For codes not in all uppercase (e.g., "sjc", "Dfw"), the script initially applies a minimal style (dotted underline). Hovering shows a prompt like "Recognize SJC as an airport?". Clicking the term converts it to a full flair for that instance.
    *   **Dismiss/Revert Flairs**: Each full flair includes a small "×" button on hover. Clicking this button will:
        *   Revert the flair back to a "potential flair" state (dotted underline, original or uppercase casing as appropriate).
        *   This allows the user to re-evaluate and click to recognize it again if they change their mind.
        *   The dismiss action is per-instance and does not add the code to any permanent ignore list.
*   **Dynamic Content Handling**: Uses a `MutationObserver` to process content loaded dynamically (e.g., infinite scroll, lazy loading).
*   **Local Data**: Airport data is bundled with the script using Tampermonkey's `@resource` feature, avoiding runtime external JSON requests.
*   **Dark Mode Adaptation**: Attempts to detect the website's dark mode and adjusts flair colors accordingly.

## Target Websites

*   Currently matched for: `www.uscardforum.com` (can be expanded by editing the `// @match` line in the script).

## Installation

1.  **Install a Userscript Manager**: You need a userscript manager browser extension. Popular choices are:
    *   [Tampermonkey](https://www.tampermonkey.net/) (available for Chrome, Firefox, Edge, Safari, Opera)
    *   [Violentmonkey](https://violentmonkey.github.io/) (available for Chrome, Firefox, Edge, Opera)
2.  **Install the Script**:
    *   **Option A (Recommended - Greasy Fork for Auto-updates)**: 
        *   [Install from Greasy Fork](https://greasyfork.org/en/scripts/536026-nitan-airport-flair)
    *   **Option B (Direct from GitHub)**:
        *   [Click here to install](https://raw.githubusercontent.com/s5kf/airport_flair/main/airport_flair.user.js)

## How it Works

The script listens for page content changes and scans text nodes for patterns resembling 3-letter IATA airport codes. If a known code is found:
*   If the code is in all uppercase, it's immediately styled as a full flair.
*   If the code is in mixed or lowercase, it's styled as a "potential" code (dotted underline). Clicking it confirms and converts it to a full flair.
*   Clicking the "×" on any full flair reverts it to a "potential flair" for that specific instance.
*   Data is sourced from a filtered airport dataset.

## Contributing / Issues

Found a bug or have a feature request? Please open an issue on the [GitHub Issues page](https://github.com/s5kf/airport_flair/issues).

## License

This script is licensed under the [Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International License](https://creativecommons.org/licenses/by-nc-nd/4.0/). See the [LICENSE](LICENSE.md) file for details. 
