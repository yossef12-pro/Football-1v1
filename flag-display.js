// Flag Display - Middle Screen Functionality

// List of all flag filenames (without extension)
const flagList = [
    'argentina', 'belgium', 'brazil-', 'egypt',
    'china', 'france', 'germany', 'italy',
    'japan', 'poland', 'portugal', 'england',
    'spain', 'united-kingdom', 'SaudiArabia', 'qatar',
    'south-korea', 'palestine'
];

// Variables to control the flag display
let currentFlagIndex = 0;
let flagChangeInterval;
let isTransitioning = false;

// Initialize flag display when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initFlagDisplay();
});

/**
 * Initialize the flag display in the middle screen
 */
function initFlagDisplay() {
    // Get the flag display element
    const flagDisplay = document.querySelector('.flag-display');
    if (!flagDisplay) return;

    // Set the initial flag
    updateFlagDisplay();

    // Start the interval to change flags
    flagChangeInterval = setInterval(() => {
        changeFlag();
    }, 3000);  // Change flag every 3 seconds
}

/**
 * Update the flag display with the current flag
 */
function updateFlagDisplay() {
    const flagDisplay = document.querySelector('.flag-display');
    if (!flagDisplay) return;

    // Get the current flag name
    const currentFlag = flagList[currentFlagIndex];
    
    // Update the background image
    flagDisplay.style.backgroundImage = `url('flags/${currentFlag}.png')`;
}

/**
 * Change to the next flag with transition effects
 */
function changeFlag() {
    // Prevent multiple transitions at once
    if (isTransitioning) return;
    isTransitioning = true;

    // Trigger the flicker effect by adding and removing a class
    const flagDisplay = document.querySelector('.flag-display');
    if (!flagDisplay) return;
    
    // Add the transition class
    flagDisplay.classList.add('flag-transition');
    
    // After a short delay, change the flag and remove the transition class
    setTimeout(() => {
        // Move to the next flag
        currentFlagIndex = (currentFlagIndex + 1) % flagList.length;
        updateFlagDisplay();
        
        // Short delay before removing the transition class
        setTimeout(() => {
            flagDisplay.classList.remove('flag-transition');
            isTransitioning = false;
        }, 200);
    }, 300);
}

/**
 * Manually trigger a flag change (can be used for testing)
 */
function triggerFlagChange() {
    changeFlag();
}

/**
 * Clean up intervals when the page is unloaded
 */
window.addEventListener('beforeunload', function() {
    if (flagChangeInterval) {
        clearInterval(flagChangeInterval);
    }
}); 