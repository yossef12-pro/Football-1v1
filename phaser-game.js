// Import Matter.js modules
const { Engine, Render, World, Bodies, Body, Events, Mouse, MouseConstraint, Composite, Vector, Runner } = Matter;

// Audio elements
let kickSound, goalSound, matchSound;
let audioInitialized = false;
let lastKickTime = 0; // Track the last time a kick sound was played

// Initialize audio elements
function initAudio() {
    if (audioInitialized) return;

    try {
        // Create audio elements with proper error handling
        kickSound = new Audio();
        goalSound = new Audio();
        matchSound = new Audio();

        // Set the source paths only when needed to prevent automatic downloads
        kickSound.src = 'audio/kick.mp3';
        goalSound.src = 'audio/Goal.mp3';
        matchSound.src = 'audio/Match Sound.mp3';

        // Set initial volume to 0 to avoid sudden sounds
        kickSound.volume = 0;
        goalSound.volume = 0;
        matchSound.volume = 0;

        // Configure match background music
        matchSound.loop = true;

        // Mark as initialized
        audioInitialized = true;

        // After a small delay, set proper volumes
        setTimeout(() => {
            if (kickSound && goalSound && matchSound) {
                kickSound.volume = 0.7;
                goalSound.volume = 0.8;
                matchSound.volume = 0.5;
            }
        }, 500);
    } catch(e) {
        console.error("Audio initialization error:", e);
    }
}

// Play audio with error handling
function playSound(audioElement, volume = 1.0) {
    if (!audioElement) return;

    try {
        // Make sure audio is initialized
        if (!audioInitialized) {
            initAudio();
        }

        // Set volume (capped to avoid loudness)
        audioElement.volume = Math.min(volume, 1.0);

        // Create a clone for overlapping sounds
        if (audioElement === kickSound || audioElement === goalSound) {
            // Clone the audio element for overlapping sounds
            const clonedAudio = new Audio(audioElement.src);
            clonedAudio.volume = audioElement.volume;

            // Play the cloned sound with error handling
            try {
                const playPromise = clonedAudio.play();

                // Handle promise to avoid uncaught errors
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        // Silently handle play errors
                        console.log("Audio play error:", error);
                    });
                }

                // Remove the cloned element after it finishes playing
                clonedAudio.onended = function() {
                    clonedAudio.src = ''; // Clear the source
                    clonedAudio.remove();
                };
            } catch (playError) {
                console.log("Play error:", playError);
            }
        } else {
            // For background music, just play normally
            // Only restart if not already playing
            if (audioElement.paused) {
                // Play with promise handling
                const playPromise = audioElement.play();

                // Handle promise to avoid uncaught errors
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        // Silently handle play errors
                        console.log("Audio play error:", error);
                    });
                }
            }
        }
    } catch (e) {
        console.log("Audio error:", e);
    }
}

// Stop audio with error handling
function stopSound(audioElement) {
    if (!audioElement) return;

    try {
        // Pause the audio element
        audioElement.pause();
        // Reset playback position
        audioElement.currentTime = 0;
    } catch (e) {
        console.log("Audio stop error:", e);
    }
}

// Game constants
const PLAYER_RADIUS = 30; // Increased player radius to match larger visuals
const BALL_RADIUS = 5;
const FIELD_WIDTH = 320;
const FIELD_HEIGHT = 420;
const GOAL_WIDTH = 120;
const GOAL_HEIGHT = 10;
const PLAYER_START_Y = FIELD_HEIGHT - 100;
const OPPONENT_START_Y = 100;
const WALL_THICKNESS = 3;
const PLAYER_MASS = 10;
const BALL_MASS = 0.2; // Lighter ball for more responsive movement
const PLAYER_FRICTION = 0.35;
const BALL_FRICTION = 0.005; // Reduced friction for smoother ball movement
const PLAYER_RESTITUTION = 0.3;
const BALL_RESTITUTION = 2.8; // Higher bounce
const AI_SPEED = 0.04; // Speed multiplier for AI movement
const BALL_DRAG_FACTOR = 0.998; // Reduced air resistance for better ball movement
const GOAL_TOP = GOAL_HEIGHT / 2; // Y-position of the top goal
const GOAL_BOTTOM = FIELD_HEIGHT - GOAL_HEIGHT / 2; // Y-position of the bottom goal

// Performance optimization settings
const PHYSICS_UPDATE_RATE = 1000 / 60; // Increased to 60fps for smoother physics
const EXTREME_PERFORMANCE_MODE = false; // Disable extreme optimizations for better physics
const MAX_VELOCITY = 30; // Increased max velocity for more dynamic gameplay

// Initialize the game
window.startPhaserGame = function() {
    // Create a game object to store all resources
    window.game = {
        engine: null,
        render: null,
        world: null,
        mouseConstraint: null,
        player1: null,
        player2: null,
        ball: null,
        ball2: null, // Add second ball
        ball2D: null,
        ball2_2D: null, // Add second 2D ball
        score: [0, 0],
        gameActive: true,
        aiUpdateInterval: null,
        lastBallPosition: null,
        lastBall2Position: null, // Add tracking for second ball
        gameTime: 60,
        timerInterval: null,
        ballsScored: [false, false] // Track which balls have been scored
    };

    // Initialize audio system
    initAudio();

    // Play match background music
    playSound(matchSound);

    // Start the game timer
    startGameTimer();

    // Initialize physics and game elements
    initPhysics();

    // Update scoreboard
    updateScoreUI();

    // Start AI for opponent
    startAI();

    // Add keyboard controls for boost hint removal
    addKeyboardControls();

    return window.game;
};

// Add one-time click handler to initialize audio on first user interaction
document.addEventListener('click', function initAudioOnFirstClick() {
    // Initialize audio
    initAudio();

    // Try to play a silent sound to unlock audio
    const silentSound = new Audio("data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMD///////////////////////////////////////////8AAAAeTEFNRTMuMTAwAQUAAAAAAAAAABQgJAUHQQAB9AAAASAAAcOBAAABAAAAAAAAAAAAAAAA");
    silentSound.volume = 0.001;
    silentSound.play().catch(e => {
        // Silently handle error
        console.log("Silent sound play failed:", e);
    });

    // Remove this listener after first click
    document.removeEventListener('click', initAudioOnFirstClick);
}, { once: true });

// Add keyboard controls
function addKeyboardControls() {
    document.addEventListener('keydown', function(event) {
        // Space bar - just hide the boost hint
        if (event.code === 'Space') {
            // Hide the boost hint when first used
            const boostHint = document.querySelector('.boost-hint');
            if (boostHint) {
                boostHint.style.animation = 'fadeOut 1s forwards';
                setTimeout(() => {
                    if (boostHint.parentNode) {
                        boostHint.parentNode.removeChild(boostHint);
                    }
                }, 1000);
            }
        }
    });

    // Hide boost hint after 10 seconds even if not used
    setTimeout(() => {
        const boostHint = document.querySelector('.boost-hint');
        if (boostHint) {
            boostHint.style.animation = 'fadeOut 2s forwards';
            setTimeout(() => {
                if (boostHint && boostHint.parentNode) {
                    boostHint.parentNode.removeChild(boostHint);
                }
            }, 2000);
        }
    }, 10000);
}

// Initialize physics engine and game elements
function initPhysics() {
    // Check if performance mode is enabled
    const performanceMode = localStorage.getItem('performanceMode') === 'true';

    // Create engine with settings based on performance mode
    window.game.engine = Engine.create({
        enableSleeping: false,
        constraintIterations: performanceMode ? 1 : 2,
        positionIterations: performanceMode ? 4 : 6,
        velocityIterations: performanceMode ? 3 : 4
    });

    // Set engine properties
    window.game.engine.timing.timeScale = performanceMode ? 1.2 : 0.9;

    window.game.world = window.game.engine.world;

    // Create renderer with optimized settings
    window.game.render = Render.create({
        element: document.getElementById('game-field'),
        engine: window.game.engine,
        options: {
            width: FIELD_WIDTH,
            height: FIELD_HEIGHT,
            wireframes: false,
            background: 'transparent', // Transparent background to show field image
            showSleeping: false,
            showDebug: false,
            showBounds: false,  // Hide body boundaries
            showCollisions: false,  // Hide collisions
            // Make physics lines invisible in performance mode, but keep screens visible
            wireframeBackground: performanceMode ? 'transparent' : false,
            opacity: performanceMode ? 0 : 1
        }
    });

    // Set gravity to zero (top-down game)
    window.game.engine.gravity.y = 0;

    // Create boundaries
    createBoundaries();

    // Create center barrier
    createCenterBarrier();

    // Create goals
    createGoals();

    // Create players
    createPlayers();

    // Create balls
    createBalls();

    // Add mouse control
    addMouseControl();

    // Enforce player boundaries
    enforcePlayerBoundaries();

    // Keep ball in bounds
    keepBallsInBounds();

    // Start the renderer
    Render.run(window.game.render);

    // Start the engine using Runner (instead of Engine.run)
    window.game.runner = Runner.create();
    Runner.run(window.game.runner, window.game.engine);

    // Set up collision event handling
    Events.on(window.game.engine, 'collisionStart', handleCollisions);

    // Update ball visuals on every frame
    Events.on(window.game.engine, 'afterUpdate', updateBallVisuals);

    // Create 2D textured balls
    const gameField = document.getElementById('game-field');

    // Dispose any existing 2D balls first
    Ball2D.disposeAll();

    // Create first 2D ball
    window.game.ball2D = Ball2D.createInstance(gameField, 'ball1');

    // Create second 2D ball
    window.game.ball2_2D = Ball2D.createInstance(gameField, 'ball2');

    // Hide the default ball overlays (they will be replaced by 2D balls)
    const ballOverlays = document.querySelectorAll('.ball-overlay');
    ballOverlays.forEach(overlay => {
        overlay.style.display = 'none';
    });

    // Remove top navigation buttons
    hideTopNavButtons();

    // Start AI for opponent
    startAI();

    // Start game timer
    startGameTimer();
}

// Create balls
function createBalls() {
    // Create first ball
    createBall();

    // Create second ball
    createSecondBall();

    // Initialize balls as not scored
    window.game.ballsScored = [false, false];
}

// Remove top navigation buttons from UI
function hideTopNavButtons() {
    // Find and remove any top navigation elements
    const scoreboard = document.querySelector('.scoreboard');
    if (scoreboard) {
        const navButtons = scoreboard.querySelectorAll('.nav-button');
        navButtons.forEach(button => button.remove());
    }
}

// Create field boundaries
function createBoundaries() {
    const wallOptions = {
        isStatic: true,
        restitution: 0.7,
        friction: 0.1,
        render: {
            fillStyle: '#ffffff',
            strokeStyle: '#ffffff',
            lineWidth: 2
        }
    };

    // Top wall (with gap for goal)
    const topLeftWall = Bodies.rectangle(
        WALL_THICKNESS / 2,
        FIELD_HEIGHT / 2,
        WALL_THICKNESS,
        FIELD_HEIGHT,
        wallOptions
    );

    const topRightWall = Bodies.rectangle(
        WALL_THICKNESS / 2,
        FIELD_HEIGHT / 2,
        WALL_THICKNESS,
        FIELD_HEIGHT,
        wallOptions
    );

    // Bottom wall (with gap for goal)
    const bottomLeftWall = Bodies.rectangle(
        WALL_THICKNESS / 2,
        FIELD_HEIGHT / 2,
        WALL_THICKNESS,
        FIELD_HEIGHT,
        wallOptions
    );

    const bottomRightWall = Bodies.rectangle(
        WALL_THICKNESS / 2,
        FIELD_HEIGHT / 2,
        WALL_THICKNESS,
        FIELD_HEIGHT,
        wallOptions
    );

    // Left wall
    const leftWall = Bodies.rectangle(
        WALL_THICKNESS / 2,
        FIELD_HEIGHT / 2,
        WALL_THICKNESS,
        FIELD_HEIGHT,
        wallOptions
    );

    // Right wall
    const rightWall = Bodies.rectangle(
        FIELD_WIDTH - WALL_THICKNESS / 2,
        FIELD_HEIGHT / 2,
        WALL_THICKNESS,
        FIELD_HEIGHT,
        wallOptions
    );

    // Add all walls to the world
    World.add(window.game.world, [
        topLeftWall, topRightWall,
        bottomLeftWall, bottomRightWall,
        leftWall, rightWall
    ]);

    // Add field lines (visual only)
    const fieldLines = Bodies.rectangle(
        FIELD_WIDTH / 2,
        FIELD_HEIGHT / 2,
        FIELD_WIDTH,
        2,
        {
            isStatic: true,
            isSensor: true,
            render: {
                fillStyle: '#ffffff',
                opacity: 0.5
            }
        }
    );

    // Add center circle (visual only)
    const centerCircle = Bodies.circle(
        FIELD_WIDTH / 2,
        FIELD_HEIGHT / 2,
        40,
        {
            isStatic: true,
            isSensor: true,
            render: {
                fillStyle: 'transparent',
                lineWidth: 2,
                strokeStyle: '#ffffff',
                opacity: 0.5
            }
        }
    );

    World.add(window.game.world, [fieldLines, centerCircle]);
}

// Create center barrier
function createCenterBarrier() {
    const centerBarrier = Bodies.rectangle(
        FIELD_WIDTH / 2,
        FIELD_HEIGHT / 2,
        FIELD_WIDTH,
        2,
        {
            isStatic: true,
            render: {
                visible: false
            },
            collisionFilter: {
                category: 0x0002,
                mask: 0x0001 // Only collide with players
            },
            label: 'center-barrier'
        }
    );

    // Add to the world
    World.add(window.game.world, centerBarrier);
}

// Create goals
function createGoals() {
    // Goal post thickness
    const postThickness = 2;

    // Goal net options
    const netOptions = {
        isStatic: true,
        isSensor: true,
        render: {
            fillStyle: 'rgba(255, 255, 255, 0.2)',
            strokeStyle: '#ffffff',
            lineWidth: 1
        }
    };

    // Top goal (opponent's goal)
    const topGoalSensor = Bodies.rectangle(
        FIELD_WIDTH / 2,
        GOAL_HEIGHT / 2,
        GOAL_WIDTH,
        GOAL_HEIGHT,
        {
            ...netOptions,
            label: 'topGoal',
            render: {
                fillStyle: 'rgba(255, 255, 255, 0.1)',
                strokeStyle: '#ffffff',
                lineWidth: 0.5
            }
        }
    );

    // Bottom goal (player's goal)
    const bottomGoalSensor = Bodies.rectangle(
        FIELD_WIDTH / 2,
        FIELD_HEIGHT - GOAL_HEIGHT / 2,
        GOAL_WIDTH,
        GOAL_HEIGHT,
        {
            ...netOptions,
            label: 'bottomGoal',
            render: {
                fillStyle: 'rgba(255, 255, 255, 0.1)',
                strokeStyle: '#ffffff',
                lineWidth: 0.5
            }
        }
    );

    // Goal posts (visual and physical)
    const goalPostOptions = {
        isStatic: true,
        restitution: 0.5,
        render: {
            fillStyle: '#ffffff'
        }
    };

    // Top goal posts
    const topLeftPost = Bodies.rectangle(
        FIELD_WIDTH / 2 - GOAL_WIDTH / 2,
        postThickness,
        postThickness,
        GOAL_HEIGHT * 2,
        goalPostOptions
    );

    const topRightPost = Bodies.rectangle(
        FIELD_WIDTH / 2 + GOAL_WIDTH / 2,
        postThickness,
        postThickness,
        GOAL_HEIGHT * 2,
        goalPostOptions
    );

    const topCrossbar = Bodies.rectangle(
        FIELD_WIDTH / 2,
        postThickness,
        GOAL_WIDTH,
        postThickness,
        goalPostOptions
    );

    // Bottom goal posts
    const bottomLeftPost = Bodies.rectangle(
        FIELD_WIDTH / 2 - GOAL_WIDTH / 2,
        FIELD_HEIGHT - postThickness,
        postThickness,
        GOAL_HEIGHT * 2,
        goalPostOptions
    );

    const bottomRightPost = Bodies.rectangle(
        FIELD_WIDTH / 2 + GOAL_WIDTH / 2,
        FIELD_HEIGHT - postThickness,
        postThickness,
        GOAL_HEIGHT * 2,
        goalPostOptions
    );

    const bottomCrossbar = Bodies.rectangle(
        FIELD_WIDTH / 2,
        FIELD_HEIGHT - postThickness,
        GOAL_WIDTH,
        postThickness,
        goalPostOptions
    );

    // Add goals to the world
    World.add(window.game.world, [
        topGoalSensor, bottomGoalSensor,
        topLeftPost, topRightPost, topCrossbar,
        bottomLeftPost, bottomRightPost, bottomCrossbar
    ]);
}

// Create ball
function createBall() {
    // Visual size for the ball (smaller than hitbox)
    const visualRadius = 10;

    // Create a soccer ball with physics
    window.game.ball = Bodies.circle(
        FIELD_WIDTH / 2 - 30, // Offset to the left
        FIELD_HEIGHT / 2,
        BALL_RADIUS,
        {
            mass: BALL_MASS,
            frictionAir: BALL_FRICTION,
            restitution: BALL_RESTITUTION,
            collisionFilter: {
                category: 0x0004,
                mask: 0xFFFF
            },
            render: {
                fillStyle: 'transparent',  // Transparent fill
                lineWidth: 0,  // No outline
                strokeStyle: 'transparent'  // Transparent stroke
            },
            label: 'ball'
        }
    );

    // Add ball to the world
    World.add(window.game.world, window.game.ball);

    // Clear any existing visual elements
    document.querySelectorAll('.ball-overlay, .ball-shadow, .ball-trail').forEach(el => el.remove());

    // Store initial ball position
    window.game.lastBallPosition = { ...window.game.ball.position };

    // Give the ball an initial velocity in a random direction
    const randomAngle = Math.random() * Math.PI * 2;
    const initialSpeed = 5; // Base speed

    Body.setVelocity(window.game.ball, {
        x: Math.cos(randomAngle) * initialSpeed,
        y: Math.sin(randomAngle) * initialSpeed
    });
}

// Create second ball
function createSecondBall() {
    // Visual size for the ball (smaller than hitbox)
    const visualRadius = 10;

    // Create a second soccer ball with physics
    window.game.ball2 = Bodies.circle(
        FIELD_WIDTH / 2 + 30, // Offset to the right
        FIELD_HEIGHT / 2,
        BALL_RADIUS,
        {
            mass: BALL_MASS,
            frictionAir: BALL_FRICTION,
            restitution: BALL_RESTITUTION,
            collisionFilter: {
                category: 0x0004,
                mask: 0xFFFF
            },
            render: {
                fillStyle: 'transparent',  // Transparent fill
                lineWidth: 0,  // No outline
                strokeStyle: 'transparent'  // Transparent stroke
            },
            label: 'ball2'
        }
    );

    // Add ball to the world
    World.add(window.game.world, window.game.ball2);

    // Store initial ball position
    window.game.lastBall2Position = { ...window.game.ball2.position };

    // Give the ball an initial velocity in a random direction (different from first ball)
    const randomAngle = Math.random() * Math.PI * 2;
    const initialSpeed = 5; // Base speed

    Body.setVelocity(window.game.ball2, {
        x: Math.cos(randomAngle) * initialSpeed,
        y: Math.sin(randomAngle) * initialSpeed
    });
}

// Create players
function createPlayers() {
    const playerFlag = window.selectedPlayerFlag || 'argentina';
    const opponentFlag = window.selectedOpponentFlag || 'brazil-';

    // Player 1 (bottom) - positioned slightly to the left
    window.game.player1 = Bodies.circle(
        FIELD_WIDTH / 2 - 50, // Offset to the left
        PLAYER_START_Y,
        PLAYER_RADIUS,
        {
            mass: PLAYER_MASS,
            frictionAir: PLAYER_FRICTION,
            restitution: PLAYER_RESTITUTION,
            collisionFilter: {
                category: 0x0001,
                mask: 0xFFFF
            },
            render: {
                visible: false, // Hide in Matter.js renderer
                lineWidth: 0,
                strokeStyle: 'transparent'
            },
            label: 'player'
        }
    );

    // Player 2 (top) - opponent, positioned slightly to the right
    window.game.player2 = Bodies.circle(
        FIELD_WIDTH / 2 + 50, // Offset to the right
        OPPONENT_START_Y,
        PLAYER_RADIUS,
        {
            mass: PLAYER_MASS,
            frictionAir: PLAYER_FRICTION,
            restitution: PLAYER_RESTITUTION,
        collisionFilter: {
                category: 0x0001,
                mask: 0xFFFF
            },
            render: {
                visible: false, // Hide in Matter.js renderer
                lineWidth: 0,
                strokeStyle: 'transparent'
            },
            label: 'opponent'
        }
    );

    // Add players to the world
    World.add(window.game.world, [window.game.player1, window.game.player2]);

    // Clear any existing player elements
    document.querySelectorAll('.player').forEach(el => el.remove());

    // Format flag names to get proper player image filenames
    let player1ImageName = formatPlayerImageName(playerFlag);
    let player2ImageName = formatPlayerImageName(opponentFlag);

    // Create visual player elements
    const player1Element = document.createElement('div');
    player1Element.className = 'player player1';
    player1Element.style.backgroundImage = `url('player-team/${player1ImageName}-player.png')`;
    document.getElementById('game-field').appendChild(player1Element);

    const player2Element = document.createElement('div');
    player2Element.className = 'player player2';
    player2Element.style.backgroundImage = `url('player-team/${player2ImageName}-player.png')`;
    document.getElementById('game-field').appendChild(player2Element);

    // Initialize player visuals
    updatePlayerVisuals();
}

// Format flag name to get the correct player image filename
function formatPlayerImageName(flagName) {
    // Remove trailing dash if present (e.g., "brazil-" -> "brazil")
    let name = flagName.replace(/-$/, '');

    // Handle special cases based on the actual filenames in the player-team folder
    if (name === 'united-kingdom') return 'united-kingdom';
    if (name === 'SaudiArabia') return 'saudiArabia';
    if (name === 'japan') return 'japan'; // Added Japan
    if (name === 'argentina') return 'argantina'; // Note the typo in the filename
    if (name === 'portugal') return 'portgul'; // Note the typo in the filename

    // List of available player images (based on the folder contents)
    const availableImages = [
        'argantina', 'belgium', 'brazil', 'china', 'egypt', 'england',
        'france', 'germany', 'italy', 'japan', 'poland', 'portgul', 'qatar',
        'saudiArabia', 'spain', 'united-kingdom'
    ];

    // Check if the player image exists, if not use a default
    if (!availableImages.includes(name)) {
        console.log(`Player image for "${name}" not found, using default`);
        return 'spain'; // Use Spain as default player image
    }

    return name;
}

// Update player visual elements
function updatePlayerVisuals() {
    if (!window.game.player1 || !window.game.player2) return;

    // Update player 1 position (mirrored)
    const player1Element = document.querySelector('.player1');
    if (player1Element) {
        player1Element.style.left = `${window.game.player1.position.x}px`;
        player1Element.style.top = `${window.game.player1.position.y}px`;
    }

    // Update player 2 position (not mirrored)
    const player2Element = document.querySelector('.player2');
    if (player2Element) {
        player2Element.style.left = `${window.game.player2.position.x}px`;
        player2Element.style.top = `${window.game.player2.position.y}px`;
    }
}

// Add mouse control for player 1 only
function addMouseControl() {
    // Add mouse control
    const mouse = Mouse.create(window.game.render.canvas);

    // Create a constraint with very low stiffness for smoother movement
    window.game.mouseConstraint = MouseConstraint.create(window.game.engine, {
        mouse: mouse,
        constraint: {
            stiffness: 0.03,  // Very low stiffness for smooth movement
            damping: 0.5,     // High damping to prevent oscillation
            render: {
                visible: false
            }
        }
    });

    // Only allow player 1 to be dragged
    Events.on(window.game.mouseConstraint, 'startdrag', function(event) {
        if (event.body !== window.game.player1) {
            // If not dragging player1, cancel the drag
            window.game.mouseConstraint.constraint.bodyB = null;
        }
    });

    // Add additional control during drag to keep movement smooth
    Events.on(window.game.engine, 'afterUpdate', function() {
        if (window.game.mouseConstraint.body === window.game.player1) {
            // Get current player velocity
            const velocity = window.game.player1.velocity;
            const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);

            // Cap maximum speed
            const maxSpeed = 4;
            if (speed > maxSpeed) {
                const scale = maxSpeed / speed;
                Body.setVelocity(window.game.player1, {
                    x: velocity.x * scale,
                    y: velocity.y * scale
                });
            }

            // Apply additional damping for smoother stops
            Body.setVelocity(window.game.player1, {
                x: window.game.player1.velocity.x * 0.92,
                y: window.game.player1.velocity.y * 0.92
            });
        }
    });

    // Add mouse constraint to the world
    World.add(window.game.world, window.game.mouseConstraint);

    // Keep the mouse in sync with rendering
    window.game.render.mouse = mouse;
}

// Create visual impact effect at collision point
function createImpactEffect(x, y, isPoweredUp) {
    // Check if performance mode is enabled
    const performanceMode = localStorage.getItem('performanceMode') === 'true';

    // Skip creating visual effects in performance mode
    if (performanceMode) return;

    const impactEffect = document.createElement('div');
    impactEffect.className = isPoweredUp ? 'impact-effect powered-up' : 'impact-effect';
    impactEffect.style.left = x + 'px';
    impactEffect.style.top = y + 'px';
    document.getElementById('game-field').appendChild(impactEffect);

    // Remove the effect after animation completes
    setTimeout(() => {
        if (impactEffect.parentNode) {
            impactEffect.parentNode.removeChild(impactEffect);
        }
    }, 300);
}

// Handle collisions between game objects
function handleCollisions(event) {
    const pairs = event.pairs;

    for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i];

        // Check for balls entering goals
        // First ball - top goal
        if ((pair.bodyA.label === 'ball' && pair.bodyB.label === 'topGoal') ||
            (pair.bodyB.label === 'ball' && pair.bodyA.label === 'topGoal')) {

            // Only process if this ball hasn't been scored yet
            if (!window.game.ballsScored[0]) {
                // Mark first ball as scored
                window.game.ballsScored[0] = true;

                // Play goal sound immediately
                playSound(goalSound, 1.0);

                // Player scores
                window.game.score[0]++;
                updateScoreUI();

                // Add goal celebration effect
                addGoalEffect(true);

                // Check if both balls have been scored
                if (window.game.ballsScored[0] && window.game.ballsScored[1]) {
                    // Start countdown before reset
                    startResetCountdown();
                } else {
                    // Delete this ball completely
                    deleteBall(window.game.ball);
                    window.game.ball = null;
                }
            }
        }
        // First ball - bottom goal
        else if ((pair.bodyA.label === 'ball' && pair.bodyB.label === 'bottomGoal') ||
                 (pair.bodyB.label === 'ball' && pair.bodyA.label === 'bottomGoal')) {

            // Only process if this ball hasn't been scored yet
            if (!window.game.ballsScored[0]) {
                // Mark first ball as scored
                window.game.ballsScored[0] = true;

                // Play goal sound immediately
                playSound(goalSound, 1.0);

                // Opponent scores
                window.game.score[1]++;
                updateScoreUI();

                // Add goal celebration effect
                addGoalEffect(false);

                // Check if both balls have been scored
                if (window.game.ballsScored[0] && window.game.ballsScored[1]) {
                    // Start countdown before reset
                    startResetCountdown();
                } else {
                    // Delete this ball completely
                    deleteBall(window.game.ball);
                    window.game.ball = null;
                }
            }
        }
        // Second ball - top goal
        else if ((pair.bodyA.label === 'ball2' && pair.bodyB.label === 'topGoal') ||
                 (pair.bodyB.label === 'ball2' && pair.bodyA.label === 'topGoal')) {

            // Only process if this ball hasn't been scored yet
            if (!window.game.ballsScored[1]) {
                // Mark second ball as scored
                window.game.ballsScored[1] = true;

                // Play goal sound immediately
                playSound(goalSound, 1.0);

                // Player scores
                window.game.score[0]++;
                updateScoreUI();

                // Add goal celebration effect
                addGoalEffect(true);

                // Check if both balls have been scored
                if (window.game.ballsScored[0] && window.game.ballsScored[1]) {
                    // Start countdown before reset
                    startResetCountdown();
                } else {
                    // Delete this ball completely
                    deleteBall(window.game.ball2);
                    window.game.ball2 = null;
                }
            }
        }
        // Second ball - bottom goal
        else if ((pair.bodyA.label === 'ball2' && pair.bodyB.label === 'bottomGoal') ||
                 (pair.bodyB.label === 'ball2' && pair.bodyA.label === 'bottomGoal')) {

            // Only process if this ball hasn't been scored yet
            if (!window.game.ballsScored[1]) {
                // Mark second ball as scored
                window.game.ballsScored[1] = true;

                // Play goal sound immediately
                playSound(goalSound, 1.0);

                // Opponent scores
                window.game.score[1]++;
                updateScoreUI();

                // Add goal celebration effect
                addGoalEffect(false);

                // Check if both balls have been scored
                if (window.game.ballsScored[0] && window.game.ballsScored[1]) {
                    // Start countdown before reset
                    startResetCountdown();
                } else {
                    // Delete this ball completely
                    deleteBall(window.game.ball2);
                    window.game.ball2 = null;
                }
            }
        }

        // Ball collision with players - handle both balls
        const isBallCollision =
            (pair.bodyA.label === 'ball' || pair.bodyA.label === 'ball2') &&
            (pair.bodyB.label === 'player' || pair.bodyB.label === 'opponent') ||
            (pair.bodyB.label === 'ball' || pair.bodyB.label === 'ball2') &&
            (pair.bodyA.label === 'player' || pair.bodyA.label === 'opponent');

        if (isBallCollision) {
            // Get references to the ball and player
            const ballBody = (pair.bodyA.label === 'ball' || pair.bodyA.label === 'ball2') ? pair.bodyA : pair.bodyB;
            const playerBody = (pair.bodyA.label === 'ball' || pair.bodyA.label === 'ball2') ? pair.bodyB : pair.bodyA;

            // Calculate collision vector (direction from player to ball)
            const collisionVector = {
                x: ballBody.position.x - playerBody.position.x,
                y: ballBody.position.y - playerBody.position.y
            };

            // Normalize the vector (direction of kick)
            const magnitude = Math.sqrt(collisionVector.x ** 2 + collisionVector.y ** 2);
            const normalized = {
                x: collisionVector.x / magnitude,
                y: collisionVector.y / magnitude
            };

            // Determine the player's speed
            const playerVelocity = playerBody.velocity;
            const playerSpeed = Math.sqrt(playerVelocity.x ** 2 + playerVelocity.y ** 2);

            // Register touch with the appropriate 2D ball
            const ball2D = ballBody.label === 'ball2' ? window.game.ball2_2D : window.game.ball2D;
            if (ball2D) {
                ball2D.registerTouch();
            }

            // Calculate the ball's new velocity using player speed and direction
            const baseKickStrength = 5; // Minimum kick strength
            const maxKickStrength = 25; // Maximum kick strength

            // Adjust kick strength based on power-up state
            let kickStrength = Math.min(baseKickStrength + playerSpeed * 1.5, maxKickStrength);

            // Apply power-up effects if active
            if (ball2D && ball2D.isPoweredUp) {
                // Increase kick strength for powered-up ball
                kickStrength *= 1.5;

                // Temporarily increase restitution (bounciness)
                ballBody.restitution = BALL_RESTITUTION * 1.3;

                // Reset restitution after a short delay
                setTimeout(() => {
                    if (window.game && ballBody) {
                        ballBody.restitution = BALL_RESTITUTION;
                    }
                }, 2000);
            }

            // Change ball direction based on kick, but maintain constant speed
            if (ball2D) {
                // Get the target speed from the 2D ball object
                const targetSpeed = ball2D.currentSpeed;

                // Set ball velocity with the new direction but constant speed
                Body.setVelocity(ballBody, {
                    x: normalized.x * targetSpeed,
                    y: normalized.y * targetSpeed
                });
            } else {
                // Fallback to original behavior if 2D ball not available
                Body.setVelocity(ballBody, {
                    x: normalized.x * kickStrength,
                    y: normalized.y * kickStrength
                });
            }

            // No angular velocity - ball doesn't rotate
            Body.setAngularVelocity(ballBody, 0);

            // Play kick sound effect
            playKickSound(kickStrength);

            // Add bounce animation to appropriate ball
            const ballSelector = ballBody.label === 'ball2' ? '.ball2-overlay' : '.ball-overlay';
            const ballOverlay = document.querySelector(ballSelector);
            if (ballOverlay) {
                ballOverlay.classList.add('ball-bounce');
                setTimeout(() => {
                    ballOverlay.classList.remove('ball-bounce');
                }, 200);
            }

            // Use the new createImpactEffect function
            const collisionPoint = pair.collision.supports[0] || { x: ballBody.position.x, y: ballBody.position.y };
            createImpactEffect(collisionPoint.x, collisionPoint.y, ball2D && ball2D.isPoweredUp);
        }
    }
}

// Delete a ball completely after it is scored
function deleteBall(ball) {
    if (!ball) return;

    // Remove ball from physics world
    World.remove(window.game.world, ball);

    // Remove visual elements and dispose 2D ball
    if (ball.label === 'ball') {
        // Remove traditional ball overlays
        const ballElements = document.querySelectorAll('.ball-overlay:not(.ball2-overlay), .ball-shadow:not(.ball2-shadow), .ball-trail:not(.ball2-trail)');
        ballElements.forEach(el => el.remove());

        // Dispose the 2D ball and remove its elements
        if (window.game.ball2D) {
            // Remove the 2D ball element from DOM
            if (window.game.ball2D.ballElement && window.game.ball2D.ballElement.parentNode) {
                window.game.ball2D.ballElement.parentNode.removeChild(window.game.ball2D.ballElement);
            }

            // Remove the trail container from DOM
            if (window.game.ball2D.trailContainer && window.game.ball2D.trailContainer.parentNode) {
                window.game.ball2D.trailContainer.parentNode.removeChild(window.game.ball2D.trailContainer);
            }

            // Dispose the 2D ball instance
            window.game.ball2D.dispose();
            window.game.ball2D = null;
        }
    } else if (ball.label === 'ball2') {
        // Remove traditional ball overlays
        const ball2Elements = document.querySelectorAll('.ball2-overlay, .ball2-shadow, .ball2-trail');
        ball2Elements.forEach(el => el.remove());

        // Dispose the 2D ball and remove its elements
        if (window.game.ball2_2D) {
            // Remove the 2D ball element from DOM
            if (window.game.ball2_2D.ballElement && window.game.ball2_2D.ballElement.parentNode) {
                window.game.ball2_2D.ballElement.parentNode.removeChild(window.game.ball2_2D.ballElement);
            }

            // Remove the trail container from DOM
            if (window.game.ball2_2D.trailContainer && window.game.ball2_2D.trailContainer.parentNode) {
                window.game.ball2_2D.trailContainer.parentNode.removeChild(window.game.ball2_2D.trailContainer);
            }

            // Dispose the 2D ball instance
            window.game.ball2_2D.dispose();
            window.game.ball2_2D = null;
        }
    }
}

// Start countdown before resetting balls
function startResetCountdown() {
    // Pause the game during countdown
    window.game.gameActive = false;

    // Immediately hide both balls and stop their movement
    if (window.game.ball) {
        // Stop ball movement
        Body.setVelocity(window.game.ball, { x: 0, y: 0 });
        Body.setAngularVelocity(window.game.ball, 0);

        // Hide all visual elements for first ball
        const ballElements = document.querySelectorAll('.ball-overlay:not(.ball2-overlay), .ball-shadow:not(.ball2-shadow), .ball-trail:not(.ball2-trail)');
        ballElements.forEach(el => {
            el.style.opacity = '0';
            el.style.visibility = 'hidden';
        });

        // Hide 2D ball elements
        if (window.game.ball2D) {
            if (window.game.ball2D.ballElement) {
                window.game.ball2D.ballElement.style.opacity = '0';
                window.game.ball2D.ballElement.style.visibility = 'hidden';
            }
            if (window.game.ball2D.trailContainer) {
                window.game.ball2D.trailContainer.style.opacity = '0';
                window.game.ball2D.trailContainer.style.visibility = 'hidden';
            }
        }
    }

    if (window.game.ball2) {
        // Stop ball movement
        Body.setVelocity(window.game.ball2, { x: 0, y: 0 });
        Body.setAngularVelocity(window.game.ball2, 0);

        // Hide all visual elements for second ball
        const ball2Elements = document.querySelectorAll('.ball2-overlay, .ball2-shadow, .ball2-trail');
        ball2Elements.forEach(el => {
            el.style.opacity = '0';
            el.style.visibility = 'hidden';
        });

        // Hide 2D ball elements
        if (window.game.ball2_2D) {
            if (window.game.ball2_2D.ballElement) {
                window.game.ball2_2D.ballElement.style.opacity = '0';
                window.game.ball2_2D.ballElement.style.visibility = 'hidden';
            }
            if (window.game.ball2_2D.trailContainer) {
                window.game.ball2_2D.trailContainer.style.opacity = '0';
                window.game.ball2_2D.trailContainer.style.visibility = 'hidden';
            }
        }
    }

    let countdown = 3;

    // Create countdown display element
    const countdownElement = document.createElement('div');
    countdownElement.className = 'countdown-display';
    countdownElement.style.position = 'absolute';
    countdownElement.style.top = '165px';
    countdownElement.style.left = '50%';
    countdownElement.style.transform = 'translateX(-50%)';
    countdownElement.style.fontSize = '42px';
    countdownElement.style.fontWeight = '800';
    countdownElement.style.fontFamily = 'Arial, sans-serif';
    countdownElement.style.color = '#ffffff';
    countdownElement.style.textShadow = '0 0 20px rgba(0, 0, 0, 0.8), 0 2px 4px rgba(0, 0, 0, 0.6)';
    countdownElement.style.background = 'linear-gradient(135deg, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0.5) 100%)';
    countdownElement.style.border = '1px solid rgba(255, 255, 255, 0.3)';
    countdownElement.style.borderRadius = '50px';
    countdownElement.style.width = '80px';
    countdownElement.style.height = '80px';
    countdownElement.style.display = 'flex';
    countdownElement.style.alignItems = 'center';
    countdownElement.style.justifyContent = 'center';
    countdownElement.style.backdropFilter = 'blur(8px)';
    countdownElement.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
    countdownElement.style.zIndex = '200';
    countdownElement.style.animation = 'countdownPulse 1s ease-in-out';
    countdownElement.textContent = countdown;

    document.getElementById('game-field').appendChild(countdownElement);

    // Countdown interval
    const countdownInterval = setInterval(() => {
        countdown--;

        if (countdown > 0) {
            countdownElement.textContent = countdown;
            // Reset animation
            countdownElement.style.animation = 'none';
            setTimeout(() => {
                countdownElement.style.animation = 'countdownPulse 1s ease-in-out';
            }, 10);
        } else {
            // Show "GO!" with enhanced styling
            countdownElement.textContent = 'GO!';
            countdownElement.style.color = '#00ff00';
            countdownElement.style.fontSize = '45px';
            countdownElement.style.textShadow = '0 0 40px rgba(0, 255, 0, 0.8), 0 0 80px rgba(0, 255, 0, 0.4), 0 4px 8px rgba(0, 0, 0, 0.7)';
            countdownElement.style.border = '2px solid rgba(0, 255, 0, 0.6)';
            countdownElement.style.background = 'linear-gradient(135deg, rgba(0, 255, 0, 0.15) 0%, rgba(0, 255, 0, 0.08) 50%, rgba(0, 255, 0, 0.05) 100%)';
            countdownElement.style.boxShadow = '0 8px 32px rgba(0, 255, 0, 0.3), inset 0 1px 0 rgba(0, 255, 0, 0.2)';
            countdownElement.style.animation = 'countdownPulse 0.5s ease-in-out';

            // Clear interval and reset after short delay
            clearInterval(countdownInterval);

            setTimeout(() => {
                // Remove countdown element
                if (countdownElement.parentNode) {
                    countdownElement.parentNode.removeChild(countdownElement);
                }

                // Reset balls and resume game
                resetBalls();
                window.game.gameActive = true;
            }, 500);
        }
    }, 1000);
}

// Reset both balls after both have been scored
function resetBalls() {
    // Reset ball scoring state
    window.game.ballsScored = [false, false];
    
    // Ensure gameActive is true when resetting balls
    window.game.gameActive = true;

    // Clean up existing 2D balls first
    if (window.game.ball2D) {
        // Remove the 2D ball element from DOM
        if (window.game.ball2D.ballElement && window.game.ball2D.ballElement.parentNode) {
            window.game.ball2D.ballElement.parentNode.removeChild(window.game.ball2D.ballElement);
        }

        // Remove the trail container from DOM
        if (window.game.ball2D.trailContainer && window.game.ball2D.trailContainer.parentNode) {
            window.game.ball2D.trailContainer.parentNode.removeChild(window.game.ball2D.trailContainer);
        }

        // Dispose the 2D ball instance
        window.game.ball2D.dispose();
        window.game.ball2D = null;
    }

    if (window.game.ball2_2D) {
        // Remove the 2D ball element from DOM
        if (window.game.ball2_2D.ballElement && window.game.ball2_2D.ballElement.parentNode) {
            window.game.ball2_2D.ballElement.parentNode.removeChild(window.game.ball2_2D.ballElement);
        }

        // Remove the trail container from DOM
        if (window.game.ball2_2D.trailContainer && window.game.ball2_2D.trailContainer.parentNode) {
            window.game.ball2_2D.trailContainer.parentNode.removeChild(window.game.ball2_2D.trailContainer);
        }

        // Dispose the 2D ball instance
        window.game.ball2_2D.dispose();
        window.game.ball2_2D = null;
    }

    // Recreate both balls
    createBalls();

    // Recreate 2D ball instances
    const gameField = document.getElementById('game-field');

    // Create first 2D ball
    window.game.ball2D = Ball2D.createInstance(gameField, 'ball1');

    // Create second 2D ball
    window.game.ball2_2D = Ball2D.createInstance(gameField, 'ball2');

    // Reset player positions
    Body.setPosition(window.game.player1, {
        x: FIELD_WIDTH / 2 - 50, // Offset to the left
        y: PLAYER_START_Y
    });

    Body.setPosition(window.game.player2, {
        x: FIELD_WIDTH / 2 + 50, // Offset to the right
        y: OPPONENT_START_Y
    });

    // Stop the players but keep the game active
    Body.setVelocity(window.game.player1, { x: 0, y: 0 });
    Body.setVelocity(window.game.player2, { x: 0, y: 0 });
    
    // Make sure AI state is reset
    if (window.game.aiState) {
        window.game.aiState = {
            lastUpdate: 0
        };
    }
    
    // Restart AI if it was stopped
    if (!window.game.aiUpdateInterval) {
        startAI();
    }
}

// Reset a single ball position and velocity
function resetBall(ball, overlaySelector, shadowSelector, trailSelector, xOffset) {
    if (!ball) return;

    // Reset ball to center with offset
    Body.setPosition(ball, {
        x: FIELD_WIDTH / 2 + xOffset,
        y: FIELD_HEIGHT / 2
    });

    // Stop the ball
    Body.setVelocity(ball, { x: 0, y: 0 });
    Body.setAngularVelocity(ball, 0);

    // Show the ball visual elements
    const visualElements = document.querySelectorAll(`${overlaySelector}, ${shadowSelector}, ${trailSelector}`);
    visualElements.forEach(el => {
        el.style.opacity = '1';
        el.style.visibility = 'visible';
    });

    // Reset ball power-up state if applicable and show the 2D ball
    const ball2D = ball.label === 'ball2' ? window.game.ball2_2D : window.game.ball2D;
    if (ball2D) {
        if (ball2D.isPoweredUp) {
            ball2D.resetPowerUp();
        }

        // Show the 2D ball element and trail
        if (ball2D.ballElement) {
            ball2D.ballElement.style.opacity = '1';
            ball2D.ballElement.style.visibility = 'visible';
        }
        // Show trail container
        if (ball2D.trailContainer) {
            ball2D.trailContainer.style.opacity = '1';
            ball2D.trailContainer.style.visibility = 'visible';
        }
    }

    // After a short delay, give the ball a gentle kick in a random direction
    setTimeout(() => {
        if (!window.game || !ball) return; // Safety check

        const randomAngle = Math.random() * Math.PI * 2;
        const kickStrength = 2; // Gentle initial kick

        Body.setVelocity(ball, {
            x: Math.cos(randomAngle) * kickStrength,
            y: Math.sin(randomAngle) * kickStrength
        });
    }, 1000);
}

// Play kick sound with volume based on strength
function playKickSound(strength) {
    // Check if enough time has passed since last kick sound
    const now = Date.now();
    const timeSinceLastKick = now - lastKickTime;

    // Always play sound regardless of timing to ensure responsive audio feedback
    // Calculate volume based on kick strength (between 0.3 and 1.0)
    const volume = Math.min(1.0, Math.max(0.3, strength / 25));

    // Play the kick sound
    playSound(kickSound, volume);

    // Update last kick time
    lastKickTime = now;
}

// Add goal celebration effect
function addGoalEffect(isPlayerGoal) {
    // Check if performance mode is enabled
    const performanceMode = localStorage.getItem('performanceMode') === 'true';

    // In performance mode, only show minimal effects
    if (performanceMode) {
        // Create simple goal text
        const goalText = document.createElement('div');
        goalText.textContent = 'GOAL!';
        goalText.style.position = 'absolute';
        goalText.style.top = '50%';
        goalText.style.left = '50%';
        goalText.style.transform = 'translate(-50%, -50%)';
        goalText.style.color = '#fff';
        goalText.style.fontSize = '32px';
        goalText.style.fontWeight = 'bold';
        goalText.style.textShadow = '0 0 10px rgba(0, 0, 0, 0.7)';
        goalText.style.zIndex = '101';
        goalText.style.animation = 'goalText 1.5s forwards';
        document.getElementById('game-field').appendChild(goalText);

        // Remove after animation
        setTimeout(() => {
            if (goalText.parentNode) {
                goalText.parentNode.removeChild(goalText);
            }
        }, 1500);

        return;
    }

    // Note: We've moved the sound playing to the collision detection
    // to eliminate any delay between the goal being scored and the sound playing

    // Create goal flash effect
    const goalFlash = document.createElement('div');
    goalFlash.className = 'goal-flash';
    goalFlash.style.position = 'absolute';
    goalFlash.style.top = isPlayerGoal ? '0' : (FIELD_HEIGHT - GOAL_HEIGHT) + 'px';
    goalFlash.style.left = (FIELD_WIDTH / 2 - GOAL_WIDTH / 2) + 'px';
    goalFlash.style.width = GOAL_WIDTH + 'px';
    goalFlash.style.height = GOAL_HEIGHT + 'px';
    goalFlash.style.background = 'rgba(255, 255, 255, 0.8)';
    goalFlash.style.boxShadow = '0 0 20px rgba(255, 255, 255, 0.8)';
    goalFlash.style.zIndex = '100';
    goalFlash.style.animation = 'goalFlash 1s forwards';

    document.getElementById('game-field').appendChild(goalFlash);

    // Remove after animation
    setTimeout(() => {
        if (goalFlash.parentNode) {
            goalFlash.parentNode.removeChild(goalFlash);
        }
    }, 1000);

    // Create goal text
    const goalText = document.createElement('div');
    goalText.className = 'goal-text';
    goalText.textContent = 'GOAL!';
    goalText.style.position = 'absolute';
    goalText.style.top = '20%';
    goalText.style.left = '50%';
    goalText.style.transform = 'translate(-50%, -50%)';
    goalText.style.color = '#fff';
    goalText.style.fontSize = '32px';
    goalText.style.fontWeight = 'bold';
    goalText.style.textShadow = '0 0 10px rgba(0, 0, 0, 0.7)';
    goalText.style.zIndex = '101';
    goalText.style.animation = 'goalText 1.5s forwards';

    document.getElementById('game-field').appendChild(goalText);

    // Remove after animation
    setTimeout(() => {
        if (goalText.parentNode) {
            goalText.parentNode.removeChild(goalText);
        }
    }, 1500);

    // Trigger crowd camera flashes
    triggerCrowdWave();
}

// Update score UI
function updateScoreUI() {
    document.getElementById('player1-score').textContent = window.game.score[0];
    document.getElementById('player2-score').textContent = window.game.score[1];
}

// Start AI for opponent
function startAI() {
    // Clear any existing interval
    if (window.game.aiUpdateInterval) {
        clearInterval(window.game.aiUpdateInterval);
    }

    // Set a faster update frequency for more responsive AI
    const updateFrequency = 16; // ~60fps for smoother movement

    // Make updateAI function globally available
    window.updateAI = updateAI;

    // Start AI update interval
    window.game.aiUpdateInterval = setInterval(updateAI, updateFrequency);
}

document.addEventListener('DOMContentLoaded', startAI);

// Update AI movement
function updateAI() {
    try {
        // Check if required objects exist and game is active
        if (!window.game || !window.game.player2 || !window.game.gameActive) {
            return;
        }

        const ai = window.game.player2;
        const balls = [];
        
        // Check if balls exist and are in play
        if (window.game.ball && window.game.ball.position) {
            balls.push(window.game.ball);
        }
        if (window.game.ball2 && window.game.ball2.position) {
            balls.push(window.game.ball2);
        }
        
        // Filter balls that are in AI's field (top half)
        const ballsInAIField = balls.filter(ball => ball.position.y < FIELD_HEIGHT / 2);
        
        // If no balls in AI field, move randomly in the center
        if (ballsInAIField.length === 0) {
            // Initialize AI state if it doesn't exist
            window.game.aiState = window.game.aiState || {
                lastRandomMove: 0,
                randomTarget: { x: 0, y: 0 }
            };
            
            const now = Date.now();
            const aiState = window.game.aiState;
            
            // Choose a new random position every 1-2 seconds
            if (now - aiState.lastRandomMove > 1000 + Math.random() * 1000) {
                // Random position in the top half but not too close to goals
                aiState.randomTarget = {
                    x: FIELD_WIDTH * 0.25 + Math.random() * (FIELD_WIDTH * 0.5),
                    y: FIELD_HEIGHT * 0.15 + Math.random() * (FIELD_HEIGHT * 0.2)
                };
                aiState.lastRandomMove = now;
            }
            
            // Move towards random position
            const dx = aiState.randomTarget.x - ai.position.x;
            const dy = aiState.randomTarget.y - ai.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 5) { // Only move if not too close to target
                const dirX = dx / distance;
                const dirY = dy / distance;
                const force = 0.0007; // Slightly slower movement when patrolling
                
                Body.applyForce(ai, ai.position, {
                    x: dirX * force,
                    y: dirY * force
                });
            }
            
            return; // Skip the rest of the function for random movement
        }
        
        // Choose a target ball (random if multiple in field)
        const targetBall = ballsInAIField[Math.floor(Math.random() * ballsInAIField.length)];
        
        // Calculate direction to target ball
        const dx = targetBall.position.x - ai.position.x;
        const dy = targetBall.position.y - ai.position.y;
        
        // Calculate distance to target ball
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 10) { // Only move if not too close to the ball
            // Normalize direction
            const dirX = dx / distance;
            const dirY = dy / distance;
            
            // Calculate force based on distance (faster when further away)
            const baseForce = 0.008;
            const distanceFactor = Math.min(distance / 50, 2.5);
            const force = baseForce * distanceFactor;
            
            // Apply force in direction of ball
            Body.applyForce(ai, ai.position, {
                x: dirX * force,
                y: dirY * force
            });
            
            // Limit maximum speed
            const maxSpeed = 12;
            const speed = Math.sqrt(ai.velocity.x * ai.velocity.x + ai.velocity.y * ai.velocity.y);
            if (speed > maxSpeed) {
                const ratio = maxSpeed / speed;
                Body.setVelocity(ai, {
                    x: ai.velocity.x * ratio,
                    y: ai.velocity.y * ratio
                });
            }
        }
        
        // Apply some friction to prevent sliding
        Body.setVelocity(ai, {
            x: ai.velocity.x * 0.93,
            y: ai.velocity.y * 0.93
        });
    } catch (e) {
        console.error('AI update error:', e);
    }
}

// Check if ball is stuck in a corner
function isBallStuckInCorner(ball = window.game.ball) {
    if (!ball) return false;

    const cornerThreshold = BALL_RADIUS * 4; // Larger threshold for AI detection

    // Check all four corners
    return (
        (ball.position.x < cornerThreshold && ball.position.y < cornerThreshold) || // Top-left
        (ball.position.x > FIELD_WIDTH - cornerThreshold && ball.position.y < cornerThreshold) || // Top-right
        (ball.position.x < cornerThreshold && ball.position.y > FIELD_HEIGHT - cornerThreshold) || // Bottom-left
        (ball.position.x > FIELD_WIDTH - cornerThreshold && ball.position.y > FIELD_HEIGHT - cornerThreshold) // Bottom-right
    );
}

// Check if ball is moving too slowly
function isBallMovingTooSlow(ball = window.game.ball) {
    if (!ball) return false;

    const velocity = ball.velocity;
    const currentSpeed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
    return currentSpeed < 1.0; // Higher threshold for AI detection
}

// Handle AI behavior when ball is stuck
function handleStuckBallAI(targetBall = window.game.ball) {
    // Initialize AI hit counter if it doesn't exist
    if (!window.game.aiHitCounter) {
        window.game.aiHitCounter = {
            lastHitTime: 0,
            lastBallPosition: { x: 0, y: 0 },
            inEscapeMode: false,
            escapeStartTime: 0
        };
    }

    const counter = window.game.aiHitCounter;
    const currentTime = Date.now();

    // Calculate vector from AI to ball
    const toBall = Vector.sub(targetBall.position, window.game.player2.position);
    const distToBall = Vector.magnitude(toBall);

    // Check if we're in escape mode
    if (counter.inEscapeMode) {
        // If we've been in escape mode for more than 2 seconds, exit it
        if (currentTime - counter.escapeStartTime > 2000) {
            counter.inEscapeMode = false;

        } else {
            // In escape mode, move away from the ball toward the center of AI's half
            // Make sure to stay away from the middle line
            const MIDDLE_LINE_BUFFER = 40; // Pixels to stay away from the middle line
            const AI_MAX_Y = FIELD_HEIGHT / 2 - MIDDLE_LINE_BUFFER;

            const escapeTarget = {
                x: FIELD_WIDTH / 2,
                y: Math.min(FIELD_HEIGHT / 4, AI_MAX_Y - PLAYER_RADIUS)
            };

            const toEscapeTarget = Vector.sub(escapeTarget, window.game.player2.position);
            const escapeDirection = Vector.normalise(toEscapeTarget);

            // Apply strong force to move away
            Body.applyForce(window.game.player2, window.game.player2.position,
                Vector.mult(escapeDirection, AI_SPEED * 3));
        }
    }

    // Check if AI is very close to the ball
    if (distToBall < PLAYER_RADIUS + BALL_RADIUS + 5) {
        // AI is touching the ball, update last hit time
        if (currentTime - counter.lastHitTime > 300) { // Debounce hits
            counter.lastHitTime = currentTime;

            // Calculate how far the ball has moved since last hit
            const ballMovement = Math.sqrt(
                Math.pow(targetBall.position.x - counter.lastBallPosition.x, 2) +
                Math.pow(targetBall.position.y - counter.lastBallPosition.y, 2)
            );

            // If ball hasn't moved much, enter escape mode
            if (ballMovement < BALL_RADIUS * 2) {
                counter.inEscapeMode = true;
                counter.escapeStartTime = currentTime;


                // Add visual indicator for escape mode
                const escapeIndicator = document.createElement('div');
                escapeIndicator.className = 'escape-indicator';
                escapeIndicator.style.position = 'absolute';
                escapeIndicator.style.width = '60px';
                escapeIndicator.style.height = '60px';
                escapeIndicator.style.borderRadius = '50%';
                escapeIndicator.style.border = '3px dashed rgba(255, 255, 0, 0.7)';
                escapeIndicator.style.left = targetBall.position.x + 'px';
                escapeIndicator.style.top = targetBall.position.y + 'px';
                escapeIndicator.style.transform = 'translate(-50%, -50%)';
                escapeIndicator.style.zIndex = '90';
                escapeIndicator.style.animation = 'escape-pulse 0.5s ease-in-out infinite alternate';
                document.getElementById('game-field').appendChild(escapeIndicator);

                // Remove after escape mode ends
                setTimeout(() => {
                    if (escapeIndicator.parentNode) {
                        escapeIndicator.parentNode.removeChild(escapeIndicator);
                    }
                }, 2000);

                // Give the ball a strong push toward the opponent's goal
                const ballVelocity = {
                    x: (Math.random() * 2 - 1) * 2, // Random horizontal direction
                    y: 1 // Always downward toward opponent's goal
                };

                // Normalize and scale
                const magnitude = Math.sqrt(ballVelocity.x * ballVelocity.x + ballVelocity.y * ballVelocity.y);
                const normalizedVelocity = {
                    x: ballVelocity.x / magnitude,
                    y: ballVelocity.y / magnitude
                };

                // Set ball velocity with extra speed
                const ball2D = targetBall.label === 'ball2' ? window.game.ball2_2D : window.game.ball2D;
                const escapeSpeed = ball2D ? ball2D.currentSpeed * 1.5 : 7.5;
                Body.setVelocity(targetBall, {
                    x: normalizedVelocity.x * escapeSpeed,
                    y: normalizedVelocity.y * escapeSpeed
                });
            }

            // Update last ball position
            counter.lastBallPosition = { ...targetBall.position };
        }
    } else {
        // Update last ball position if AI is not touching the ball
        if (currentTime - counter.lastHitTime > 1000) {
            counter.lastBallPosition = { ...targetBall.position };
        }
    }

    // Define a buffer zone from the middle line
    const MIDDLE_LINE_BUFFER = 40; // Pixels to stay away from the middle line
    const AI_MAX_Y = FIELD_HEIGHT / 2 - MIDDLE_LINE_BUFFER;

    // Check if AI is too close to the middle line
    const isTooCloseToMiddle = window.game.player2.position.y > AI_MAX_Y;

    // If AI is too close to the middle line, prioritize moving away
    if (isTooCloseToMiddle) {
        // Move back to a safe position away from the middle line
        const safePosition = {
            x: window.game.player2.position.x,
            y: AI_MAX_Y - PLAYER_RADIUS
        };

        // Direction to safe position
        let direction = Vector.sub(safePosition, window.game.player2.position);

        // Normalize and scale with higher priority
        direction = Vector.normalise(direction);
        direction = Vector.mult(direction, AI_SPEED * 1.5); // Higher speed to move away quickly

        // Apply force to move away from middle line
        Body.applyForce(window.game.player2, window.game.player2.position, direction);
    }
    // If AI is close to the ball, move to push it toward the center
    else if (distToBall < PLAYER_RADIUS * 3) {
        // Calculate vector from ball to center, but not toward the middle line
        let targetY;
        if (targetBall.position.y < FIELD_HEIGHT / 2) {
            // Ball is in AI's half, push toward center but not past the buffer
            targetY = Math.min(FIELD_HEIGHT / 2 - MIDDLE_LINE_BUFFER, targetBall.position.y);
        } else {
            // Ball is in player's half, push toward center
            targetY = FIELD_HEIGHT / 2;
        }

        const toCenter = {
            x: FIELD_WIDTH / 2 - targetBall.position.x,
            y: targetY - targetBall.position.y
        };

        // Normalize and scale - use higher speed to free the ball
        const direction = Vector.normalise(toCenter);
        const forceFactor = AI_SPEED * 2.5; // Much stronger force to free the ball

        // Apply force to move toward center
        Body.applyForce(window.game.player2, window.game.player2.position,
            Vector.mult(direction, forceFactor));
    } else {
        // Move toward ball but respect the middle line buffer
        let direction = Vector.normalise(toBall);

        // If moving toward the ball would bring AI too close to middle line, adjust the direction
        if (targetBall.position.y > AI_MAX_Y) {
            // Create a modified target that's at the same x as the ball but at a safe y
            const safeTarget = {
                x: targetBall.position.x,
                y: AI_MAX_Y - PLAYER_RADIUS
            };

            // Direction to safe target
            const toSafeTarget = Vector.sub(safeTarget, window.game.player2.position);
            direction = Vector.normalise(toSafeTarget);
        }

        const forceFactor = AI_SPEED * 1.5; // Higher speed to reach the ball quickly

        // Apply force to move toward ball (or safe position)
        Body.applyForce(window.game.player2, window.game.player2.position,
            Vector.mult(direction, forceFactor));
    }
}

// Normal AI behavior (kept for compatibility, but simplified)
function normalAIBehavior() {
    // This function is kept for compatibility but does nothing
    // as all AI logic is now in updateAI()
    return;

    // Only move if ball is in AI's half (top half)
    if (window.game.ball.position.y < FIELD_HEIGHT / 2) {
        // If AI is too close to the middle line, prioritize moving away
        if (isTooCloseToMiddle) {
            // Move back to a safe position away from the middle line
            const safePosition = {
                x: window.game.player2.position.x,
                y: AI_MAX_Y - PLAYER_RADIUS
            };

            // Direction to safe position
            let direction = Vector.sub(safePosition, window.game.player2.position);

            // Normalize and scale with higher priority
            direction = Vector.normalise(direction);
            direction = Vector.mult(direction, AI_SPEED * 1.5); // Higher speed to move away quickly

            // Apply force to move away from middle line
            Body.applyForce(window.game.player2, window.game.player2.position, direction);
        } else {
            // Direction to ball
            let direction = Vector.sub(window.game.ball.position, window.game.player2.position);

            // If moving toward the ball would bring AI too close to middle line, adjust the direction
            if (window.game.ball.position.y > AI_MAX_Y) {
                // Create a modified target that's at the same x as the ball but at a safe y
                const safeTarget = {
                    x: window.game.ball.position.x,
                    y: AI_MAX_Y - PLAYER_RADIUS
                };

                // Direction to safe target
                direction = Vector.sub(safeTarget, window.game.player2.position);
            }

            // Normalize direction
            direction = Vector.normalise(direction);

            // Scale by AI speed
            direction = Vector.mult(direction, AI_SPEED);

            // Apply force to move towards ball (or safe position)
            Body.applyForce(window.game.player2, window.game.player2.position, direction);
        }
    } else {
        // If ball is in opponent's half, move back to defensive position
        const defensivePosition = {
            x: FIELD_WIDTH / 2,
            y: FIELD_HEIGHT / 4 // This is already far from the middle line
        };

        // Direction to defensive position
        let direction = Vector.sub(defensivePosition, window.game.player2.position);

        // Only move if not already at defensive position
        if (Vector.magnitude(direction) > PLAYER_RADIUS * 0.5) {
            // Normalize and scale
            direction = Vector.normalise(direction);
            direction = Vector.mult(direction, AI_SPEED * 0.5);

            // Apply force
            Body.applyForce(window.game.player2, window.game.player2.position, direction);
        }
    }
}

// AI behavior when backing off from the ball
function backoffBehavior() {
    if (!window.game.ball || !window.game.player2) return;

    // Define a buffer zone from the middle line (same as in normalAIBehavior)
    const MIDDLE_LINE_BUFFER = 40; // Pixels to stay away from the middle line
    const AI_MAX_Y = FIELD_HEIGHT / 2 - MIDDLE_LINE_BUFFER;

    // Check if AI is too close to the middle line
    const isTooCloseToMiddle = window.game.player2.position.y > AI_MAX_Y;

    // If AI is too close to the middle line, prioritize moving away
    if (isTooCloseToMiddle) {
        // Move back to a safe position away from the middle line
        const safePosition = {
            x: window.game.player2.position.x,
            y: AI_MAX_Y - PLAYER_RADIUS
        };

        // Direction to safe position
        let direction = Vector.sub(safePosition, window.game.player2.position);

        // Normalize and scale with higher priority
        direction = Vector.normalise(direction);
        direction = Vector.mult(direction, AI_SPEED * 1.5); // Higher speed to move away quickly

        // Apply force to move away from middle line
        Body.applyForce(window.game.player2, window.game.player2.position, direction);
        return; // Skip other behaviors when too close to middle line
    }

    // Calculate vector from AI to ball
    const fromBall = Vector.sub(window.game.player2.position, window.game.ball.position);
    const distToBall = Vector.magnitude(fromBall);

    // If already far enough from ball, move to a strategic position
    if (distToBall > PLAYER_RADIUS * 6) {
        // Move to a position that anticipates where the ball might go
        // Position between the ball and the goal
        const goalPosition = { x: FIELD_WIDTH / 2, y: GOAL_TOP };
        let anticipatedPosition = {
            x: (window.game.ball.position.x + goalPosition.x) / 2,
            y: (window.game.ball.position.y + goalPosition.y) / 2
        };

        // Ensure the anticipated position is not too close to the middle line
        if (anticipatedPosition.y > AI_MAX_Y) {
            anticipatedPosition.y = AI_MAX_Y - PLAYER_RADIUS;
        }

        // Direction to anticipated position
        let direction = Vector.sub(anticipatedPosition, window.game.player2.position);

        // Normalize and scale
        direction = Vector.normalise(direction);
        direction = Vector.mult(direction, AI_SPEED * 0.7); // Slightly slower movement

        // Apply force
        Body.applyForce(window.game.player2, window.game.player2.position, direction);
    }
    // If too close to ball, move away
    else {
        // Normalize direction away from ball
        let direction = Vector.normalise(fromBall);

        // If moving away from the ball would push AI toward the middle line, adjust direction
        if (window.game.player2.position.y + direction.y > AI_MAX_Y) {
            // Modify direction to move more horizontally and away from middle line
            direction.y = -Math.abs(direction.y); // Ensure vertical component moves away from middle
        }

        // Normalize again after adjustment
        direction = Vector.normalise(direction);

        // Scale by AI speed
        direction = Vector.mult(direction, AI_SPEED * 0.8);

        // Apply force to move away from ball
        Body.applyForce(window.game.player2, window.game.player2.position, direction);
    }
}

// Enforce player boundaries
function enforcePlayerBoundaries() {
    Events.on(window.game.engine, 'afterUpdate', function() {
        // Keep player1 in bottom half
        if (window.game.player1.position.y < FIELD_HEIGHT / 2) {
            Body.setPosition(window.game.player1, {
                x: window.game.player1.position.x,
                y: FIELD_HEIGHT / 2 + PLAYER_RADIUS
            });
            Body.setVelocity(window.game.player1, {
                x: window.game.player1.velocity.x * 0.5,
                y: Math.abs(window.game.player1.velocity.y) * 0.5 // Bounce back
            });
        }

        // Keep player2 in top half
        if (window.game.player2.position.y > FIELD_HEIGHT / 2) {
            Body.setPosition(window.game.player2, {
                x: window.game.player2.position.x,
                y: FIELD_HEIGHT / 2 - PLAYER_RADIUS
            });
            Body.setVelocity(window.game.player2, {
                x: window.game.player2.velocity.x * 0.5,
                y: -Math.abs(window.game.player2.velocity.y) * 0.5 // Bounce back
            });
        }

        // Keep players within horizontal bounds
        const horizontalMargin = PLAYER_RADIUS + WALL_THICKNESS;

        // Player 1 horizontal bounds
        if (window.game.player1.position.x < horizontalMargin) {
            Body.setPosition(window.game.player1, {
                x: horizontalMargin,
                y: window.game.player1.position.y
            });
            Body.setVelocity(window.game.player1, {
                x: Math.abs(window.game.player1.velocity.x) * 0.5,
                y: window.game.player1.velocity.y * 0.5
            });
        } else if (window.game.player1.position.x > FIELD_WIDTH - horizontalMargin) {
            Body.setPosition(window.game.player1, {
                x: FIELD_WIDTH - horizontalMargin,
                y: window.game.player1.position.y
            });
            Body.setVelocity(window.game.player1, {
                x: -Math.abs(window.game.player1.velocity.x) * 0.5,
                y: window.game.player1.velocity.y * 0.5
            });
        }

        // Player 2 horizontal bounds
        if (window.game.player2.position.x < horizontalMargin) {
            Body.setPosition(window.game.player2, {
                x: horizontalMargin,
                y: window.game.player2.position.y
            });
            Body.setVelocity(window.game.player2, {
                x: Math.abs(window.game.player2.velocity.x) * 0.5,
                y: window.game.player2.velocity.y * 0.5
            });
        } else if (window.game.player2.position.x > FIELD_WIDTH - horizontalMargin) {
            Body.setPosition(window.game.player2, {
                x: FIELD_WIDTH - horizontalMargin,
                y: window.game.player2.position.y
            });
            Body.setVelocity(window.game.player2, {
                x: -Math.abs(window.game.player2.velocity.x) * 0.5,
                y: window.game.player2.velocity.y * 0.5
            });
        }
    });
}

// Keep ball within bounds
function keepBallsInBounds() {
    Events.on(window.game.engine, 'afterUpdate', function() {
        // Process first ball
        if (window.game.ball) {
            // Check if ball is stuck in a corner
            checkAndFixCornerStuck(window.game.ball);

            // Maintain constant ball speed
            if (window.game.ball2D) {
                // Get current velocity
                const velocity = window.game.ball.velocity;

                // Calculate current speed
                const currentSpeed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);

                // Only adjust if the ball is moving
                if (currentSpeed > 0.1) {
                    // Get target speed from the 2D ball object
                    const targetSpeed = window.game.ball2D.currentSpeed;

                    // Normalize the velocity vector
                    const normalizedVelocity = {
                        x: velocity.x / currentSpeed,
                        y: velocity.y / currentSpeed
                    };

                    // Set the velocity to maintain constant speed
                    Body.setVelocity(window.game.ball, {
                        x: normalizedVelocity.x * targetSpeed,
                        y: normalizedVelocity.y * targetSpeed
                    });
                } else {
                    // If ball is almost stopped, give it a random direction
                    const randomAngle = Math.random() * Math.PI * 2;
                    Body.setVelocity(window.game.ball, {
                        x: Math.cos(randomAngle) * window.game.ball2D.currentSpeed,
                        y: Math.sin(randomAngle) * window.game.ball2D.currentSpeed
                    });
                }
            }

            // Apply bounds checking for first ball
            applyBallBounds(window.game.ball, window.game.ball2D);
        }

        // Process second ball
        if (window.game.ball2) {
            // Check if second ball is stuck in a corner
            checkAndFixCornerStuck(window.game.ball2);

            // Maintain constant ball speed for second ball
            if (window.game.ball2_2D) {
                // Get current velocity
                const velocity = window.game.ball2.velocity;

                // Calculate current speed
                const currentSpeed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);

                // Only adjust if the ball is moving
                if (currentSpeed > 0.1) {
                    // Get target speed from the 2D ball object
                    const targetSpeed = window.game.ball2_2D.currentSpeed;

                    // Normalize the velocity vector
                    const normalizedVelocity = {
                        x: velocity.x / currentSpeed,
                        y: velocity.y / currentSpeed
                    };

                    // Set the velocity to maintain constant speed
                    Body.setVelocity(window.game.ball2, {
                        x: normalizedVelocity.x * targetSpeed,
                        y: normalizedVelocity.y * targetSpeed
                    });
                } else {
                    // If ball is almost stopped, give it a random direction
                    const randomAngle = Math.random() * Math.PI * 2;
                    Body.setVelocity(window.game.ball2, {
                        x: Math.cos(randomAngle) * window.game.ball2_2D.currentSpeed,
                        y: Math.sin(randomAngle) * window.game.ball2_2D.currentSpeed
                    });
                }
            }

            // Apply bounds checking for second ball
            applyBallBounds(window.game.ball2, window.game.ball2_2D);
        }
    });
}

// Apply bounds checking to a ball
function applyBallBounds(ball, ball2D) {
    if (!ball) return;

    // Check horizontal bounds
    if (ball.position.x < WALL_THICKNESS + BALL_RADIUS) {
        Body.setPosition(ball, {
            x: WALL_THICKNESS + BALL_RADIUS,
            y: ball.position.y
        });

        // Get current velocity
        const velocity = ball.velocity;
        const speed = ball2D ? ball2D.currentSpeed : Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);

        // Reflect the x component but maintain constant speed
        const normalizedVelocity = {
            x: Math.abs(velocity.x) / Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y),
            y: velocity.y / Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y)
        };

        Body.setVelocity(ball, {
            x: normalizedVelocity.x * speed,
            y: normalizedVelocity.y * speed
        });
    } else if (ball.position.x > FIELD_WIDTH - WALL_THICKNESS - BALL_RADIUS) {
        Body.setPosition(ball, {
            x: FIELD_WIDTH - WALL_THICKNESS - BALL_RADIUS,
            y: ball.position.y
        });

        // Get current velocity
        const velocity = ball.velocity;
        const speed = ball2D ? ball2D.currentSpeed : Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);

        // Reflect the x component but maintain constant speed
        const normalizedVelocity = {
            x: -Math.abs(velocity.x) / Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y),
            y: velocity.y / Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y)
        };

        Body.setVelocity(ball, {
            x: normalizedVelocity.x * speed,
            y: normalizedVelocity.y * speed
        });
    }

    // Check vertical bounds (excluding goal areas)
    const isInGoalArea = (
        ball.position.x > FIELD_WIDTH / 2 - GOAL_WIDTH / 2 &&
        ball.position.x < FIELD_WIDTH / 2 + GOAL_WIDTH / 2
    );

    if (!isInGoalArea) {
        if (ball.position.y < WALL_THICKNESS + BALL_RADIUS) {
            Body.setPosition(ball, {
                x: ball.position.x,
                y: WALL_THICKNESS + BALL_RADIUS
            });

            // Get current velocity
            const velocity = ball.velocity;
            const speed = ball2D ? ball2D.currentSpeed : Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);

            // Reflect the y component but maintain constant speed
            const normalizedVelocity = {
                x: velocity.x / Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y),
                y: Math.abs(velocity.y) / Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y)
            };

            Body.setVelocity(ball, {
                x: normalizedVelocity.x * speed,
                y: normalizedVelocity.y * speed
            });
        } else if (ball.position.y > FIELD_HEIGHT - WALL_THICKNESS - BALL_RADIUS) {
            Body.setPosition(ball, {
                x: ball.position.x,
                y: FIELD_HEIGHT - WALL_THICKNESS - BALL_RADIUS
            });

            // Get current velocity
            const velocity = ball.velocity;
            const speed = ball2D ? ball2D.currentSpeed : Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);

            // Reflect the y component but maintain constant speed
            const normalizedVelocity = {
                x: velocity.x / Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y),
                y: -Math.abs(velocity.y) / Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y)
            };

            Body.setVelocity(ball, {
                x: normalizedVelocity.x * speed,
                y: normalizedVelocity.y * speed
            });
        }
    }
}

// Check if ball is stuck in a corner and fix it
function checkAndFixCornerStuck(ball) {
    if (!ball) return;

    // Track how long the ball has been stuck
    if (!window.game.stuckTimer) {
        window.game.stuckTimer = {
            isStuck: false,
            startTime: 0,
            position: { x: 0, y: 0 }
        };
    }

    // Create a separate tracker for the second ball if needed
    if (ball.label === 'ball2' && !window.game.stuckTimer2) {
        window.game.stuckTimer2 = {
            isStuck: false,
            startTime: 0,
            position: { x: 0, y: 0 }
        };
    }

    // Use the appropriate timer based on which ball we're checking
    const stuckTimer = ball.label === 'ball2' ? window.game.stuckTimer2 : window.game.stuckTimer;

    const cornerThreshold = BALL_RADIUS * 1.5; // Reduced threshold - only detect when very close to corner
    const speed = (ball.label === 'ball2' && window.game.ball2_2D) ?
                  window.game.ball2_2D.currentSpeed :
                  (window.game.ball2D ? window.game.ball2D.currentSpeed : 5);

    // Check if ball has moved significantly
    const currentTime = Date.now();
    const distMoved = Math.sqrt(
        Math.pow(ball.position.x - stuckTimer.position.x, 2) +
        Math.pow(ball.position.y - stuckTimer.position.y, 2)
    );

    // If ball hasn't moved much in the last 2 seconds, consider it stuck
    if (distMoved < BALL_RADIUS && stuckTimer.isStuck && currentTime - stuckTimer.startTime > 2000) {
        console.log(`Ball ${ball.label} hasn't moved for 1 second, applying stronger fix...`);

        // Apply a stronger push toward the center
        const toCenter = {
            x: FIELD_WIDTH / 2 - ball.position.x,
            y: FIELD_HEIGHT / 2 - ball.position.y
        };

        // Normalize
        const dist = Math.sqrt(toCenter.x * toCenter.x + toCenter.y * toCenter.y);
        const normalized = {
            x: toCenter.x / dist,
            y: toCenter.y / dist
        };

        // Apply a stronger push (1.5x normal speed)
        Body.setVelocity(ball, {
            x: normalized.x * speed * 1.5,
            y: normalized.y * speed * 1.5
        });

        // Reset the timer but keep tracking
        stuckTimer.startTime = currentTime;
        stuckTimer.position = { ...ball.position };
    }

    // Update position for tracking
    if (!stuckTimer.isStuck) {
        stuckTimer.isStuck = true;
        stuckTimer.startTime = currentTime;
    }

    // If ball is moving at a good speed, reset the stuck timer
    const ballVelocity = ball.velocity;
    const ballSpeed = Math.sqrt(ballVelocity.x * ballVelocity.x + ballVelocity.y * ballVelocity.y);
    if (ballSpeed > 3) {
        stuckTimer.isStuck = false;
    }

    stuckTimer.position = { ...ball.position };

    // Check top-left corner - only activate if ball is moving very slowly
    if (ball.position.x < cornerThreshold && ball.position.y < cornerThreshold && ballSpeed < 1.0) {

        // Move ball slightly away from corner
        Body.setPosition(ball, {
            x: cornerThreshold + 5,
            y: cornerThreshold + 5
        });
        // Set velocity diagonally away from corner
        Body.setVelocity(ball, {
            x: speed * 0.7071, // cos(45°)
            y: speed * 0.7071  // sin(45°)
        });
        return true;
    }

    // Check top-right corner - only activate if ball is moving very slowly
    if (ball.position.x > FIELD_WIDTH - cornerThreshold && ball.position.y < cornerThreshold && ballSpeed < 1.0) {

        // Move ball slightly away from corner
        Body.setPosition(ball, {
            x: FIELD_WIDTH - cornerThreshold - 5,
            y: cornerThreshold + 5
        });
        // Set velocity diagonally away from corner
        Body.setVelocity(ball, {
            x: -speed * 0.7071, // -cos(45°)
            y: speed * 0.7071   // sin(45°)
        });
        return true;
    }

    // Check bottom-left corner - only activate if ball is moving very slowly
    if (ball.position.x < cornerThreshold && ball.position.y > FIELD_HEIGHT - cornerThreshold && ballSpeed < 1.0) {

        // Move ball slightly away from corner
        Body.setPosition(ball, {
            x: cornerThreshold + 5,
            y: FIELD_HEIGHT - cornerThreshold - 5
        });
        // Set velocity diagonally away from corner
        Body.setVelocity(ball, {
            x: speed * 0.7071,  // cos(45°)
            y: -speed * 0.7071  // -sin(45°)
        });
        return true;
    }

    // Check bottom-right corner - only activate if ball is moving very slowly
    if (ball.position.x > FIELD_WIDTH - cornerThreshold && ball.position.y > FIELD_HEIGHT - cornerThreshold && ballSpeed < 1.0) {

        // Move ball slightly away from corner
        Body.setPosition(ball, {
            x: FIELD_WIDTH - cornerThreshold - 5,
            y: FIELD_HEIGHT - cornerThreshold - 5
        });
        // Set velocity diagonally away from corner
        Body.setVelocity(ball, {
            x: -speed * 0.7071, // -cos(45°)
            y: -speed * 0.7071  // -sin(45°)
        });
        return true;
    }

    // Also check if the ball is moving very slowly (another sign of being stuck)
    const velocity = ball.velocity;
    const currentSpeed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
    if (currentSpeed < 0.5) {
        // Get the appropriate 2D ball object
        const ball2D = ball.label === 'ball2' ? window.game.ball2_2D : window.game.ball2D;

        if (ball2D) {
            // Give the ball a random direction
            const randomAngle = Math.random() * Math.PI * 2;
            Body.setVelocity(ball, {
                x: Math.cos(randomAngle) * ball2D.currentSpeed,
                y: Math.sin(randomAngle) * ball2D.currentSpeed
            });
            return true;
        }
    }

    // Check if ball is stuck between a player and a wall
    if (window.game.player1 && window.game.player2) {
        // Distance from ball to players
        const distToPlayer1 = Math.sqrt(
            Math.pow(ball.position.x - window.game.player1.position.x, 2) +
            Math.pow(ball.position.y - window.game.player1.position.y, 2)
        );

        const distToPlayer2 = Math.sqrt(
            Math.pow(ball.position.x - window.game.player2.position.x, 2) +
            Math.pow(ball.position.y - window.game.player2.position.y, 2)
        );

        // Check if ball is close to a player and near a wall
        const isNearWall = (
            ball.position.x < WALL_THICKNESS + BALL_RADIUS * 2 ||
            ball.position.x > FIELD_WIDTH - WALL_THICKNESS - BALL_RADIUS * 2 ||
            ball.position.y < WALL_THICKNESS + BALL_RADIUS * 2 ||
            ball.position.y > FIELD_HEIGHT - WALL_THICKNESS - BALL_RADIUS * 2
        );

        if (isNearWall && (distToPlayer1 < PLAYER_RADIUS + BALL_RADIUS * 2 || distToPlayer2 < PLAYER_RADIUS + BALL_RADIUS * 2)) {
            // Move ball toward center of field
            const toCenter = {
                x: FIELD_WIDTH / 2 - ball.position.x,
                y: FIELD_HEIGHT / 2 - ball.position.y
            };

            // Normalize
            const dist = Math.sqrt(toCenter.x * toCenter.x + toCenter.y * toCenter.y);
            const normalized = {
                x: toCenter.x / dist,
                y: toCenter.y / dist
            };

            // Set velocity toward center
            const ball2D = ball.label === 'ball2' ? window.game.ball2_2D : window.game.ball2D;
            const speed = ball2D ? ball2D.currentSpeed : 5;

            Body.setVelocity(ball, {
                x: normalized.x * speed,
                y: normalized.y * speed
            });

            return true;
        }
    }

    return false;
}

// Update ball visual elements
function updateBallVisuals() {
    // Check if performance mode is enabled
    const performanceMode = localStorage.getItem('performanceMode') === 'true';

    // Visual size for the ball (smaller than hitbox)
    const visualRadius = 10;

    // Update first ball visuals (only if ball and 2D ball exist)
    if (window.game.ball && window.game.ball2D) {
        updateSingleBallVisuals(
            window.game.ball,
            window.game.ball2D,
            '.ball-overlay:not(.ball2-overlay)',
            '.ball-shadow:not(.ball2-shadow)',
            '.ball-trail:not(.ball2-trail)',
            window.game.lastBallPosition,
            visualRadius,
            performanceMode
        );

        // Update last ball position for next frame
        window.game.lastBallPosition = { ...window.game.ball.position };
    }

    // Update second ball visuals (only if ball and 2D ball exist)
    if (window.game.ball2 && window.game.ball2_2D) {
        updateSingleBallVisuals(
            window.game.ball2,
            window.game.ball2_2D,
            '.ball2-overlay',
            '.ball2-shadow',
            '.ball2-trail',
            window.game.lastBall2Position,
            visualRadius,
            performanceMode
        );

        // Update last ball position for next frame
        window.game.lastBall2Position = { ...window.game.ball2.position };
    }

    // Also update player visuals
    updatePlayerVisuals();
}

// Update visuals for a single ball
function updateSingleBallVisuals(ball, ball2D, overlaySelector, shadowSelector, trailSelector, lastPosition, visualRadius, performanceMode) {
    if (!ball) return;

    // Get ball position
    const ballPos = ball.position;

    // Update 2D textured ball if available
    if (ball2D) {
        // In performance mode, use the optimized updateBall method
        if (performanceMode) {
            ball2D.updatePosition(ballPos.x, ballPos.y, ball.velocity);
            ball2D.updateBall(ball.velocity);
        } else {
            // Regular mode - use default update with full effects
            ball2D.updatePosition(ballPos.x, ballPos.y, ball.velocity);
        }

        // Hide default ball overlay when using textured 2D ball
        const ballOverlay = document.querySelector(overlaySelector);
        if (ballOverlay) {
            ballOverlay.style.display = 'none';
        }
    }

    // Update 2D ball overlay if it exists
    const ballOverlay = document.querySelector(overlaySelector);
    if (ballOverlay) {
        // Position updates still happen even if hidden
        ballOverlay.style.left = `${ballPos.x - visualRadius - 5}px`;
        ballOverlay.style.top = `${ballPos.y - visualRadius - 5}px`;
        ballOverlay.style.width = `${visualRadius * 2 + 10}px`;
        ballOverlay.style.height = `${visualRadius * 2 + 10}px`;

        // Add rotation based on ball angular velocity
        const angle = ball.angle * (180 / Math.PI);
        ballOverlay.style.transform = `rotate(${angle}deg)`;

        // Add visual effects based on ball speed
        const speed = Vector.magnitude(ball.velocity);
        if (speed > 15) {
            ballOverlay.classList.add('ball-fast');
        } else {
            ballOverlay.classList.remove('ball-fast');
        }
    }

    // Update ball shadow position
    const ballShadow = document.querySelector(shadowSelector);
    if (ballShadow) {
        ballShadow.style.left = `${ballPos.x - visualRadius - 5}px`;
        ballShadow.style.top = `${ballPos.y + 5}px`;
        ballShadow.style.width = `${visualRadius * 2 + 10}px`;

        // Scale shadow based on ball height (simulated by speed)
        const speed = Vector.magnitude(ball.velocity);

        // Remove all shadow classes first
        ballShadow.classList.remove('elevated', 'high');

        // Add appropriate shadow class based on speed
        if (speed > 20) {
            ballShadow.classList.add('high');
        } else if (speed > 10) {
            ballShadow.classList.add('elevated');
        }
    }

    // Update ball trail position
    const ballTrail = document.querySelector(trailSelector);
    if (ballTrail && lastPosition) {
        // Calculate trail position based on velocity
        const trailX = lastPosition.x;
        const trailY = lastPosition.y;
        ballTrail.style.left = `${trailX - visualRadius - 5}px`;
        ballTrail.style.top = `${trailY - visualRadius - 5}px`;
        ballTrail.style.width = `${visualRadius * 2 + 10}px`;
        ballTrail.style.height = `${visualRadius * 2 + 10}px`;

        // Show trail based on ball velocity
        const speed = Vector.magnitude(ball.velocity);

        // Remove/add visible class based on speed
        if (speed > 5) {
            ballTrail.classList.add('visible');
            ballTrail.style.transform = `scale(${1 + speed / 30})`;
        } else {
            ballTrail.classList.remove('visible');
        }
    }
}

// Start the game timer
function startGameTimer() {
    // Clear any existing timer
    if (window.game.timerInterval) {
        clearInterval(window.game.timerInterval);
    }

    // Reset game time
    window.game.gameTime = 60; // 1 minute

    // Update timer display
    updateTimerDisplay();

    // Start timer interval
    window.game.timerInterval = setInterval(function() {
        if (window.game.gameActive && window.game.gameTime > 0) {
            window.game.gameTime--;
            updateTimerDisplay();

            // Check if time is up
            if (window.game.gameTime <= 0) {
                endGame();
            }
        }
    }, 1000);
}

// Update timer display
function updateTimerDisplay() {
    const minutes = Math.floor(window.game.gameTime / 60);
    const seconds = window.game.gameTime % 60;
    const timerDisplay = document.getElementById('timer');
    if (timerDisplay) {
        timerDisplay.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }
}

// End the game
function endGame() {
    // Only proceed if the game is still active
    if (!window.game || !window.game.gameActive) return;

    console.log("Ending game...");

    // Mark game as inactive first to prevent further updates
    window.game.gameActive = false;

    // Stop match background music
    stopSound(matchSound);

    // Clear intervals immediately
    if (window.game.aiUpdateInterval) {
        clearInterval(window.game.aiUpdateInterval);
        window.game.aiUpdateInterval = null;
    }

    if (window.game.timerInterval) {
        clearInterval(window.game.timerInterval);
        window.game.timerInterval = null;
    }

    // Get final scores before any potential state changes
    const player1Score = window.game.score[0];
    const player2Score = window.game.score[1];
    let winnerText = '';
    let winnerFlag = '';

    if (player1Score > player2Score) {
        winnerText = 'Player 1 Wins!';
        winnerFlag = window.selectedPlayerFlag;
    } else if (player2Score > player1Score) {
        winnerText = 'Player 2 Wins!';
        winnerFlag = window.selectedOpponentFlag;
    } else {
        winnerText = 'It\'s a Draw!';
        winnerFlag = window.selectedPlayerFlag; // Show player's flag for draw
    }

    // Format the final score
    const finalScore = `${player1Score} - ${player2Score}`;

    // Pause physics engine to prevent further updates
    if (window.game.runner) {
        Runner.stop(window.game.runner);
    }

    // Immediately stop physics calculations to prevent further console logs
    if (window.game.engine) {
        Events.off(window.game.engine);
    }

    // Use the enhanced showEndScreen function with a slight delay to ensure clean transition
    setTimeout(() => {
        if (typeof showEndScreen === 'function') {
            showEndScreen(winnerFlag, winnerText, finalScore);
        } else {
            // Fallback to direct DOM manipulation if function not available
            document.getElementById('winner-text').textContent = winnerText;
            document.getElementById('winner-flag').style.backgroundImage = `url('flags/${winnerFlag}.png')`;
            document.getElementById('final-score').textContent = finalScore;

            // Show end screen
            document.getElementById('game-screen').style.display = 'none';
            document.getElementById('end-screen').style.display = 'flex';
        }
    }, 100);
}

// Clean up resources when game is stopped
window.stopPhaserGame = function() {
    if (window.game) {
        console.log("Stopping Phaser game and cleaning up resources...");

        // Stop all game audio
        try {
            if (matchSound) {
                matchSound.pause();
                matchSound.currentTime = 0;
                matchSound.src = '';
            }
            if (kickSound) {
                kickSound.pause();
                kickSound.currentTime = 0;
                kickSound.src = '';
            }
            if (goalSound) {
                goalSound.pause();
                goalSound.currentTime = 0;
                goalSound.src = '';
            }

            // Reset audio initialized flag to ensure proper reinitialization on next game
            audioInitialized = false;
        } catch (e) {
            console.log("Audio cleanup error:", e);
        }

        // Clear all intervals
        if (window.game.aiUpdateInterval) {
            clearInterval(window.game.aiUpdateInterval);
            window.game.aiUpdateInterval = null;
        }
        if (window.game.timerInterval) {
            clearInterval(window.game.timerInterval);
            window.game.timerInterval = null;
        }

        // Stop Matter.js engine and renderer
        if (window.game.engine) {
            Engine.clear(window.game.engine);
            if (window.game.runner) {
                Runner.stop(window.game.runner);
                window.game.runner = null;
            }
        }

        if (window.game.render) {
            Render.stop(window.game.render);
            window.game.render = null;
        }

        // Remove world objects
        if (window.game.world) {
            World.clear(window.game.world);
            window.game.world = null;
        }

        // Remove all event listeners from engine
        if (window.game.engine && window.game.engine.events) {
            Events.off(window.game.engine);
        }

        // Clean up all 2D textured balls
        Ball2D.disposeAll();
        window.game.ball2D = null;
        window.game.ball2_2D = null;

        // Remove all visual elements from the DOM
        document.querySelectorAll('.ball-overlay, .ball-shadow, .ball-trail, .ball2-overlay, .ball2-shadow, .ball2-trail, .boost-hint, .key-hint, .player, .ai-backoff-indicator, .ai-timeout-indicator, .impact-effect').forEach(el => {
            if (el && el.parentNode) {
                el.parentNode.removeChild(el);
            }
        });

        // Set game as inactive
        window.game.gameActive = false;

        // Nullify game object and all its properties
        window.game = null;

        console.log("Game cleanup complete");
    }
};

// Trigger camera flashes in the crowd
function triggerCrowdWave() {
    // Check if performance mode is enabled
    const performanceMode = localStorage.getItem('performanceMode') === 'true';

    // Skip effects in performance mode
    if (performanceMode) return;

    // Trigger random camera flashes in the crowd
    const topFlashes = document.querySelectorAll('.crowd-top [class^="flash"]');
    const bottomFlashes = document.querySelectorAll('.crowd-bottom [class^="flash"]');

    // Trigger flashes in sequence
    if (topFlashes.length > 0 && bottomFlashes.length > 0) {
        // Reset and trigger top flashes
        topFlashes.forEach((flash, index) => {
            setTimeout(() => {
                flash.style.animation = 'none';
                void flash.offsetWidth; // Force reflow
                flash.style.animation = `flash-starburst ${3 + Math.random()}s infinite`;
            }, index * 100);
        });

        // Reset and trigger bottom flashes with delay
        setTimeout(() => {
            bottomFlashes.forEach((flash, index) => {
                setTimeout(() => {
                    flash.style.animation = 'none';
                    void flash.offsetWidth; // Force reflow
                    flash.style.animation = `flash-starburst ${3 + Math.random()}s infinite`;
                }, index * 100);
            });
        }, 500);
    }
}