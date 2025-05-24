// Flag selection and UI logic only

const flags = [
    'argentina', 'belgium', 'brazil-', 'egypt',
    'china', 'france', 'germany', 'italy',
    'japan', 'poland', 'portugal', 'england',
    'spain', 'united-kingdom','SaudiArabia','qatar'
];

let player1Flag = null;
let player2Flag = null;
let score = [0, 0];
let gameTime = 60;
let gameTimer;

// Initialize the game when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    loadFlags();

    // Add tournament button to main menu
    const menuContainer = document.querySelector('.menu-buttons');
    if (menuContainer) {
        const tournamentButton = document.createElement('button');
        tournamentButton.textContent = 'Tournament';
        tournamentButton.className = 'menu-button tournament-button';
        tournamentButton.addEventListener('click', function() {
            window.location.href = 'tournament/tournament.html';
        });

        menuContainer.appendChild(tournamentButton);
    }

    // Check if we're in tournament mode and should start immediately
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    const start = urlParams.get('start');

    if (mode === 'tournament' && start === 'true') {
        // Get teams from localStorage
        const playerTeam = localStorage.getItem('playerTeam');
        const opponentTeam = localStorage.getItem('opponentTeam');

        if (playerTeam && opponentTeam) {
            console.log("Starting tournament match:", playerTeam, "vs", opponentTeam);

            // Set player flags
            player1Flag = playerTeam;
            player2Flag = opponentTeam;

            // Double check we're using the correct opponent
            console.log("Player 1 flag:", player1Flag);
            console.log("Player 2 flag:", player2Flag);

            // Start the match immediately
            startSingleMatch();
        } else {
            console.error("Tournament mode: Missing player or opponent team");
        }
    } else {
        // Normal game initialization
        document.getElementById('start-match').addEventListener('click', showTeamSelection);
    }

    // Always attach the play-again button event listener
    const playAgainButton = document.getElementById('play-again');
    if (playAgainButton) {
        console.log("Attaching event listener to play-again button");
        
        // Remove any existing event listeners to prevent duplicates
        const newButton = playAgainButton.cloneNode(true);
        playAgainButton.parentNode.replaceChild(newButton, playAgainButton);
        
        newButton.addEventListener('click', function() {
            console.log("Play again button clicked");
            
            // Check if we're in tournament mode
            const urlParams = new URLSearchParams(window.location.search);
            const mode = urlParams.get('mode');

            if (mode === 'tournament') {
                console.log("Tournament mode: checking result");

                // Get the final scores
                const player1Score = parseInt(document.getElementById('player1-score').textContent);
                const player2Score = parseInt(document.getElementById('player2-score').textContent);

                // Check if player won
                const playerWon = player1Score > player2Score;

                if (!playerWon) {
                    // Player lost - reset tournament and go back to main menu
                    console.log("Player lost in tournament - returning to main menu");

                    // Reset tournament data to ensure progression stops
                    localStorage.removeItem('tournamentTeams');
                    localStorage.removeItem('knockoutTeams');
                    localStorage.removeItem('tournamentStage');
                    localStorage.removeItem('hasVisitedTournament');
                    localStorage.removeItem('currentMatch');
                    localStorage.removeItem('lastMatchResult');

                    // Set a flag to indicate player has lost
                    localStorage.setItem('tournamentLost', 'true');

                    // Update the button text to "Leave" in Arabic
                    const playAgainButton = document.getElementById('play-again');
                    if (playAgainButton) {
                        playAgainButton.textContent = "مغادرة"; // Arabic word for "Leave"
                    }

                    // Go back to main menu
                    window.location.href = 'index.html';
                    return;
                }

                // If player won, proceed with tournament
                const playerTeam = localStorage.getItem('playerTeam');
                const opponentTeam = localStorage.getItem('opponentTeam');

                if (playerTeam && opponentTeam) {
                    // Create match result object
                    const matchResult = {
                        playerTeam: playerTeam,
                        opponentTeam: opponentTeam,
                        playerScore: player1Score,
                        opponentScore: player2Score,
                        timestamp: Date.now()
                    };

                    console.log("Saving match result to localStorage:", matchResult);
                    localStorage.setItem('lastMatchResult', JSON.stringify(matchResult));

                    // Redirect back to tournament page with scores in URL
                    window.location.href = 'tournament/tournament.html?playerScore=' + player1Score + '&opponentScore=' + player2Score;
                } else {
                    console.error("Missing player or opponent team in localStorage");
                    window.location.href = 'tournament/tournament.html';
                }
            } else {
                // Normal game mode: reset the game
                resetGame();
            }
        });
    } else {
        console.error("Could not find play-again button");
    }
});

function loadFlags() {
    const flagsGrid1 = document.getElementById('flags-grid-1');
    // Clear existing flags (if any)
    flagsGrid1.innerHTML = '';

    flags.forEach(flag => {
        const flagOption1 = document.createElement('div');
        flagOption1.className = 'flag-option';
        flagOption1.style.backgroundImage = `url('flags/${flag}.png')`;
        flagOption1.dataset.flag = flag;
        flagOption1.addEventListener('click', function() {
            selectFlag(this, 1);
        });
        flagsGrid1.appendChild(flagOption1);
    });
}

function toggleFlagsGrid(gridId) {
    const grid = document.getElementById(gridId);
    grid.style.display = grid.style.display === 'none' || grid.style.display === '' ? 'grid' : 'none';
}

function selectFlag(flagElement, playerNum) {
    const grid = flagElement.parentElement;
    grid.querySelectorAll('.flag-option').forEach(flag => {
        flag.classList.remove('selected');
    });
    flagElement.classList.add('selected');
    const flagName = flagElement.dataset.flag;
    player1Flag = flagName;

    console.log("Flag selected:", flagName);

    // Store the selected flag in localStorage for tournament use
    localStorage.setItem('playerTeam', flagName);

    // Update buttons based on selection
    updateGameButtons();
}

// Show team selection after clicking the orange button
function showTeamSelection() {
    console.log("Showing team selection");

    // Show the team selection card
    const teamSelectCard = document.querySelector('.team-select-card');
    if (teamSelectCard) {
        teamSelectCard.style.display = 'flex';
        console.log("Team select card displayed");
    } else {
        console.error("Team select card not found!");
    }

    // Hide the start image container
    const startScreenContent = document.querySelector('.start-screen-content');
    if (startScreenContent) {
        startScreenContent.style.display = 'none';
        console.log("Start screen content hidden");
    } else {
        console.error("Start screen content not found!");
    }

    // Create buttons for single match or tournament
    const buttonContainer = document.getElementById('start-game-button-container');
    if (buttonContainer) {
        buttonContainer.innerHTML = '';

        // Create single match button
        const singleMatchButton = document.createElement('button');
        singleMatchButton.id = 'single-match-button';
        singleMatchButton.className = 'button';
        singleMatchButton.textContent = 'Single Match';
        singleMatchButton.disabled = true; // Disable by default until a team is selected
        singleMatchButton.style.opacity = '0.5'; // Make it appear disabled
        singleMatchButton.style.cursor = 'not-allowed';
        singleMatchButton.addEventListener('click', startSingleMatch);

        // Create tournament button
        const tournamentButton = document.createElement('button');
        tournamentButton.id = 'tournament-button';
        tournamentButton.className = 'button';
        tournamentButton.textContent = 'Tournament';
        tournamentButton.disabled = true; // Disable by default until a team is selected
        tournamentButton.style.opacity = '0.5'; // Make it appear disabled
        tournamentButton.style.cursor = 'not-allowed';
        tournamentButton.addEventListener('click', startTournament);

        // Add buttons to container
        buttonContainer.appendChild(singleMatchButton);
        buttonContainer.appendChild(tournamentButton);

        // Add a prompt message to instruct the player to select a team
        const promptMessage = document.createElement('div');
        buttonContainer.appendChild(promptMessage);
    }
}

function startSingleMatch() {
    // Verify team selection
    if (!player1Flag) {
        alert('Please select a team first!');
        return;
    }

    // In tournament mode, use the stored opponent
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');

    if (mode === 'tournament') {
        // Use the opponent that was already set
        player2Flag = localStorage.getItem('opponentTeam') || player2Flag;
    } else {
        // Normal mode - select random opponent
        const availableFlags = flags.filter(flag => flag !== player1Flag);
        player2Flag = availableFlags[Math.floor(Math.random() * availableFlags.length)];
    }

    window.selectedPlayerFlag = player1Flag;
    window.selectedOpponentFlag = player2Flag;

    // Update small flag displays
    document.getElementById('player1-flag-small').style.backgroundImage = `url('flags/${player1Flag}.png')`;
    document.getElementById('player2-flag-small').style.backgroundImage = `url('flags/${player2Flag}.png')`;

    // Update player info displays
    updatePlayerInfo(player1Flag, player2Flag);

    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'flex';

    // Start the game
    if (typeof window.startPhaserGame === 'function') {
        window.startPhaserGame();
        
        // Apply performance mode if enabled
        if (performanceModeEnabled) {
            setTimeout(enablePerformanceMode, 100); // Slight delay to ensure game is initialized
        }
    } else {
        console.error("startPhaserGame function not found!");
    }
}

function startTournament() {
    // Verify team selection
    if (!player1Flag) {
        alert('Please select a team first!');
        return;
    }

    // Store the selected player flag in localStorage to pass it to the tournament page
    localStorage.setItem('playerTeam', player1Flag);

    // Navigate to the tournament page
    window.location.href = 'tournament/tournament.html';
}

// Update function to enable/disable game buttons based on team selection
function updateGameButtons() {
    const singleMatchButton = document.getElementById('single-match-button');
    const tournamentButton = document.getElementById('tournament-button');
    const promptMessage = document.getElementById('team-selection-prompt');

    if (player1Flag) {
        // Enable buttons if a team is selected
        if (singleMatchButton) {
            singleMatchButton.disabled = false;
            singleMatchButton.style.opacity = '1';
            singleMatchButton.style.cursor = 'pointer';
        }

        if (tournamentButton) {
            tournamentButton.disabled = false;
            tournamentButton.style.opacity = '1';
            tournamentButton.style.cursor = 'pointer';
        }

        // Hide the prompt message
        if (promptMessage) {
            promptMessage.style.display = 'none';
        }
    } else {
        // Disable buttons if no team is selected
        if (singleMatchButton) {
            singleMatchButton.disabled = true;
            singleMatchButton.style.opacity = '0.5';
            singleMatchButton.style.cursor = 'not-allowed';
        }

        if (tournamentButton) {
            tournamentButton.disabled = true;
            tournamentButton.style.opacity = '0.5';
            tournamentButton.style.cursor = 'not-allowed';
        }

        // Show the prompt message
        if (promptMessage) {
            promptMessage.style.display = 'block';
        }
    }
}

// Create confetti for the end screen
function createConfetti() {
    const confettiContainer = document.querySelector('.confetti-container');
    if (!confettiContainer) return;

    confettiContainer.innerHTML = '';

    const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5',
                   '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4CAF50',
                   '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800', '#FF5722'];

    // Create 100 confetti pieces
    for (let i = 0; i < 100; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti-piece';

        // Random properties
        const color = colors[Math.floor(Math.random() * colors.length)];
        const size = Math.random() * 10 + 5; // 5-15px
        const left = Math.random() * 100; // 0-100%
        const spinDirection = Math.random() > 0.5 ? 'clockwise' : 'counterclockwise';
        const spinAmount = Math.random() * 360 + 360; // 360-720 degrees
        const fallDuration = Math.random() * 3 + 2; // 2-5s
        const fallDelay = Math.random() * 2; // 0-2s

        // Apply styles
        confetti.style.backgroundColor = color;
        confetti.style.width = `${size}px`;
        confetti.style.height = `${size}px`;
        confetti.style.left = `${left}%`;
        confetti.style.top = '-20px';
        confetti.style.position = 'absolute';
        confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
        confetti.style.opacity = Math.random() * 0.5 + 0.5; // 0.5-1

        // Apply animation
        confetti.style.animation = `
            confetti-fall ${fallDuration}s ease-in ${fallDelay}s forwards,
            confetti-${spinDirection} ${fallDuration / 2}s linear ${fallDelay}s infinite
        `;

        // Add to container
        confettiContainer.appendChild(confetti);
    }

    // Add the animation styles
    if (!document.getElementById('confetti-styles')) {
        const style = document.createElement('style');
        style.id = 'confetti-styles';
        style.textContent = `
            @keyframes confetti-fall {
                to { top: 100%; }
            }

            @keyframes confetti-clockwise {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }

            @keyframes confetti-counterclockwise {
                from { transform: rotate(0deg); }
                to { transform: rotate(-360deg); }
            }
        `;
        document.head.appendChild(style);
    }
}

// Show the end screen with winner information
function showEndScreen(winnerFlag, winnerText, finalScore) {
    // Set the winner flag
    const winnerFlagElement = document.getElementById('winner-flag');
    if (winnerFlagElement) {
        winnerFlagElement.style.backgroundImage = `url('flags/${winnerFlag}.png')`;
    }

    // Set the winner text
    const winnerTextElement = document.getElementById('winner-text');
    if (winnerTextElement) {
        winnerTextElement.textContent = winnerText;
    }

    // Set the final score
    const finalScoreElement = document.getElementById('final-score');
    if (finalScoreElement) {
        finalScoreElement.textContent = finalScore;
    }

    // Get the play-again button
    const playAgainButton = document.getElementById('play-again');
    if (playAgainButton) {
        // Check if we're in tournament mode
        const urlParams = new URLSearchParams(window.location.search);
        const mode = urlParams.get('mode');

        if (mode === 'tournament') {
            const tournamentStage = localStorage.getItem('tournamentStage');
            
            // Check if player won or lost
            const player1Score = parseInt(document.getElementById('player1-score').textContent);
            const player2Score = parseInt(document.getElementById('player2-score').textContent);
            const playerWon = player1Score > player2Score;

            // If player lost, show "Leave" in Arabic and set up direct handler
            if (!playerWon) {
                playAgainButton.textContent = 'مغادرة'; // Arabic word for "Leave"
                
                // Remove existing listeners and add direct handler for leaving
                const newButton = playAgainButton.cloneNode(true);
                playAgainButton.parentNode.replaceChild(newButton, playAgainButton);
                
                newButton.addEventListener('click', function() {
                    console.log("Tournament leave button clicked - redirecting to main menu");
                    window.location.href = 'index.html';
                });
            } else {
                // Player won - set appropriate button text based on current tournament stage
                if (tournamentStage === '0') {
                    playAgainButton.textContent = 'Quarter-Finals';
                } else if (tournamentStage === '1') {
                    playAgainButton.textContent = 'Semi-Finals';
                } else if (tournamentStage === '2') {
                    playAgainButton.textContent = 'Finals';
                } else if (tournamentStage === '3') {
                    playAgainButton.textContent = 'Tournament Complete';
                } else {
                    playAgainButton.textContent = 'Back to Tournament';
                }
                
                // Remove existing listeners and add handler to return to tournament page
                const newButton = playAgainButton.cloneNode(true);
                playAgainButton.parentNode.replaceChild(newButton, playAgainButton);
                
                newButton.addEventListener('click', function() {
                    console.log("Tournament progression button clicked - returning to tournament page");
                    
                    // Get teams for the previous match
                    const playerTeam = localStorage.getItem('playerTeam');
                    const opponentTeam = localStorage.getItem('opponentTeam');
                    
                    // Get the final scores
                    const player1Score = parseInt(document.getElementById('player1-score').textContent);
                    const player2Score = parseInt(document.getElementById('player2-score').textContent);
                    
                    // Create match result object
                    const matchResult = {
                        playerTeam: playerTeam,
                        opponentTeam: opponentTeam,
                        playerScore: player1Score,
                        opponentScore: player2Score,
                        timestamp: Date.now()
                    };
                    
                    console.log("Saving match result to localStorage:", matchResult);
                    localStorage.setItem('lastMatchResult', JSON.stringify(matchResult));
                    
                    // Redirect back to tournament page with scores in URL
                    const tournamentPath = 'tournament/tournament.html?playerScore=' + player1Score + '&opponentScore=' + player2Score;
                    console.log("Navigating to:", tournamentPath);
                    window.location.href = tournamentPath;
                });
            }
        } else {
            // For single match mode, always show "Leave" in both languages
            playAgainButton.textContent = 'Leave / مغادرة'; // "Leave" in English and Arabic
            
            // Remove any existing listeners and add one that goes to main menu
            const newButton = playAgainButton.cloneNode(true);
            playAgainButton.parentNode.replaceChild(newButton, playAgainButton);
            
            newButton.addEventListener('click', function() {
                console.log("Leave button clicked - returning to main menu");
                resetGame();
            });
        }
    }

    // Show the end screen
    document.getElementById('game-screen').style.display = 'none';
    document.getElementById('end-screen').style.display = 'flex';

    // Create confetti effect
    createConfetti();
}

function resetGame() {
    console.log("Resetting game state");
    
    // Reset game state
    score = [0, 0];
    gameTime = 60;

    // Clean up the game and audio resources first
    if (window.stopPhaserGame) {
        window.stopPhaserGame();
    }
    
    // Reset the score display
    document.getElementById('player1-score').textContent = "0";
    document.getElementById('player2-score').textContent = "0";
    document.getElementById('timer').textContent = "1:00";

    // Hide end screen
    document.getElementById('end-screen').style.display = 'none';

    // Check if we're in tournament mode
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');

    if (mode === 'tournament') {
        console.log("Returning to tournament page");

        // Determine the correct path to the tournament page
        // Check if we're in the main directory or in a subdirectory
        const currentPath = window.location.pathname;
        let tournamentPath;

        if (currentPath.includes('/index.html') || currentPath.endsWith('/')) {
            // We're in the main directory
            tournamentPath = 'tournament/tournament.html';
        } else if (currentPath.includes('/game.html')) {
            // We're in the game.html file
            tournamentPath = 'tournament/tournament.html';
        } else {
            // Fallback
            tournamentPath = '../tournament/tournament.html';
        }

        console.log("Navigating to:", tournamentPath);

        // Use setTimeout to allow audio cleanup to complete before navigation
        setTimeout(() => {
            // Go back to tournament
            window.location.href = tournamentPath;
        }, 100);
    } else {
        // For regular game mode, always return to main menu (start screen)
        console.log("Returning to main menu");
        document.getElementById('game-screen').style.display = 'none';
        document.getElementById('start-screen').style.display = 'flex';
        document.querySelector('.start-screen-content').style.display = 'flex';
        document.querySelector('.team-select-card').style.display = 'none';
    }
}

// Add this function to handle tournament match results
function handleTournamentMatchResult(playerScore, opponentScore) {
    console.log("Handling tournament match result:", playerScore, opponentScore);

    // Determine the winner
    const playerTeam = localStorage.getItem('playerTeam');
    const opponentTeam = localStorage.getItem('opponentTeam');
    const winnerTeam = playerScore > opponentScore ? playerTeam : opponentTeam;

    console.log("Match details - Player:", playerTeam, "Opponent:", opponentTeam, "Winner:", winnerTeam);

    // Store the match result
    const matchResult = {
        playerTeam: playerTeam,
        opponentTeam: opponentTeam,
        playerScore: playerScore,
        opponentScore: opponentScore,
        winnerTeam: winnerTeam
    };

    console.log("Saving match result to localStorage:", matchResult);
    localStorage.setItem('lastMatchResult', JSON.stringify(matchResult));

    // Show the end screen with the winner
    showEndScreen(
        winnerTeam,
        playerScore > opponentScore ? "You Win!" : "You Lose!",
        `${playerScore} - ${opponentScore}`
    );
}

// Make sure to call handleTournamentMatchResult when a tournament match ends
// This should be called from wherever the match result is determined

// Handle end of match in tournament mode
function handleTournamentMatchEnd(playerScore, opponentScore) {
    console.log("Tournament match ended:", playerScore, "-", opponentScore);

    // Get teams from localStorage
    const playerTeam = localStorage.getItem('playerTeam');
    const opponentTeam = localStorage.getItem('opponentTeam');

    if (!playerTeam || !opponentTeam) {
        console.error("Missing player or opponent team in localStorage");
        return;
    }

    // Create match result object
    const matchResult = {
        playerTeam: playerTeam,
        opponentTeam: opponentTeam,
        playerScore: playerScore,
        opponentScore: opponentScore,
        timestamp: Date.now()
    };

    console.log("Saving match result to localStorage:", matchResult);
    localStorage.setItem('lastMatchResult', JSON.stringify(matchResult));

    // Redirect back to tournament page with scores in URL
    window.location.href = 'tournament/tournament.html?playerScore=' + playerScore + '&opponentScore=' + opponentScore;
}

// Check if we're in tournament mode when the game ends
function checkTournamentMode() {
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');

    return mode === 'tournament';
}

// Add this to your game end function
function onGameEnd(playerScore, opponentScore) {
    // Check if we're in tournament mode
    if (checkTournamentMode()) {
        handleTournamentMatchEnd(playerScore, opponentScore);
    } else {
        // Normal game end handling
        showEndScreen(playerScore > opponentScore ? player1Flag : player2Flag,
                     playerScore > opponentScore ? "You Win!" : "You Lose!",
                     `${playerScore} - ${opponentScore}`);
    }
}

// Function to check URL parameters for game results
function checkTournamentResults() {
    const urlParams = new URLSearchParams(window.location.search);
    const playerScore = urlParams.get('playerScore');
    const opponentScore = urlParams.get('opponentScore');

    if (playerScore !== null && opponentScore !== null) {
        console.log("Tournament results found in URL:", playerScore, opponentScore);

        // We have game results, process them
        handleGameResult(parseInt(playerScore), parseInt(opponentScore));

        // Clear the parameters from the URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// Function to handle game results coming back from the match
function handleGameResult(playerScore, opponentScore) {
    console.log("Handling game result:", playerScore, opponentScore);

    // Process the result in the tournament system
    const success = processPlayerMatchResult(playerScore, opponentScore);

    if (success) {
        // Update the UI
        updateBracketUI();
        updateButtonText();

        // Show a message about the result
        const resultMessage = document.createElement('div');
        resultMessage.className = 'result-message';

        if (playerScore > opponentScore) {
            resultMessage.textContent = `You won ${playerScore}-${opponentScore}! Advancing to next round.`;
            resultMessage.classList.add('win');
        } else {
            resultMessage.textContent = `You lost ${playerScore}-${opponentScore}. Better luck next time!`;
            resultMessage.classList.add('loss');
        }

        document.body.appendChild(resultMessage);

        // Remove the message after a few seconds
        setTimeout(() => {
            resultMessage.remove();
        }, 5000);
    }
}

// Call this function when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check for tournament results in URL
    checkTournamentResults();
});

// Update timer function
function updateTimer() {
    gameTime--;
    updateTimerDisplay();

    // When time runs out
    if (gameTime <= 0) {
        handleGameEnd();
    }
}

// Function to handle game end
function handleGameEnd() {
    // Stop the game
    isGameActive = false;
    clearInterval(gameTimer);

    // Get final scores
    const player1Score = parseInt(document.getElementById('player1-score').textContent);
    const player2Score = parseInt(document.getElementById('player2-score').textContent);

    // Check if we're in tournament mode
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');

    if (mode === 'tournament') {
        console.log("Tournament mode: showing end screen");

        // Get teams from localStorage
        const playerTeam = localStorage.getItem('playerTeam');
        const opponentTeam = localStorage.getItem('opponentTeam');

        if (playerTeam && opponentTeam) {
            // Create match result object
            const matchResult = {
                playerTeam: playerTeam,
                opponentTeam: opponentTeam,
                playerScore: player1Score,
                opponentScore: player2Score,
                timestamp: Date.now()
            };

            console.log("Saving match result to localStorage:", matchResult);
            localStorage.setItem('lastMatchResult', JSON.stringify(matchResult));

            // Check if player won or lost
            const playerWon = player1Score > player2Score;

            // Show end screen with appropriate message
            const winnerFlag = playerWon ? playerTeam : opponentTeam;
            const winnerText = playerWon ? "You Win!" : "You Lose!";
            const finalScore = `${player1Score} - ${player2Score}`;

            // Show end screen
            showEndScreen(winnerFlag, winnerText, finalScore);

            // If player lost, reset tournament data immediately
            if (!playerWon) {
                console.log("Player lost tournament match - resetting tournament data");
                // Reset tournament data to ensure progression stops
                localStorage.removeItem('tournamentTeams');
                localStorage.removeItem('knockoutTeams');
                localStorage.removeItem('tournamentStage');
                localStorage.removeItem('hasVisitedTournament');
                localStorage.removeItem('currentMatch');
                localStorage.removeItem('lastMatchResult');
                localStorage.setItem('tournamentLost', 'true');
            }

            // Reattach "مغادرة" button event listener in case original listener isn't working
            const playAgainButton = document.getElementById('play-again');
            if (playAgainButton && !playerWon) {
                // Set button text to "مغادرة" (Leave in Arabic)
                playAgainButton.textContent = "مغادرة";
                
                // Remove existing listeners and add new one
                const newButton = playAgainButton.cloneNode(true);
                playAgainButton.parentNode.replaceChild(newButton, playAgainButton);
                
                newButton.addEventListener('click', function() {
                    console.log("Tournament leave button clicked");
                    window.location.href = 'index.html';
                });
            }
        } else {
            console.error("Missing player or opponent team in localStorage");
        }
    } else {
        // Normal game mode: show end screen
        const winnerFlag = player1Score > player2Score ? player1Flag : player2Flag;
        const winnerText = player1Score > player2Score ? "You Win!" : "You Lose!";
        const finalScore = `${player1Score} - ${player2Score}`;

        showEndScreen(winnerFlag, winnerText, finalScore);
    }
}

// Function to update player info (names, images)
function updatePlayerInfo(player1Flag, player2Flag) {
    // Format flag names to proper team names
    const formatTeamName = (flagName) => {
        // Remove any trailing dash
        let name = flagName.replace(/-$/, '');
        
        // Convert dash to space and capitalize each word
        name = name.replace(/-/g, ' ')
                   .split(' ')
                   .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                   .join(' ');
                   
        // Handle special cases
        if (name === 'United Kingdom') return 'UK';
        if (name === 'Saudiarabia') return 'Saudi Arabia';
        
        return name;
    };
    
    // Update player names
    const player1Name = formatTeamName(player1Flag);
    const player2Name = formatTeamName(player2Flag);
    
    // Update the DOM
    const player1NameEl = document.querySelector('.player1-info .player-name');
    const player2NameEl = document.querySelector('.player2-info .player-name');
    
    if (player1NameEl) player1NameEl.textContent = player1Name;
    if (player2NameEl) player2NameEl.textContent = player2Name;
    
    // Update player images if we have custom images for these teams
    // For now, use default styling from CSS
    const player1ImageEl = document.querySelector('.player1-image');
    const player2ImageEl = document.querySelector('.player2-image');
    
    // You could add custom player images here later
    // if (player1ImageEl) player1ImageEl.style.backgroundImage = `url('players/${player1Flag}.jpg')`;
    // if (player2ImageEl) player2ImageEl.style.backgroundImage = `url('players/${player2Flag}.jpg')`;
}

