// Visual effects manager for the football game
class VisualEffectsManager {
    constructor() {
        // Initialize
        this.init();
    }
    
    init() {
        // Setup camera flashes
        this.setupCameraFlashes();
    }
    
    setupCameraFlashes() {
        // Make sure the camera flashes are randomly triggered
        const topFlashes = document.querySelectorAll('.crowd-top [class^="flash"]');
        const bottomFlashes = document.querySelectorAll('.crowd-bottom [class^="flash"]');
        
        // Add random additional flashes
        this.addRandomFlashes(topFlashes);
        this.addRandomFlashes(bottomFlashes);
    }
    
    addRandomFlashes(flashes) {
        // Add random additional flashes to simulate camera activity
        setInterval(() => {
            // Pick a random flash
            if (flashes.length > 0) {
                const randomIndex = Math.floor(Math.random() * flashes.length);
                const flash = flashes[randomIndex];
                
                // Reset animation
                flash.style.animation = 'none';
                void flash.offsetWidth; // Force reflow
                
                // Restart animation with random delay
                const delay = Math.random() * 2;
                flash.style.animation = `flash-starburst 4s infinite ${delay}s`;
            }
        }, 2000 + Math.random() * 3000); // Random interval between 2-5 seconds
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.visualEffects = new VisualEffectsManager();
});

// Dummy function to prevent errors in existing code
function triggerGoalCelebration() {
    // No action needed - effects removed
} 