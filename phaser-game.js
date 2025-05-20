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
const PLAYER_RADIUS = 25; // Large hitbox for easier gameplay
const BALL_RADIUS = 15;
const FIELD_WIDTH = 320;
const FIELD_HEIGHT = 420;
const GOAL_WIDTH = 80;
const GOAL_HEIGHT = 10;
const PLAYER_START_Y = FIELD_HEIGHT - 100;
const OPPONENT_START_Y = 100;
const WALL_THICKNESS = 3;
const PLAYER_MASS = 10;
const BALL_MASS = 0.2; // Lighter ball for more responsive movement
const PLAYER_FRICTION = 0.35;
const BALL_FRICTION = 0.005; // Reduced friction for smoother ball movement
const PLAYER_RESTITUTION = 0.3;
const BALL_RESTITUTION = 1.8; // Higher bounce
const AI_SPEED = 0.04; // Speed multiplier for AI movement
const BALL_DRAG_FACTOR = 0.998; // Reduced air resistance for better ball movement

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
        score: [0, 0],
        gameActive: true,
        aiUpdateInterval: null,
        lastBallPosition: null,
        gameTime: 60,
        timerInterval: null
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
    // Create engine with improved settings for high-speed collisions
    window.game.engine = Engine.create({
        enableSleeping: false,
        constraintIterations: 8,
        positionIterations: 16,
        velocityIterations: 16
    });

    // Set engine properties
    window.game.engine.timing.timeScale = 0.9;

    window.game.world = window.game.engine.world;

    // Create renderer
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
            showCollisions: false  // Hide collisions
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

    // Create ball
    createBall();

    // Add mouse control
    addMouseControl();

    // Enforce player boundaries
    enforcePlayerBoundaries();

    // Keep ball in bounds
    keepBallInBounds();

    // Start the renderer
    Render.run(window.game.render);

    // Start the engine using Runner (instead of Engine.run)
    window.game.runner = Runner.create();
    Runner.run(window.game.runner, window.game.engine);

    // Set up collision event handling
    Events.on(window.game.engine, 'collisionStart', handleCollisions);

    // Update ball visuals on every frame
    Events.on(window.game.engine, 'afterUpdate', updateBallVisuals);

    // Create 2D textured ball
    const gameField = document.getElementById('game-field');
    window.game.ball2D = Ball2D.getInstance(gameField);

    // Hide the default ball overlay
    const ballOverlay = document.querySelector('.ball-overlay');
    if (ballOverlay) {
        ballOverlay.style.display = 'none';
    }

    // Remove top navigation buttons
    hideTopNavButtons();
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
            lineWidth: 1
        }
    };

    // Top wall (with gap for goal)
    const topLeftWall = Bodies.rectangle(
        FIELD_WIDTH / 4,
        WALL_THICKNESS / 2,
        FIELD_WIDTH / 2 - GOAL_WIDTH / 2,
        WALL_THICKNESS,
        wallOptions
    );

    const topRightWall = Bodies.rectangle(
        FIELD_WIDTH * 3 / 4,
        WALL_THICKNESS / 2,
        FIELD_WIDTH / 2 - GOAL_WIDTH / 2,
        WALL_THICKNESS,
        wallOptions
    );

    // Bottom wall (with gap for goal)
    const bottomLeftWall = Bodies.rectangle(
        FIELD_WIDTH / 4,
        FIELD_HEIGHT - WALL_THICKNESS / 2,
        FIELD_WIDTH / 2 - GOAL_WIDTH / 2,
        WALL_THICKNESS,
        wallOptions
    );

    const bottomRightWall = Bodies.rectangle(
        FIELD_WIDTH * 3 / 4,
        FIELD_HEIGHT - WALL_THICKNESS / 2,
        FIELD_WIDTH / 2 - GOAL_WIDTH / 2,
        WALL_THICKNESS,
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
        FIELD_WIDTH / 2,
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

    // Create the default ball overlay as a fallback
    const ballOverlay = document.createElement('div');
    ballOverlay.className = 'ball-overlay';
    document.getElementById('game-field').appendChild(ballOverlay);

    // Create shadow and trail elements for the ball
    const ballShadow = document.createElement('div');
    ballShadow.className = 'ball-shadow';
    document.getElementById('game-field').appendChild(ballShadow);

    const ballTrail = document.createElement('div');
    ballTrail.className = 'ball-trail';
    document.getElementById('game-field').appendChild(ballTrail);

    // Initialize ball visuals
    updateBallVisuals();

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

// Create players
function createPlayers() {
    const playerFlag = window.selectedPlayerFlag || 'argentina';
    const opponentFlag = window.selectedOpponentFlag || 'brazil-';

    // Visual size (smaller than hitbox)
    const visualRadius = 25;

    // Player 1 (bottom)
    window.game.player1 = Bodies.circle(
        FIELD_WIDTH / 2,
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

    // Player 2 (top) - opponent
    window.game.player2 = Bodies.circle(
        FIELD_WIDTH / 2,
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

    // Create visual player elements
    const player1Element = document.createElement('div');
    player1Element.className = 'player player1';
    player1Element.style.backgroundImage = `url('flags/${playerFlag}.png')`;
    document.getElementById('game-field').appendChild(player1Element);

    const player2Element = document.createElement('div');
    player2Element.className = 'player player2';
    player2Element.style.backgroundImage = `url('flags/${opponentFlag}.png')`;
    document.getElementById('game-field').appendChild(player2Element);

    // Initialize player visuals
    updatePlayerVisuals();
}

// Update player visual elements
function updatePlayerVisuals() {
    if (!window.game.player1 || !window.game.player2) return;

    // Visual size for the players
    const visualRadius = 25;

    // Update player 1 position
    const player1Element = document.querySelector('.player1');
    if (player1Element) {
        player1Element.style.left = `${window.game.player1.position.x - visualRadius}px`;
        player1Element.style.top = `${window.game.player1.position.y - visualRadius}px`;
    }

    // Update player 2 position
    const player2Element = document.querySelector('.player2');
    if (player2Element) {
        player2Element.style.left = `${window.game.player2.position.x - visualRadius}px`;
        player2Element.style.top = `${window.game.player2.position.y - visualRadius}px`;
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
            stiffness: 0.01,  // Very low stiffness for smooth movement
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

// Handle collisions
function handleCollisions(event) {
    const pairs = event.pairs;

    for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i];

        // Check for ball entering goals
        if ((pair.bodyA.label === 'ball' && pair.bodyB.label === 'topGoal') ||
            (pair.bodyB.label === 'ball' && pair.bodyA.label === 'topGoal')) {
            // Play goal sound immediately
            playSound(goalSound, 1.0);

            // Player scores
            window.game.score[0]++;
            updateScoreUI();
            resetBall();

            // Add goal celebration effect
            addGoalEffect(true);
        } else if ((pair.bodyA.label === 'ball' && pair.bodyB.label === 'bottomGoal') ||
                   (pair.bodyB.label === 'ball' && pair.bodyA.label === 'bottomGoal')) {
            // Play goal sound immediately
            playSound(goalSound, 1.0);

            // Opponent scores
            window.game.score[1]++;
            updateScoreUI();
            resetBall();

            // Add goal celebration effect
            addGoalEffect(false);
        }

        // Ball collision with players
        if ((pair.bodyA.label === 'ball' && (pair.bodyB.label === 'player' || pair.bodyB.label === 'opponent')) ||
            (pair.bodyB.label === 'ball' && (pair.bodyA.label === 'player' || pair.bodyA.label === 'opponent'))) {

                // Get references to the ball and player
            const ballBody = pair.bodyA.label === 'ball' ? pair.bodyA : pair.bodyB;
            const playerBody = pair.bodyA.label === 'ball' ? pair.bodyB : pair.bodyA;

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

            // Register touch with the 2D ball
            if (window.game.ball2D) {
                window.game.ball2D.registerTouch();
            }

            // Calculate the ball's new velocity using player speed and direction
            const baseKickStrength = 5; // Minimum kick strength
            const maxKickStrength = 25; // Maximum kick strength

            // Adjust kick strength based on power-up state
            let kickStrength = Math.min(baseKickStrength + playerSpeed * 1.5, maxKickStrength);

            // Apply power-up effects if active
            if (window.game.ball2D && window.game.ball2D.isPoweredUp) {
                // Increase kick strength for powered-up ball
                kickStrength *= 1.5;

                // Temporarily increase restitution (bounciness)
                ballBody.restitution = BALL_RESTITUTION * 1.3;

                // Reset restitution after a short delay
                setTimeout(() => {
                    if (window.game && window.game.ball) {
                        window.game.ball.restitution = BALL_RESTITUTION;
                    }
                }, 2000);

                // Create a red impact effect
                const impactEffect = document.createElement('div');
                impactEffect.className = 'impact-effect powered-up';
                impactEffect.style.position = 'absolute';
                impactEffect.style.width = '40px';
                impactEffect.style.height = '40px';
                impactEffect.style.borderRadius = '50%';
                impactEffect.style.backgroundColor = 'rgba(255, 0, 0, 0.5)';
                impactEffect.style.left = ballBody.position.x + 'px';
                impactEffect.style.top = ballBody.position.y + 'px';
                impactEffect.style.transform = 'translate(-50%, -50%)';
                impactEffect.style.zIndex = '95';
                impactEffect.style.animation = 'impact 0.3s ease-out forwards';
                document.getElementById('game-field').appendChild(impactEffect);

                // Remove after animation completes
                setTimeout(() => {
                    if (impactEffect.parentNode) {
                        impactEffect.parentNode.removeChild(impactEffect);
                    }
                }, 300);
            }

            // Change ball direction based on kick, but maintain constant speed
            if (window.game.ball2D) {
                // Get the target speed from the 2D ball object
                const targetSpeed = window.game.ball2D.currentSpeed;

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

            // Add bounce animation to ball
            const ballOverlay = document.querySelector('.ball-overlay');
            if (ballOverlay) {
                ballOverlay.classList.add('ball-bounce');
                setTimeout(() => {
                    ballOverlay.classList.remove('ball-bounce');
                }, 200);
            }
        }
    }
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

    // Trigger crowd camera flashes
    triggerCrowdWave();
}

// Reset ball position
function resetBall() {
    // Reset ball position to center
    Body.setPosition(window.game.ball, {
        x: FIELD_WIDTH / 2,
        y: FIELD_HEIGHT / 2
    });

    // Give the ball an initial velocity in a random direction
    const randomAngle = Math.random() * Math.PI * 2;
    const initialSpeed = window.game.ball2D ? window.game.ball2D.baseSpeed : 5;

    Body.setVelocity(window.game.ball, {
        x: Math.cos(randomAngle) * initialSpeed,
        y: Math.sin(randomAngle) * initialSpeed
    });

    // Reset ball angular velocity
    Body.setAngularVelocity(window.game.ball, 0);

    // Reset player positions
    Body.setPosition(window.game.player1, {
        x: FIELD_WIDTH / 2,
        y: PLAYER_START_Y
    });

    Body.setPosition(window.game.player2, {
        x: FIELD_WIDTH / 2,
        y: OPPONENT_START_Y
    });

    // Reset player velocities
    Body.setVelocity(window.game.player1, {x: 0, y: 0});
    Body.setVelocity(window.game.player2, {x: 0, y: 0});

    // Force update of 2D textured ball position and reset power-up state
    if (window.game.ball2D) {
        window.game.ball2D.updatePosition(FIELD_WIDTH / 2, FIELD_HEIGHT / 2, {x: 0, y: 0});
        window.game.ball2D.resetPowerUp();
    }

    // Reset stuck timer
    if (window.game.stuckTimer) {
        window.game.stuckTimer.isStuck = false;
        window.game.stuckTimer.startTime = Date.now();
        window.game.stuckTimer.position = { x: FIELD_WIDTH / 2, y: FIELD_HEIGHT / 2 };
    }

    // Reset AI state
    if (window.game.aiState) {
        window.game.aiState.lastBehaviorChange = Date.now();
        window.game.aiState.isBackingOff = false;
        window.game.aiState.backoffStartTime = 0;
        window.game.aiState.ballOnAISide = false;
        window.game.aiState.ballOnAISideStartTime = 0;
    }
}

// Update score UI
function updateScoreUI() {
    document.getElementById('player1-score').textContent = window.game.score[0];
    document.getElementById('player2-score').textContent = window.game.score[1];
}

// Start AI for player 2 (opponent)
function startAI() {
    // Clear any existing AI interval
    if (window.game.aiUpdateInterval) {
        clearInterval(window.game.aiUpdateInterval);
    }

    // Update AI every 16ms (roughly 60fps)
    window.game.aiUpdateInterval = setInterval(updateAI, 16);
}

// Update AI movement
function updateAI() {
    if (!window.game.gameActive) return;

    // Initialize AI state tracking if it doesn't exist
    if (!window.game.aiState) {
        window.game.aiState = {
            lastBehaviorChange: Date.now(),
            isBackingOff: false,
            backoffStartTime: 0,
            backoffDuration: 2000, // 2 seconds of backing off (already set to 2 seconds)
            normalBehaviorDuration: 3000, // 3 seconds of normal behavior
            ballOnAISide: false,
            ballOnAISideStartTime: 0,
            ballOnAISideDuration: 2000 // 2 seconds before backing off when ball is on AI's side
        };
    }

    const currentTime = Date.now();
    const aiState = window.game.aiState;

    // Check if ball is on AI's side (top half of the field)
    const isBallOnAISide = window.game.ball.position.y < FIELD_HEIGHT / 2;

    // Track how long the ball has been on AI's side
    if (isBallOnAISide) {
        if (!aiState.ballOnAISide) {
            // Ball just entered AI's side
            aiState.ballOnAISide = true;
            aiState.ballOnAISideStartTime = currentTime;
        } else if (currentTime - aiState.ballOnAISideStartTime > aiState.ballOnAISideDuration) {
            // Ball has been on AI's side for more than 2 seconds
            if (!aiState.isBackingOff) {
                aiState.isBackingOff = true;
                aiState.backoffStartTime = currentTime;

            }
        }
    } else {
        // Ball is not on AI's side
        aiState.ballOnAISide = false;
    }

    // Check if ball is stuck
    const isBallStuck = isBallStuckInCorner() || isBallMovingTooSlow();

    // If ball is stuck, handle it with special behavior
    if (isBallStuck) {
        handleStuckBallAI();
        // Reset behavior timer when handling stuck ball
        aiState.lastBehaviorChange = currentTime;
        aiState.isBackingOff = false;
    }
    // Regular behavior switching between normal and backing off
    else if (aiState.isBackingOff) {
        // Currently backing off, check if we should return to normal
        if (currentTime - aiState.backoffStartTime > aiState.backoffDuration) {
            aiState.isBackingOff = false;
            aiState.lastBehaviorChange = currentTime;

        } else {
            // Continue backing off
            backoffBehavior();
        }
    } else {
        // Normal behavior
        normalAIBehavior();
    }

    // Apply some friction to prevent excessive speed
    Body.setVelocity(window.game.player2, {
        x: window.game.player2.velocity.x * 0.95,
        y: window.game.player2.velocity.y * 0.95
    });
}

// Check if ball is stuck in a corner
function isBallStuckInCorner() {
    if (!window.game.ball) return false;

    const ball = window.game.ball;
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
function isBallMovingTooSlow() {
    if (!window.game.ball) return false;

    const velocity = window.game.ball.velocity;
    const currentSpeed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
    return currentSpeed < 1.0; // Higher threshold for AI detection
}

// Handle AI behavior when ball is stuck
function handleStuckBallAI() {
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
    const toBall = Vector.sub(window.game.ball.position, window.game.player2.position);
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
                Math.pow(window.game.ball.position.x - counter.lastBallPosition.x, 2) +
                Math.pow(window.game.ball.position.y - counter.lastBallPosition.y, 2)
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
                escapeIndicator.style.left = window.game.ball.position.x + 'px';
                escapeIndicator.style.top = window.game.ball.position.y + 'px';
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
                const escapeSpeed = window.game.ball2D ? window.game.ball2D.currentSpeed * 1.5 : 7.5;
                Body.setVelocity(window.game.ball, {
                    x: normalizedVelocity.x * escapeSpeed,
                    y: normalizedVelocity.y * escapeSpeed
                });
            }

            // Update last ball position
            counter.lastBallPosition = { ...window.game.ball.position };
        }
    } else {
        // Update last ball position if AI is not touching the ball
        if (currentTime - counter.lastHitTime > 1000) {
            counter.lastBallPosition = { ...window.game.ball.position };
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
        if (window.game.ball.position.y < FIELD_HEIGHT / 2) {
            // Ball is in AI's half, push toward center but not past the buffer
            targetY = Math.min(FIELD_HEIGHT / 2 - MIDDLE_LINE_BUFFER, window.game.ball.position.y);
        } else {
            // Ball is in player's half, push toward center
            targetY = FIELD_HEIGHT / 2;
        }

        const toCenter = {
            x: FIELD_WIDTH / 2 - window.game.ball.position.x,
            y: targetY - window.game.ball.position.y
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
        if (window.game.ball.position.y > AI_MAX_Y) {
            // Create a modified target that's at the same x as the ball but at a safe y
            const safeTarget = {
                x: window.game.ball.position.x,
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

// Normal AI behavior when ball is not stuck
function normalAIBehavior() {
    // Define a buffer zone from the middle line
    const MIDDLE_LINE_BUFFER = 40; // Pixels to stay away from the middle line
    const AI_MAX_Y = FIELD_HEIGHT / 2 - MIDDLE_LINE_BUFFER;

    // Check if AI is too close to the middle line
    const isTooCloseToMiddle = window.game.player2.position.y > AI_MAX_Y;

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
        // For example, position between the ball and the goal
        const goalPosition = { x: FIELD_WIDTH / 2, y: GOAL_TOP + GOAL_HEIGHT / 2 };
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
function keepBallInBounds() {
    Events.on(window.game.engine, 'afterUpdate', function() {
        if (!window.game.ball) return;

        // Check if ball is stuck in a corner
        checkAndFixCornerStuck();

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

        // Check horizontal bounds
        if (window.game.ball.position.x < WALL_THICKNESS + BALL_RADIUS) {
            Body.setPosition(window.game.ball, {
                x: WALL_THICKNESS + BALL_RADIUS,
                y: window.game.ball.position.y
            });

            // Get current velocity
            const velocity = window.game.ball.velocity;
            const speed = window.game.ball2D ? window.game.ball2D.currentSpeed : Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);

            // Reflect the x component but maintain constant speed
            const normalizedVelocity = {
                x: Math.abs(velocity.x) / Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y),
                y: velocity.y / Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y)
            };

            Body.setVelocity(window.game.ball, {
                x: normalizedVelocity.x * speed,
                y: normalizedVelocity.y * speed
            });
        } else if (window.game.ball.position.x > FIELD_WIDTH - WALL_THICKNESS - BALL_RADIUS) {
            Body.setPosition(window.game.ball, {
                x: FIELD_WIDTH - WALL_THICKNESS - BALL_RADIUS,
                y: window.game.ball.position.y
            });

            // Get current velocity
            const velocity = window.game.ball.velocity;
            const speed = window.game.ball2D ? window.game.ball2D.currentSpeed : Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);

            // Reflect the x component but maintain constant speed
            const normalizedVelocity = {
                x: -Math.abs(velocity.x) / Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y),
                y: velocity.y / Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y)
            };

            Body.setVelocity(window.game.ball, {
                x: normalizedVelocity.x * speed,
                y: normalizedVelocity.y * speed
            });
        }

        // Check vertical bounds (excluding goal areas)
        const isInGoalArea = (
            window.game.ball.position.x > FIELD_WIDTH / 2 - GOAL_WIDTH / 2 &&
            window.game.ball.position.x < FIELD_WIDTH / 2 + GOAL_WIDTH / 2
        );

        if (!isInGoalArea) {
            if (window.game.ball.position.y < WALL_THICKNESS + BALL_RADIUS) {
                Body.setPosition(window.game.ball, {
                    x: window.game.ball.position.x,
                    y: WALL_THICKNESS + BALL_RADIUS
                });

                // Get current velocity
                const velocity = window.game.ball.velocity;
                const speed = window.game.ball2D ? window.game.ball2D.currentSpeed : Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);

                // Reflect the y component but maintain constant speed
                const normalizedVelocity = {
                    x: velocity.x / Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y),
                    y: Math.abs(velocity.y) / Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y)
                };

                Body.setVelocity(window.game.ball, {
                    x: normalizedVelocity.x * speed,
                    y: normalizedVelocity.y * speed
                });
            } else if (window.game.ball.position.y > FIELD_HEIGHT - WALL_THICKNESS - BALL_RADIUS) {
                Body.setPosition(window.game.ball, {
                    x: window.game.ball.position.x,
                    y: FIELD_HEIGHT - WALL_THICKNESS - BALL_RADIUS
                });

                // Get current velocity
                const velocity = window.game.ball.velocity;
                const speed = window.game.ball2D ? window.game.ball2D.currentSpeed : Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);

                // Reflect the y component but maintain constant speed
                const normalizedVelocity = {
                    x: velocity.x / Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y),
                    y: -Math.abs(velocity.y) / Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y)
                };

                Body.setVelocity(window.game.ball, {
                    x: normalizedVelocity.x * speed,
                    y: normalizedVelocity.y * speed
                });
            }
        }
    });
}

// Check if ball is stuck in a corner and fix it
function checkAndFixCornerStuck() {
    if (!window.game.ball) return;

    // Track how long the ball has been stuck
    if (!window.game.stuckTimer) {
        window.game.stuckTimer = {
            isStuck: false,
            startTime: 0,
            position: { x: 0, y: 0 }
        };
    }

    const ball = window.game.ball;
    const cornerThreshold = BALL_RADIUS * 1.5; // Reduced threshold - only detect when very close to corner
    const speed = window.game.ball2D ? window.game.ball2D.currentSpeed : 5;

    // Check if ball has moved significantly
    const stuckTimer = window.game.stuckTimer;
    const currentTime = Date.now();
    const distMoved = Math.sqrt(
        Math.pow(ball.position.x - stuckTimer.position.x, 2) +
        Math.pow(ball.position.y - stuckTimer.position.y, 2)
    );

    // If ball hasn't moved much in the last 2 seconds, consider it stuck
    if (distMoved < BALL_RADIUS && stuckTimer.isStuck && currentTime - stuckTimer.startTime > 2000) {
        console.log("Ball hasn't moved for 1 second, applying stronger fix...");

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
    if (currentSpeed < 0.5 && window.game.ball2D) {

        // Give the ball a random direction
        const randomAngle = Math.random() * Math.PI * 2;
        Body.setVelocity(ball, {
            x: Math.cos(randomAngle) * window.game.ball2D.currentSpeed,
            y: Math.sin(randomAngle) * window.game.ball2D.currentSpeed
        });
        return true;
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
            const speed = window.game.ball2D ? window.game.ball2D.currentSpeed : 5;
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
    if (!window.game.ball) return;

    // Visual size for the ball (smaller than hitbox)
    const visualRadius = 10;

    // Get ball position
    const ballPos = window.game.ball.position;

    // Update 2D textured ball if available
    if (window.game.ball2D) {
        window.game.ball2D.updatePosition(ballPos.x, ballPos.y, window.game.ball.velocity);

        // Hide default ball overlay when using textured 2D ball
        const ballOverlay = document.querySelector('.ball-overlay');
        if (ballOverlay) {
            ballOverlay.style.display = 'none';
        }
    }

    // Update 2D ball overlay if it exists
    const ballOverlay = document.querySelector('.ball-overlay');
    if (ballOverlay) {
        // Position updates still happen even if hidden
        ballOverlay.style.left = `${ballPos.x - visualRadius - 5}px`;
        ballOverlay.style.top = `${ballPos.y - visualRadius - 5}px`;
        ballOverlay.style.width = `${visualRadius * 2 + 10}px`;
        ballOverlay.style.height = `${visualRadius * 2 + 10}px`;

        // Add rotation based on ball angular velocity
        const angle = window.game.ball.angle * (180 / Math.PI);
        ballOverlay.style.transform = `rotate(${angle}deg)`;

        // Add visual effects based on ball speed
        const speed = Vector.magnitude(window.game.ball.velocity);
        if (speed > 15) {
            ballOverlay.classList.add('ball-fast');
        } else {
            ballOverlay.classList.remove('ball-fast');
        }
    }

    // Update ball shadow position
    const ballShadow = document.querySelector('.ball-shadow');
    if (ballShadow) {
        ballShadow.style.left = `${ballPos.x - visualRadius - 5}px`;
        ballShadow.style.top = `${ballPos.y + 5}px`;
        ballShadow.style.width = `${visualRadius * 2 + 10}px`;

        // Scale shadow based on ball height (simulated by speed)
        const speed = Vector.magnitude(window.game.ball.velocity);

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
    const ballTrail = document.querySelector('.ball-trail');
    if (ballTrail) {
        // Calculate trail position based on velocity
        if (window.game.lastBallPosition) {
            const trailX = window.game.lastBallPosition.x;
            const trailY = window.game.lastBallPosition.y;
            ballTrail.style.left = `${trailX - visualRadius - 5}px`;
            ballTrail.style.top = `${trailY - visualRadius - 5}px`;
            ballTrail.style.width = `${visualRadius * 2 + 10}px`;
            ballTrail.style.height = `${visualRadius * 2 + 10}px`;
        }

        // Show trail based on ball velocity
        const speed = Vector.magnitude(window.game.ball.velocity);

        // Remove/add visible class based on speed
        if (speed > 5) {
            ballTrail.classList.add('visible');
            ballTrail.style.transform = `scale(${1 + speed / 30})`;
        } else {
            ballTrail.classList.remove('visible');
        }
    }

    // Update last ball position for next frame
    window.game.lastBallPosition = { ...window.game.ball.position };

    // Also update player visuals
    updatePlayerVisuals();
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
    window.game.gameActive = false;

    // Stop match background music
    stopSound(matchSound);

    // Clear intervals
    if (window.game.aiUpdateInterval) clearInterval(window.game.aiUpdateInterval);
    if (window.game.timerInterval) clearInterval(window.game.timerInterval);

    // Determine winner
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

    // Use the enhanced showEndScreen function
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
}

// Clean up resources when game is stopped
window.stopPhaserGame = function() {
    if (window.game) {
        // Stop all game audio
        try {
            if (matchSound) {
                matchSound.pause();
                matchSound.src = '';
            }
            if (kickSound) {
                kickSound.pause();
                kickSound.src = '';
            }
            if (goalSound) {
                goalSound.pause();
                goalSound.src = '';
            }
        } catch (e) {
            console.log("Audio cleanup error:", e);
        }

        // Clear intervals
        if (window.game.aiUpdateInterval) clearInterval(window.game.aiUpdateInterval);
        if (window.game.timerInterval) clearInterval(window.game.timerInterval);

        // Remove event listeners
        document.removeEventListener('keydown', function() {});
        document.removeEventListener('keyup', function() {});

        // Clean up 2D textured ball if it exists
        if (window.game.ball2D) {
            window.game.ball2D.dispose();
            window.game.ball2D = null;
        }

        // Reset the singleton instance
        if (typeof ball2DInstance !== 'undefined') {
            ball2DInstance = null;
        }

        // Stop renderer
        if (window.game.render) Render.stop(window.game.render);

        // Stop runner
        if (window.game.runner) Runner.stop(window.game.runner);

        // Clear engine
        if (window.game.engine) Engine.clear(window.game.engine);

        // Remove DOM elements
        document.querySelectorAll('.ball-overlay, .ball-shadow, .ball-trail, .boost-hint, .player, .ai-backoff-indicator, .ai-timeout-indicator').forEach(el => el.remove());

        // Reset audio initialized flag to ensure proper reinitialization
        audioInitialized = false;

        // Clear game object
        window.game = null;
    }
};

// Trigger camera flashes in the crowd
function triggerCrowdWave() {
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