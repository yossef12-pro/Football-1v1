// 2D Ball implementation with texture rotation and special effects
// 2d-ball.js

// Singleton pattern to ensure only one 2D ball exists
let ball2DInstance = null;

class Ball2D {
    // Static method to get the single instance
    static getInstance(gameField) {
        console.log('Ball2D.getInstance called');

        // If an instance exists, dispose it first
        if (ball2DInstance) {
            console.log('Disposing existing ball2DInstance');
            ball2DInstance.dispose();
            ball2DInstance = null;
        }

        // Create new instance
        console.log('Creating new Ball2D instance');
        ball2DInstance = new Ball2D(gameField);
        return ball2DInstance;
    }

    constructor(gameField) {
        this.gameField = gameField;
        this.container = gameField;
        this.width = gameField.offsetWidth;
        this.height = gameField.offsetHeight;

        // Create the ball element
        this.createBall();

        // Initialize rotation variables
        this.rotation = 0;
        this.lastPosition = { x: 0, y: 0 };
        this.isInitialized = false;

        // Special effects tracking
        this.touchCount = 0;
        this.isPoweredUp = false;
        this.trailElements = [];
        this.maxTrailElements = 10; // Maximum number of trail elements

        // Constant speed settings
        this.baseSpeed = 5; // Base constant speed
        this.currentSpeed = this.baseSpeed; // Current speed (will be doubled when powered up)

        // Create trail container
        this.createTrailContainer();

        // Start animation loop
        this.animate();
    }

    // Create a container for the trail elements
    createTrailContainer() {
        // Remove any existing trail container
        const existingContainer = document.getElementById('ball-trail-container');
        if (existingContainer) {
            existingContainer.remove();
        }

        // Create new container
        this.trailContainer = document.createElement('div');
        this.trailContainer.id = 'ball-trail-container';
        this.trailContainer.style.position = 'absolute';
        this.trailContainer.style.top = '0';
        this.trailContainer.style.left = '0';
        this.trailContainer.style.width = '100%';
        this.trailContainer.style.height = '100%';
        this.trailContainer.style.pointerEvents = 'none';
        this.trailContainer.style.zIndex = '90'; // Below the ball but above the field
        this.container.appendChild(this.trailContainer);
    }

    createBall() {
        // Create ball element
        this.ballElement = document.createElement('div');
        this.ballElement.className = 'textured-ball';
        this.ballElement.style.position = 'absolute';
        this.ballElement.style.width = '30px';
        this.ballElement.style.height = '30px';
        this.ballElement.style.borderRadius = '50%';
        this.ballElement.style.backgroundImage = "url('ball/texture.avif')";
        this.ballElement.style.backgroundSize = 'cover';
        this.ballElement.style.zIndex = '100';
        this.ballElement.style.pointerEvents = 'none';
        this.ballElement.style.transform = 'translate(-50%, -50%) rotate(0deg)';

        // Add to container
        this.container.appendChild(this.ballElement);

        // Create a fallback in case the texture doesn't load
        this.ballElement.style.backgroundColor = '#ffffff';
        this.ballElement.style.backgroundImage = "url('ball/texture.avif'), url('ball/text.jpg')";

        console.log('2D ball element created');
    }

    // Update ball position and rotation
    updatePosition(x, y, velocity) {
        if (!this.ballElement) return;

        // Convert to screen coordinates
        const screenX = x;
        const screenY = y;

        // Update position
        this.ballElement.style.left = screenX + 'px';
        this.ballElement.style.top = screenY + 'px';

        // Calculate movement vector
        const dx = screenX - this.lastPosition.x;
        const dy = screenY - this.lastPosition.y;
        const speed = Math.sqrt(dx * dx + dy * dy);

        // Calculate rotation based on movement
        if (this.isInitialized) {
            // Only rotate if there's significant movement
            if (speed > 0.1) {
                // Calculate rotation angle based on movement direction and speed
                const rotationDelta = speed * 2; // Adjust multiplier for rotation speed

                // Determine rotation direction based on movement
                // This creates a rolling effect in the direction of movement
                const rotationDirection = dx > 0 ? 1 : -1;

                // Update rotation
                this.rotation += rotationDelta * rotationDirection;

                // Apply visual effects based on powered up state
                if (this.isPoweredUp) {
                    // Add glow effect for powered up state
                    this.ballElement.style.boxShadow = '0 0 10px 5px rgba(255, 0, 0, 0.7)';
                    this.ballElement.style.transform = `translate(-50%, -50%) rotate(${this.rotation}deg) scale(1.1)`;
                } else {
                    this.ballElement.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.3)';
                    this.ballElement.style.transform = `translate(-50%, -50%) rotate(${this.rotation}deg)`;
                }

                // Add trail effect if moving fast enough
                if (speed > 1) {
                    this.addTrailElement(screenX, screenY, speed);
                }
            }
        } else {
            this.isInitialized = true;
        }

        // Store current position for next frame
        this.lastPosition.x = screenX;
        this.lastPosition.y = screenY;
    }

    // Add a trail element at the current position
    addTrailElement(x, y, speed) {
        // Create a new trail element
        const trail = document.createElement('div');
        trail.className = 'ball-trail-element';

        // Size based on ball size but slightly smaller
        const size = 25 - Math.min(10, this.trailElements.length);

        // Set styles
        trail.style.position = 'absolute';
        trail.style.width = size + 'px';
        trail.style.height = size + 'px';
        trail.style.borderRadius = '50%';
        trail.style.left = x + 'px';
        trail.style.top = y + 'px';
        trail.style.transform = 'translate(-50%, -50%)';
        trail.style.pointerEvents = 'none';

        // Set color based on powered up state
        if (this.isPoweredUp) {
            trail.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
            trail.style.boxShadow = '0 0 5px 2px rgba(255, 0, 0, 0.2)';
        } else {
            trail.style.backgroundColor = 'rgba(128, 128, 128, 0.3)';
        }

        // Add to container
        this.trailContainer.appendChild(trail);

        // Add to array
        this.trailElements.push({
            element: trail,
            createdAt: Date.now()
        });

        // Limit the number of trail elements
        this.cleanupTrailElements();
    }

    // Remove old trail elements
    cleanupTrailElements() {
        // Keep only the most recent elements
        while (this.trailElements.length > this.maxTrailElements) {
            const oldest = this.trailElements.shift();
            if (oldest && oldest.element) {
                oldest.element.remove();
            }
        }

        // Fade out remaining elements
        const now = Date.now();
        this.trailElements.forEach((item, index) => {
            const age = now - item.createdAt;
            const opacity = Math.max(0, 1 - (age / 500)); // Fade out over 500ms
            item.element.style.opacity = opacity;
        });
    }

    // Register a touch from a player
    registerTouch() {
        this.touchCount++;
        console.log(`Ball touched ${this.touchCount} times`);

        // Check if we should power up
        if (this.touchCount >= 8 && !this.isPoweredUp) {
            this.powerUp();
        }
    }

    // Power up the ball
    powerUp() {
        this.isPoweredUp = true;
        console.log('Ball powered up!');

        // Visual effect
        this.ballElement.classList.add('powered-up');

        // Increase trail length
        this.maxTrailElements = 15;

        // Double the speed
        this.currentSpeed = this.baseSpeed * 2;
        console.log(`Ball speed increased to ${this.currentSpeed}`);

        // Create power-up flash effect
        const flash = document.createElement('div');
        flash.className = 'power-up-flash';
        flash.style.position = 'absolute';
        flash.style.width = '60px';
        flash.style.height = '60px';
        flash.style.borderRadius = '50%';
        flash.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
        flash.style.left = this.lastPosition.x + 'px';
        flash.style.top = this.lastPosition.y + 'px';
        flash.style.transform = 'translate(-50%, -50%) scale(0.1)';
        flash.style.opacity = '1';
        flash.style.transition = 'all 0.5s ease-out';
        flash.style.zIndex = '95';
        this.container.appendChild(flash);

        // Animate flash
        setTimeout(() => {
            flash.style.transform = 'translate(-50%, -50%) scale(3)';
            flash.style.opacity = '0';
            setTimeout(() => flash.remove(), 500);
        }, 10);
    }

    // Reset power up state
    resetPowerUp() {
        this.isPoweredUp = false;
        this.touchCount = 0;
        this.maxTrailElements = 10;

        // Reset speed to base value
        this.currentSpeed = this.baseSpeed;
        console.log(`Ball speed reset to ${this.currentSpeed}`);

        if (this.ballElement) {
            this.ballElement.classList.remove('powered-up');
            this.ballElement.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.3)';
        }

        // Clear all trail elements
        this.trailElements.forEach(item => {
            if (item && item.element) {
                item.element.remove();
            }
        });
        this.trailElements = [];
    }

    // Animation loop
    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());
    }

    // Clean up resources
    dispose() {
        console.log('Disposing 2D ball');

        // Cancel animation loop
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        // Remove ball element from DOM
        if (this.ballElement && this.ballElement.parentNode) {
            this.ballElement.parentNode.removeChild(this.ballElement);
            this.ballElement = null;
        }

        // Clean up trail elements
        this.trailElements.forEach(item => {
            if (item && item.element) {
                item.element.remove();
            }
        });
        this.trailElements = [];

        // Remove trail container
        if (this.trailContainer && this.trailContainer.parentNode) {
            this.trailContainer.parentNode.removeChild(this.trailContainer);
            this.trailContainer = null;
        }

        // Remove any power-up flash elements
        const flashes = document.querySelectorAll('.power-up-flash');
        flashes.forEach(flash => flash.remove());
    }
}
