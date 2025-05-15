// ==UserScript==
// @name         Nitan Airport Flair
// @namespace    http://tampermonkey.net/
// @version      0.4
// @description  Enhances webpage content by identifying airport IATA codes, styling them, and adding interactive tooltips and hyperlinks, with an ignore list and local data resource.
// @author       s5kf
// @license      CC BY-NC-ND 4.0; https://creativecommons.org/licenses/by-nc-nd/4.0/
// @match        *://www.uscardforum.com/*
// @resource     airportJsonData https://raw.githubusercontent.com/s5kf/airport_flair/main/airports_filtered.json
// @grant        GM_addStyle
// @grant        GM_getResourceText
// @run-at       document-idle
// @downloadURL  https://raw.githubusercontent.com/s5kf/airport_flair/main/airport_flair.user.js
// @updateURL    https://raw.githubusercontent.com/s5kf/airport_flair/main/airport_flair.user.js
// @supportURL   https://github.com/s5kf/airport_flair/issues 
// ==/UserScript==

(function() {
    'use strict';

    let airportData = {}; // To store airport data keyed by IATA code
    let observer = null; // To store the MutationObserver instance

    // --- Constants (moved up for early initialization) ---
    const iataRegex = /\b([A-Za-z]{3})\b/g;
    const processedMark = 'airport-flair-processed';
    const flairTag = 'airport-flair-tag'; // Class for the flair span itself
    const potentialFlairClass = 'potential-airport-code'; // New class for potential flairs

    // --- Load Airport Data from @resource ---
    function initializeAirportData() {
        try {
            console.log("Attempting to load airport data from @resource...");
            const jsonDataString = GM_getResourceText("airportJsonData");
            if (!jsonDataString) {
                console.error("Failed to get airport data from @resource. GM_getResourceText returned empty.");
                return false;
            }

            // Pre-process the JSON string to handle non-standard values like Infinity and NaN
            const sanitizedJsonDataString = jsonDataString
                .replace(/: Infinity,/g, ": null,")
                .replace(/: Infinity}/g, ": null}")
                .replace(/: NaN,/g, ": null,")
                .replace(/: NaN}/g, ": null}");

            const data = JSON.parse(sanitizedJsonDataString);
            data.forEach(airport => {
                if (airport.iata_code) { // This will correctly skip null iata_codes
                    airportData[airport.iata_code.toUpperCase()] = airport;
                }
            });
            console.log("Airport data loaded and processed from @resource:", Object.keys(airportData).length, "entries");
            return true;
        } catch (e) {
            console.error("Error loading or parsing airport data from @resource:", e);
            if (jsonDataString) { // Log snippet if resource was read but parsing failed
                 console.error("Original resource text snippet (first 500 chars if error persists):", jsonDataString.substring(0,500));
            }
            return false;
        }
    }

    // Initialize data and then process the page
    if (initializeAirportData()) {
        // Call processPage directly as data loading is now synchronous relative to script execution start
        // It might still be deferred by @run-at document-idle, so DOM might be ready.
        // Ensure processPage handles the case where the DOM isn't fully ready if run too early,
        // but with document-idle, it should be fine.
        processPage();
    } else {
        console.error("Airport Flair script will not run due to data loading issues.");
    }

    // --- CSS Styles ---
    function getDynamicStyles() {
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const htmlElement = document.documentElement;
        const bodyElement = document.body;

        let isLikelyDarkMode = prefersDark ||
                               htmlElement.classList.contains('dark') ||
                               bodyElement.classList.contains('dark') ||
                               htmlElement.classList.contains('dark-mode') || // Added common alternative
                               bodyElement.classList.contains('dark-mode');   // Added common alternative

        // Get computed background colors
        const htmlBgColor = getComputedStyle(htmlElement).backgroundColor;
        const bodyBgColor = getComputedStyle(bodyElement).backgroundColor;

        // Function to check if a CSS color string represents a dark color
        function isColorDark(colorString) {
            if (!colorString || colorString === 'transparent' || colorString === 'rgba(0, 0, 0, 0)') return false;
            if (colorString === 'rgb(0, 0, 0)' || colorString === '#000000') return true; // Pure black
            try {
                const rgbMatch = colorString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
                if (rgbMatch) {
                    const r = parseInt(rgbMatch[1], 10);
                    const g = parseInt(rgbMatch[2], 10);
                    const b = parseInt(rgbMatch[3], 10);
                    // Heuristic: if average intensity is low, or all components are relatively low
                    if ((r + g + b) / 3 < 75 || (r < 100 && g < 100 && b < 100)) {
                        return true;
                    }
                }
            } catch (e) {
                // Ignore parsing errors, default to not dark for this check
            }
            return false;
        }

        if (!isLikelyDarkMode) {
            // If no class or media query indicated dark mode, check computed background colors
            if (isColorDark(bodyBgColor) || isColorDark(htmlBgColor)) {
                isLikelyDarkMode = true;
            }
        }

        let flairBgColor = '#eff3f4'; // Default light mode

        if (isLikelyDarkMode) {
            // Now, differentiate between dim and lights out if we've determined it's dark
            // Prioritize body background for "lights out" check, then html
            if (bodyBgColor === 'rgb(0, 0, 0)' || bodyBgColor === '#000000' ||
                htmlBgColor === 'rgb(0, 0, 0)' || htmlBgColor === '#000000') {
                flairBgColor = '#202327'; // Lights out
            } else {
                flairBgColor = '#273440'; // Dim mode (default dark)
            }
        }

        return `
            .airport-flair {
                display: inline-flex;
                align-items: center;
                vertical-align: baseline;
                font-family: 'Fira Code', 'Roboto Mono', monospace;
                padding: 1px 4px; /* Reduced padding */
                color: #e6c07b; /* Light gold text */
                background-color: ${flairBgColor};
                border-radius: 3px;
                text-decoration: none; /* For the anchor tag */
                margin: 0 1px; /* Small margin to prevent touching adjacent text */
                position: relative; /* For absolute positioning of the dismiss button */
            }
            .airport-flair img.country-flag {
                width: 16px;
                height: 12px;
                margin-left: 4px; /* Switched from margin-right and slightly increased for balance */
                vertical-align: middle;
            }
            .airport-flair .dismiss-flair {
                position: absolute;
                top: -6px;
                right: -6px;
                width: 16px;
                height: 16px;
                line-height: 16px;
                text-align: center;
                font-size: 14px;
                font-weight: bold;
                background-color: rgba(74, 74, 74, 0.6); /* Translucent background */
                color: #ffffff;
                border-radius: 50%;
                cursor: pointer;
                opacity: 0;
                visibility: hidden; /* Start hidden */
                /* Only transition opacity and background-color for smoothness */
                transition: opacity 0.15s ease-in-out, background-color 0.15s ease-in-out;
                pointer-events: none; /* Prevent interaction when hidden */
                z-index: 10;
            }
            .airport-flair:hover .dismiss-flair {
                opacity: 0.85; /* Default visible opacity */
                visibility: visible; /* Become visible */
                pointer-events: auto; /* Allow interaction when visible */
            }
            .airport-flair .dismiss-flair:hover {
                opacity: 1; /* Full opacity on button hover */
                background-color: rgba(51, 51, 51, 0.85); /* Darker, slightly more opaque on hover */
            }
            .${potentialFlairClass} {
                text-decoration: underline dotted rgba(128, 128, 128, 0.7);
                cursor: help;
                /* Ensure it doesn't pick up parent link styles if it's inside an <a> not yet processed */
                color: inherit; 
            }
            .${potentialFlairClass}:hover {
                text-decoration-color: rgba(100, 100, 100, 1); /* Darker underline on hover */
                background-color: rgba(200, 200, 200, 0.1); /* Very subtle hover background */
            }
            /* No specific hover title CSS needed if using default browser title attribute */
        `;
    }

    function injectStyles() {
        // Remove existing styles if they exist to update dynamic ones (like dark mode)
        const existingStyleId = 'airport-flair-styles';
        let existingStyleElement = document.getElementById(existingStyleId);
        if (existingStyleElement) {
            existingStyleElement.remove();
        }
        GM_addStyle(getDynamicStyles());
        // Add an ID to the style element for easy removal/update if needed
        const styleElements = document.head.getElementsByTagName('style');
        if(styleElements.length > 0) {
             // Assume the last style element added by GM_addStyle is ours if we don't have a direct way to ID it from GM_addStyle
            styleElements[styleElements.length - 1].id = existingStyleId;
        }
    }

    // --- DOM Interaction & Manipulation ---
    function createFlairElement(code, airportInfo, originalCasing = null) {
        const anchor = document.createElement('a');
        anchor.href = `https://www.google.com/search?q=airport+${code}`;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        anchor.classList.add('airport-flair');
        anchor.classList.add(processedMark); // Mark the anchor itself

        // Tooltip text
        let titleText = `${airportInfo.name} (${code})`;
        if (airportInfo.municipality) titleText += `, ${airportInfo.municipality}`;
        if (airportInfo.iso_country) titleText += `, ${airportInfo.iso_country}`;
        anchor.title = titleText;

        // Append IATA code text first
        const codeTextNode = document.createTextNode(code);
        anchor.appendChild(codeTextNode);

        // Then append flag image if country is available
        if (airportInfo.iso_country) {
            const flagImg = document.createElement('img');
            flagImg.src = `https://cdnjs.cloudflare.com/ajax/libs/flag-icon-css/4.1.5/flags/4x3/${airportInfo.iso_country.toLowerCase()}.svg`;
            flagImg.alt = `${airportInfo.iso_country} flag`;
            flagImg.classList.add('country-flag');
            anchor.appendChild(flagImg);
        }

        // Add Dismiss Button
        const dismissBtn = document.createElement('span');
        dismissBtn.classList.add('dismiss-flair');
        dismissBtn.innerHTML = '&times;';
        dismissBtn.dataset.code = code; // This is the uppercase code

        if (originalCasing && originalCasing !== code) {
            dismissBtn.dataset.originalCasing = originalCasing;
            dismissBtn.title = `Revert to '${originalCasing}' (potential airport code)`;
        } else {
            // For originally all-caps flairs, or if originalCasing is same as code (shouldn't happen with current logic)
            dismissBtn.title = `Revert to '${code}' (potential airport code)`;
        }

        dismissBtn.addEventListener('click', function(event) {
            console.log("[Airport Flair] Dismiss button clicked. Event target:", event.target);
            event.preventDefault();
            event.stopPropagation();

            const currentCode = event.target.dataset.code; // Uppercase code of the flair
            const originalMixedCasing = event.target.dataset.originalCasing; // Original mixed-case, if any
            const currentFlairElement = event.target.closest('.airport-flair');
            console.log("[Airport Flair] Code to revert/handle:", currentCode, "Original mixed casing:", originalMixedCasing);
            console.log("[Airport Flair] Found flair element:", currentFlairElement);

            if (currentFlairElement && currentFlairElement.parentNode) {
                const codeForPotential = originalMixedCasing || currentCode; // Use original mixed, fallback to current uppercase
                console.log("[Airport Flair] Attempting to revert to potential flair with casing:", codeForPotential);
                const airportInfoForReversion = airportData[codeForPotential.toUpperCase()]; // Ensure we use uppercase for lookup

                if (airportInfoForReversion) {
                    const potentialElement = createPotentialFlairElement(codeForPotential, airportInfoForReversion);
                    currentFlairElement.parentNode.replaceChild(potentialElement, currentFlairElement);
                    console.log("[Airport Flair] Flair replaced with new potential flair using casing:", codeForPotential);
                } else {
                    // Fallback: This should ideally not be reached if data is consistent and currentCode is always valid.
                    // Revert to plain text (using the most specific code we have) if airport info is lost.
                    const revertText = originalMixedCasing || currentCode;
                    const revertedTextSpan = document.createElement('span');
                    revertedTextSpan.textContent = revertText;
                    revertedTextSpan.classList.add(processedMark);
                    currentFlairElement.parentNode.replaceChild(revertedTextSpan, currentFlairElement);
                    console.warn("[Airport Flair] Reverted to text; airport info not found for potential (should not happen for code:", codeForPotential.toUpperCase(), ")");
                }
            } else {
                console.log("[Airport Flair] Could not find flair element or its parent for dismiss.", currentFlairElement);
            }
        });
        anchor.appendChild(dismissBtn);

        return anchor;
    }

    // --- Function to create a span for potential, non-all-caps airport codes ---
    function createPotentialFlairElement(originalCode, airportInfo) {
        const span = document.createElement('span');
        span.classList.add(potentialFlairClass);
        span.classList.add(processedMark); // Mark as processed to avoid re-evaluation by observer/processNode
        span.textContent = originalCode;
        
        let titleText = `Recognize ${originalCode.toUpperCase()} as an airport?`;
        if (airportInfo && airportInfo.name) {
            titleText += ` (${airportInfo.name})`;
        }
        span.title = titleText;

        // Store necessary info for conversion
        span.dataset.originalCode = originalCode;

        const clickListener = function(event) {
            event.preventDefault();
            event.stopPropagation();

            const codeToConvert = event.target.dataset.originalCode;
            const uppercaseCode = codeToConvert.toUpperCase();
            const currentAirportInfo = airportData[uppercaseCode];

            if (currentAirportInfo) {
                // Pass the originalCode (mixed-case) to createFlairElement
                const fullFlairElement = createFlairElement(uppercaseCode, currentAirportInfo, codeToConvert);
                if (event.target.parentNode) {
                    event.target.parentNode.replaceChild(fullFlairElement, event.target);
                }
            }
            // Listener is automatically removed as the element it was attached to is replaced.
        };

        span.addEventListener('click', clickListener, { once: true }); // { once: true } ensures it runs only once

        return span;
    }

    function replaceTextWithFlair(textNode) {
        if (!textNode.parentNode || textNode.parentNode.classList.contains(processedMark) || textNode.parentNode.closest('a, script, style, input, textarea, [contenteditable="true"]')) {
            return; // Already processed or in an excluded element
        }

        const text = textNode.nodeValue;
        let match;
        let lastIndex = 0;
        const fragment = document.createDocumentFragment();
        let foundMatch = false;

        while ((match = iataRegex.exec(text)) !== null) {
            const originalCode = match[1]; // e.g., "sjc", "DCA", "LAX"
            const uppercaseCode = originalCode.toUpperCase();

            const airportInfo = airportData[uppercaseCode];

            if (airportInfo) {
                foundMatch = true;
                // Text before the match
                if (match.index > lastIndex) {
                    fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
                }

                // If original code is already all uppercase, create full flair
                // Otherwise, create a potential flair span
                if (originalCode === uppercaseCode) {
                    const flairElement = createFlairElement(uppercaseCode, airportInfo);
                    fragment.appendChild(flairElement);
                } else {
                    const potentialElement = createPotentialFlairElement(originalCode, airportInfo);
                    fragment.appendChild(potentialElement);
                }
                lastIndex = iataRegex.lastIndex;
            }
        }

        if (foundMatch) {
            // Text after the last match
            if (lastIndex < text.length) {
                fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
            }
            // Replace the original text node with the fragment
            textNode.parentNode.replaceChild(fragment, textNode);
            // Mark parent to avoid re-processing (more robust than just the flair itself having the mark for parent checks)
            // However, this might be too broad. Marking the flair element itself (done in createFlairElement) and checking for that class is safer.
        }
    }

    function processNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            replaceTextWithFlair(node);
        }
        // Check if the node itself or its parent has been processed or is an excluded type
        else if (node.nodeType === Node.ELEMENT_NODE && 
                 !node.classList.contains(processedMark) && // Check for the generic processed mark
                 !node.closest('a, script, style, input, textarea, [contenteditable="true"], .' + flairTag + ', .' + potentialFlairClass)) {
            // If it's an element node, and not one of our flairs (full or potential), process its children
             Array.from(node.childNodes).forEach(child => processNode(child));
        }
    }

    function processAddedNodes(mutationList) {
        for (const mutation of mutationList) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    // Check if the node itself has already been processed (e.g. if it's part of a flair we just added)
                    if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains(processedMark)) {
                        return;
                    }
                    processNode(node);
                });
            }
        }
        // After processing mutations, it's good to re-evaluate dynamic styles like dark mode
        injectStyles();
    }

    function observeDOMChanges() {
        if (observer) observer.disconnect(); // Disconnect previous observer if any

        observer = new MutationObserver(processAddedNodes);
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        console.log("MutationObserver started.");
    }

    function processPage() {
        console.log("Processing page for airport codes...");
        injectStyles();
        // Initial scan of the entire body
        processNode(document.body);
        observeDOMChanges();
    }

    // --- Cleanup ---
    window.addEventListener('unload', () => {
        if (observer) {
            observer.disconnect();
            console.log("Disconnected MutationObserver.");
        }
    });

})(); 