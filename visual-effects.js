// Visual effects manager for the football game
class VisualEffectsManager {
    constructor() {
        // Initialize
        this.init();
    }
    
    init() {
        // Check if performance mode is enabled
        const performanceMode = localStorage.getItem('performanceMode') === 'true';
        
        // In performance mode, only set up essential effects
        if (performanceMode) {
            console.log('Performance mode enabled - reducing visual effects');
            // Still set up screens but with reduced effects
            this.setupCameraFlashes(true);
        } else {
            // Full effects mode
            this.setupCameraFlashes(false);
        }
    }
    
    setupCameraFlashes(reducedEffects) {
        // Make sure the camera flashes are randomly triggered
        const topFlashes = document.querySelectorAll('.crowd-top [class^="flash"]');
        const bottomFlashes = document.querySelectorAll('.crowd-bottom [class^="flash"]');
        
        // In reduced effects mode, we'll add fewer flashes with longer intervals
        const flashInterval = reducedEffects ? 8000 : 4000;
        
        if (!reducedEffects) {
            // Only add random flashes in full effects mode
            this.addRandomFlashes(topFlashes);
            this.addRandomFlashes(bottomFlashes);
        }
        
        // Periodically trigger camera flashes
        setInterval(() => {
            // Skip if in performance mode
            if (localStorage.getItem('performanceMode') === 'true' && !reducedEffects) return;
            
            // Trigger a random flash
            const allFlashes = [...topFlashes, ...bottomFlashes];
            if (allFlashes.length > 0) {
                const randomIndex = Math.floor(Math.random() * allFlashes.length);
                const flash = allFlashes[randomIndex];
                
                // Trigger animation
                flash.style.animation = 'none';
                void flash.offsetWidth; // Force reflow
                flash.style.animation = 'flash-starburst ' + (Math.random() * 2 + 3) + 's';
            }
        }, flashInterval);
    }
    
    addRandomFlashes(flashes) {
        flashes.forEach(flash => {
            // Set random delays for initial animations
            const delay = Math.random() * 10; // 0-10 second initial delay
            flash.style.animationDelay = delay + 's';
            
            // Set random durations
            const duration = Math.random() * 2 + 3; // 3-5 seconds
            flash.style.animationDuration = duration + 's';
            
            // Set animation
            flash.style.animation = 'flash-starburst ' + duration + 's infinite ' + delay + 's';
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.visualEffects = new VisualEffectsManager();
});

// Function to trigger goal celebration effects
function triggerGoalCelebration() {
    // Check if performance mode is enabled
    const performanceMode = localStorage.getItem('performanceMode') === 'true';
    
    // Trigger camera flashes in the crowd
    const topFlashes = document.querySelectorAll('.crowd-top [class^="flash"]');
    const bottomFlashes = document.querySelectorAll('.crowd-bottom [class^="flash"]');
    
    if (!performanceMode) {
        // Only do intensive effects in full mode
        [...topFlashes, ...bottomFlashes].forEach(flash => {
            // Reset animation
            flash.style.animation = 'none';
            void flash.offsetWidth; // Force reflow
            
            // Add animation with random delay
            const delay = Math.random() * 0.5;
            flash.style.animation = `flash-starburst ${Math.random() * 2 + 3}s infinite ${delay}s`;
        });
    }
    
    // Always show the digital screens content - even in performance mode
    // This ensures the screens are visible but with reduced effects
    const screenContents = document.querySelectorAll('.screen-content');
    screenContents.forEach(content => {
        // Make sure content is visible
        content.style.display = 'flex';
    });
    
    // Make sure sponsor logos are visible
    const sponsorLogos = document.querySelectorAll('.sponsor-logo');
    sponsorLogos.forEach(logo => {
        logo.style.display = 'inline-block';
        logo.style.opacity = '1';
    });
    
    // Make sure bottom screen content is visible
    const bottomScreenContent = document.querySelector('.screen-content-bottom');
    if (bottomScreenContent) {
        bottomScreenContent.style.display = 'flex';
    }
} 