// Flag Display - Middle Screen Functionality

// List of all flag filenames (without extension)
const flagList = [
    'argentina', 'belgium', 'brazil-', 'egypt',
    'china', 'france', 'germany', 'italy',
    'japan', 'poland', 'portugal', 'england',
    'spain', 'united-kingdom', 'SaudiArabia', 'qatar',
    'south-korea', 'palestine'
];

// Variables to control the flag displays
let currentFlagIndices = [0, 5, 10]; // Start with different flags for each display
let flagChangeInterval;
let isTransitioning = false;

// Initialize flag displays when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initFlagDisplays();
});

/**
 * Initialize all flag displays in the middle screen
 */
function initFlagDisplays() {
    // Get all flag display elements
    const flagDisplays = document.querySelectorAll('.flag-display');
    if (!flagDisplays.length) return;

    // Set the initial flags
    updateFlagDisplays();

    // Start the interval to change flags
    flagChangeInterval = setInterval(() => {
        changeFlags();
    }, 3000);  // Change flags every 3 seconds
}

/**
 * Update all flag displays with current flags
 */
function updateFlagDisplays() {
    const flagDisplays = document.querySelectorAll('.flag-display');
    if (!flagDisplays.length) return;

    // Update each flag display
    flagDisplays.forEach((display, index) => {
        // Get the current flag name for this display
        const currentFlag = flagList[currentFlagIndices[index]];
        
        // Update the background image
        display.style.backgroundImage = `url('flags/${currentFlag}.png')`;
    });
}

/**
 * Change to the next set of flags with transition effects
 */
function changeFlags() {
    // Prevent multiple transitions at once
    if (isTransitioning) return;
    isTransitioning = true;

    // Get all flag displays
    const flagDisplays = document.querySelectorAll('.flag-display');
    if (!flagDisplays.length) return;
    
    // Add the transition class to all displays
    flagDisplays.forEach(display => {
        display.classList.add('flag-transition');
    });
    
    // After a short delay, change the flags and remove the transition class
    setTimeout(() => {
        // Move to the next flags, ensuring all displays show different flags
        for (let i = 0; i < currentFlagIndices.length; i++) {
            currentFlagIndices[i] = (currentFlagIndices[i] + 3) % flagList.length;
        }
        updateFlagDisplays();
        
        // Short delay before removing the transition class
        setTimeout(() => {
            flagDisplays.forEach(display => {
                display.classList.remove('flag-transition');
            });
            isTransitioning = false;
        }, 200);
    }, 300);
}

/**
 * Manually trigger a flag change (can be used for testing)
 */
function triggerFlagChange() {
    changeFlags();
}

/**
 * Clean up intervals when the page is unloaded
 */
window.addEventListener('beforeunload', function() {
    if (flagChangeInterval) {
        clearInterval(flagChangeInterval);
    }
}); 