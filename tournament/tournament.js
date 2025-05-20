// Tournament core functionality

// Tournament data structure
window.tournamentData = {
    currentStage: 'groupStage', // Can be 'groupStage', 'quarterFinals', 'semiFinals', 'final'
    playerTeam: null,
    knockout: {
        quarterFinals: [],
        semiFinals: [],
        final: null
    },
    // Available flags for the tournament
    availableFlags: [
        'argentina', 'belgium', 'brazil-', 'egypt',
        'china', 'france', 'germany', 'italy',
        'japan', 'poland', 'portugal', 'england',
        'palestine', 'united-kingdom', 'SaudiArabia', 'qatar'
    ]
};

// Initialize the tournament
function initTournament() {
    console.log("Initializing tournament");

    // Check if player has lost the tournament
    if (localStorage.getItem('tournamentLost') === 'true') {
        console.log("Player has lost the tournament - resetting tournament data");

        // Reset tournament data
        localStorage.removeItem('tournamentTeams');
        localStorage.removeItem('knockoutTeams');
        localStorage.removeItem('tournamentStage');
        localStorage.removeItem('hasVisitedTournament');
        localStorage.removeItem('currentMatch');
        localStorage.removeItem('lastMatchResult');
        localStorage.removeItem('tournamentLost');

        // Redirect to main menu
        window.location.href = '../index.html';
        return;
    }

    // Check if we're coming back from a match
    checkMatchResult();

    // Add click handler to the start tournament button
    const startButton = document.getElementById('start-tournament-btn');
    if (startButton) {
        startButton.addEventListener('click', handleStartButtonClick);
    }

    // Add click handler to the back button
    const backButton = document.getElementById('back-to-game-btn');
    if (backButton) {
        backButton.addEventListener('click', goBackToMainGame);
    }
}

// Handle start button click based on current stage
function handleStartButtonClick() {
    console.log("Start button clicked, current stage:", window.tournamentData.currentStage);

    if (window.tournamentData.currentStage === 'groupStage') {
        startFirstMatch();
    } else {
        playNextMatch();
    }
}

// Start the first match of the tournament
function startFirstMatch() {
    console.log("Starting first match");

    // Get player team from group A position 1
    const playerTeamElement = document.querySelector('.group-a-1 .team-flag');
    const opponentTeamElement = document.querySelector('.group-a-2 .team-flag');

    if (!playerTeamElement || !opponentTeamElement) {
        console.error("Could not find player or opponent team elements");
        return;
    }

    // Extract flag names from background image URLs
    const playerTeamMatch = playerTeamElement.style.backgroundImage.match(/url\(['"]?\.\.\/flags\/(.+?)\.png['"]?\)/);
    const opponentTeamMatch = opponentTeamElement.style.backgroundImage.match(/url\(['"]?\.\.\/flags\/(.+?)\.png['"]?\)/);

    if (!playerTeamMatch || !opponentTeamMatch) {
        console.error("Could not extract team flag names");
        return;
    }

    const playerTeam = playerTeamMatch[1];
    const opponentTeam = opponentTeamMatch[1];

    console.log(`Starting match: ${playerTeam} vs ${opponentTeam}`);

    // Store teams in localStorage for the game to access
    localStorage.setItem('playerTeam', playerTeam);
    localStorage.setItem('opponentTeam', opponentTeam);

    // Store current match info
    localStorage.setItem('currentMatch', JSON.stringify({
        stage: 'groupStage',
        matchIndex: 0,
        playerTeam,
        opponentTeam
    }));

    // Navigate to the game with tournament mode parameter
    window.location.href = '../index.html?mode=tournament&start=true';
}

// Play the next match in the tournament
function playNextMatch() {
    console.log("Playing next match");

    const currentStage = window.tournamentData.currentStage;
    let nextMatch = null;

    // Find next unplayed match based on current stage
    if (currentStage === 'quarterFinals') {
        nextMatch = window.tournamentData.knockout.quarterFinals.find(m => !m.played);
    } else if (currentStage === 'semiFinals') {
        nextMatch = window.tournamentData.knockout.semiFinals.find(m => !m.played);
    } else if (currentStage === 'final') {
        if (!window.tournamentData.knockout.final.played) {
            nextMatch = window.tournamentData.knockout.final;
        }
    }

    if (!nextMatch) {
        console.log("No more matches in current stage, advancing to next stage");
        advanceToNextStage();
        return;
    }

    console.log("Next match:", nextMatch);

    // Store teams in localStorage for the game to access
    localStorage.setItem('playerTeam', nextMatch.team1.flag);
    localStorage.setItem('opponentTeam', nextMatch.team2.flag);

    // Store current match info
    localStorage.setItem('currentMatch', JSON.stringify({
        stage: currentStage,
        matchIndex: getCurrentMatchIndex(nextMatch),
        playerTeam: nextMatch.team1.flag,
        opponentTeam: nextMatch.team2.flag
    }));

    // Navigate to the game with tournament mode parameter
    window.location.href = '../index.html?mode=tournament&start=true';
}

// Get the index of the current match
function getCurrentMatchIndex(match) {
    const currentStage = window.tournamentData.currentStage;

    if (currentStage === 'quarterFinals') {
        return window.tournamentData.knockout.quarterFinals.indexOf(match);
    } else if (currentStage === 'semiFinals') {
        return window.tournamentData.knockout.semiFinals.indexOf(match);
    }

    return 0;
}

// Advance to the next stage of the tournament
function advanceToNextStage() {
    const currentStage = window.tournamentData.currentStage;

    if (currentStage === 'groupStage') {
        window.tournamentData.currentStage = 'quarterFinals';
        createQuarterFinals();
    } else if (currentStage === 'quarterFinals') {
        window.tournamentData.currentStage = 'semiFinals';
        createSemiFinals();
    } else if (currentStage === 'semiFinals') {
        window.tournamentData.currentStage = 'final';
        createFinal();
    }

    // Update UI for new stage
    updateTournamentUI();

    // Save tournament data
    saveTournamentData();

    // Scroll to show the new stage
    scrollToActiveStage();
}

// Go back to the main game
function goBackToMainGame() {
    window.location.href = '../index.html';
}

// Check if we're returning from a match and process the result
function checkMatchResult() {
    // Get result from URL parameters if available
    const urlParams = new URLSearchParams(window.location.search);
    const playerScore = urlParams.get('playerScore');
    const opponentScore = urlParams.get('opponentScore');

    if (playerScore !== null && opponentScore !== null) {
        console.log(`Match result from URL: ${playerScore} - ${opponentScore}`);

        // Get match info from localStorage
        const matchInfo = JSON.parse(localStorage.getItem('currentMatch') || '{}');

        if (matchInfo.playerTeam && matchInfo.opponentTeam) {
            // Process the match result
            processMatchResult(
                matchInfo.playerTeam,
                matchInfo.opponentTeam,
                parseInt(playerScore),
                parseInt(opponentScore),
                matchInfo.stage,
                matchInfo.matchIndex
            );

            // Clear URL parameters
            window.history.replaceState({}, document.title, window.location.pathname);

            return true;
        }
    }

    // Try to load saved tournament data if no URL parameters
    return loadTournamentData();
}

// Process the result of a match
function processMatchResult(playerTeam, opponentTeam, playerScore, opponentScore, stage, matchIndex) {
    console.log(`Processing match result: ${playerTeam} ${playerScore} - ${opponentScore} ${opponentTeam}`);

    // Determine the winner
    const playerWon = playerScore > opponentScore;

    // Create winner object
    const winner = {
        flag: playerWon ? playerTeam : opponentTeam,
        name: getFlagName(playerWon ? playerTeam : opponentTeam),
        isPlayer: playerWon
    };

    console.log("Winner:", winner);

    // Update tournament data based on stage
    if (stage === 'groupStage') {
        // After first match, create quarter-finals
        window.tournamentData.currentStage = 'quarterFinals';
        createQuarterFinals(winner);
    } else if (stage === 'quarterFinals') {
        // Update quarter-final match result
        window.tournamentData.knockout.quarterFinals[matchIndex].played = true;
        window.tournamentData.knockout.quarterFinals[matchIndex].winner = winner;

        // Check if all quarter-finals are played
        if (window.tournamentData.knockout.quarterFinals.every(m => m.played)) {
            window.tournamentData.currentStage = 'semiFinals';
            createSemiFinals();
        }
    } else if (stage === 'semiFinals') {
        // Update semi-final match result
        window.tournamentData.knockout.semiFinals[matchIndex].played = true;
        window.tournamentData.knockout.semiFinals[matchIndex].winner = winner;

        // Check if all semi-finals are played
        if (window.tournamentData.knockout.semiFinals.every(m => m.played)) {
            window.tournamentData.currentStage = 'final';
            createFinal();
        }
    } else if (stage === 'final') {
        // Update final match result
        window.tournamentData.knockout.final.played = true;
        window.tournamentData.knockout.final.winner = winner;

        // Set champion
        window.tournamentData.champion = winner;
    }

    // Save tournament data
    saveTournamentData();

    // Update UI
    updateTournamentUI();

    // Scroll to show the current stage
    scrollToActiveStage();

    return true;
}

// Create quarter-finals matches
function createQuarterFinals(groupAWinner = null) {
    console.log("Creating quarter-finals matches");

    // Get teams from groups
    const groupA1 = {
        flag: document.querySelector('.group-a-1 .team-flag').style.backgroundImage.match(/url\(['"]?\.\.\/flags\/(.+?)\.png['"]?\)/)[1],
        name: document.querySelector('.group-a-1 .team-name').textContent,
        isPlayer: true
    };

    const groupA2 = {
        flag: document.querySelector('.group-a-2 .team-flag').style.backgroundImage.match(/url\(['"]?\.\.\/flags\/(.+?)\.png['"]?\)/)[1],
        name: document.querySelector('.group-a-2 .team-name').textContent
    };

    const groupB1 = {
        flag: document.querySelector('.group-b-1 .team-flag').style.backgroundImage.match(/url\(['"]?\.\.\/flags\/(.+?)\.png['"]?\)/)[1],
        name: document.querySelector('.group-b-1 .team-name').textContent
    };

    const groupB2 = {
        flag: document.querySelector('.group-b-2 .team-flag').style.backgroundImage.match(/url\(['"]?\.\.\/flags\/(.+?)\.png['"]?\)/)[1],
        name: document.querySelector('.group-b-2 .team-name').textContent
    };

    const groupC1 = {
        flag: document.querySelector('.group-c-1 .team-flag').style.backgroundImage.match(/url\(['"]?\.\.\/flags\/(.+?)\.png['"]?\)/)[1],
        name: document.querySelector('.group-c-1 .team-name').textContent
    };

    const groupC2 = {
        flag: document.querySelector('.group-c-2 .team-flag').style.backgroundImage.match(/url\(['"]?\.\.\/flags\/(.+?)\.png['"]?\)/)[1],
        name: document.querySelector('.group-c-2 .team-name').textContent
    };

    const groupD1 = {
        flag: document.querySelector('.group-d-1 .team-flag').style.backgroundImage.match(/url\(['"]?\.\.\/flags\/(.+?)\.png['"]?\)/)[1],
        name: document.querySelector('.group-d-1 .team-name').textContent
    };

    const groupD2 = {
        flag: document.querySelector('.group-d-2 .team-flag').style.backgroundImage.match(/url\(['"]?\.\.\/flags\/(.+?)\.png['"]?\)/)[1],
        name: document.querySelector('.group-d-2 .team-name').textContent
    };

    // Create quarter-finals matches
    window.tournamentData.knockout.quarterFinals = [
        { team1: groupA1, team2: groupB2, played: groupAWinner ? true : false, winner: groupAWinner },
        { team1: groupB1, team2: groupA2, played: false, winner: null },
        { team1: groupC1, team2: groupD2, played: false, winner: null },
        { team1: groupD1, team2: groupC2, played: false, winner: null }
    ];

    // Make quarter-finals visible
    const quarterFinalElement = document.querySelector('.quarter-final');
    if (quarterFinalElement) {
        quarterFinalElement.hidden = false;
    }

    console.log("Quarter-finals created");
}

// Create semi-finals matches
function createSemiFinals() {
    console.log("Creating semi-finals matches");

    // Get quarter-finals winners
    const qf1Winner = window.tournamentData.knockout.quarterFinals[0].winner;
    const qf2Winner = window.tournamentData.knockout.quarterFinals[1].winner;
    const qf3Winner = window.tournamentData.knockout.quarterFinals[2].winner;
    const qf4Winner = window.tournamentData.knockout.quarterFinals[3].winner;

    // Create semi-finals matches
    window.tournamentData.knockout.semiFinals = [
        { team1: qf1Winner, team2: qf2Winner, played: false, winner: null },
        { team1: qf3Winner, team2: qf4Winner, played: false, winner: null }
    ];

    // Make semi-finals visible
    const semiFinalElements = document.querySelectorAll('.left-Bracket-semi');
    semiFinalElements.forEach(el => {
        el.hidden = false;
    });

    console.log("Semi-finals created");
}

// Create final match
function createFinal() {
    console.log("Creating final match");

    // Get semi-finals winners
    const sf1Winner = window.tournamentData.knockout.semiFinals[0].winner;
    const sf2Winner = window.tournamentData.knockout.semiFinals[1].winner;

    // Create final match
    window.tournamentData.knockout.final = {
        team1: sf1Winner,
        team2: sf2Winner,
        played: false,
        winner: null
    };

    // Make finals visible
    const finalElements = document.querySelectorAll('.left-Bracket-final, .right-Bracket-final');
    finalElements.forEach(el => {
        el.hidden = false;
    });

    console.log("Final created");
}

// Update tournament UI based on current stage
function updateTournamentUI() {
    const currentStage = window.tournamentData.currentStage;
    console.log("Updating UI for stage:", currentStage);

    // Update button text
    updateButtonText();

    // Update visibility of stages
    if (currentStage === 'quarterFinals' || currentStage === 'semiFinals' || currentStage === 'final') {
        const quarterFinalElement = document.querySelector('.quarter-final');
        if (quarterFinalElement) quarterFinalElement.hidden = false;
    }

    if (currentStage === 'semiFinals' || currentStage === 'final') {
        const semiFinalElements = document.querySelectorAll('.left-Bracket-semi');
        semiFinalElements.forEach(el => el.hidden = false);
    }

    if (currentStage === 'final') {
        const finalElements = document.querySelectorAll('.left-Bracket-final, .right-Bracket-final');
        finalElements.forEach(el => el.hidden = false);
    }

    // Update match results displays
    updateMatchResults();

    // Trigger tournament stage changed event
    const event = new CustomEvent('tournamentStageChanged', {
        detail: { newStage: currentStage }
    });
    document.dispatchEvent(event);
}

// Update button text based on current stage
function updateButtonText() {
    const button = document.getElementById('start-tournament-btn');
    if (!button) return;

    const currentStage = window.tournamentData.currentStage;

    switch (currentStage) {
        case 'groupStage':
            button.textContent = 'Start Tournament';
            break;
        case 'quarterFinals':
            button.textContent = 'Play Next Quarter-Final';
            break;
        case 'semiFinals':
            button.textContent = 'Play Next Semi-Final';
            break;
        case 'final':
            if (window.tournamentData.knockout.final && window.tournamentData.knockout.final.played) {
                button.textContent = 'New Tournament';
            } else {
                button.textContent = 'Play Final';
            }
            break;
    }
}

// Update match results in the UI
function updateMatchResults() {
    // Update quarter-finals results
    if (window.tournamentData.knockout.quarterFinals) {
        // Update UI for quarter-finals results
        // Left bracket quarter-finals
        updateTeamDisplay('.left-match-1-team-1', window.tournamentData.knockout.quarterFinals[0].team1);
        updateTeamDisplay('.left-match-1-team-2', window.tournamentData.knockout.quarterFinals[0].team2);
        updateTeamDisplay('.left-match-2-team-1', window.tournamentData.knockout.quarterFinals[1].team1);
        updateTeamDisplay('.left-match-2-team-2', window.tournamentData.knockout.quarterFinals[1].team2);

        // Right bracket quarter-finals
        updateTeamDisplay('.right-match-1-team-1', window.tournamentData.knockout.quarterFinals[2].team1);
        updateTeamDisplay('.right-match-1-team-2', window.tournamentData.knockout.quarterFinals[2].team2);
        // Note: Right match 2 team selectors might need correction based on HTML structure
    }

    // Update semi-finals results if available
    if (window.tournamentData.knockout.semiFinals && window.tournamentData.knockout.semiFinals.length > 0) {
        // Update UI for semi-finals results
        // This would need to be updated with the correct selectors
    }

    // Update final results if available
    if (window.tournamentData.knockout.final) {
        // Update UI for final results
        // This would need to be updated with the correct selectors
    }
}

// Scroll to active tournament stage
function scrollToActiveStage() {
    const currentStage = window.tournamentData.currentStage;
    const container = document.querySelector('.bracket-overlay-container');

    if (!container) return;

    let targetElement;

    switch (currentStage) {
        case 'quarterFinals':
            targetElement = document.querySelector('.quarter-final');
            break;
        case 'semiFinals':
            targetElement = document.querySelector('.left-Bracket-semi');
            break;
        case 'final':
            targetElement = document.querySelector('.final-progression');
            break;
        default:
            targetElement = document.querySelector('.groupA');
    }

    if (targetElement) {
        // Calculate the target scroll position to center the element
        const elementRect = targetElement.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const scrollTarget = elementRect.top + container.scrollTop - (containerRect.height / 2) + (elementRect.height / 2);

        // Scroll to the target position smoothly
        container.scrollTo({
            top: scrollTarget,
            behavior: 'smooth'
        });
    }
}

// Update team display in UI
function updateTeamDisplay(selector, team) {
    if (!team) return;

    const teamContainers = document.querySelectorAll(selector);
    teamContainers.forEach(container => {
        // Update flag
        const flagImg = container.querySelector('[class*="-flag"] img');
        if (flagImg) {
            flagImg.src = `../flags/${team.flag}.png`;
            flagImg.alt = team.name;
        }

        // Update name
        const nameEl = container.querySelector('[class*="-name"]');
        if (nameEl) {
            nameEl.textContent = team.name;
        }

        // Highlight if player team
        if (team.isPlayer) {
            container.classList.add('player-team');
        } else {
            container.classList.remove('player-team');
        }

        // Highlight if winner
        const match = findMatchByTeam(team);
        if (match && match.played && match.winner && match.winner.flag === team.flag) {
            container.classList.add('winner');
        } else {
            container.classList.remove('winner');
        }
    });
}

// Find match containing a specific team
function findMatchByTeam(team) {
    // Check quarter-finals
    for (const match of window.tournamentData.knockout.quarterFinals || []) {
        if ((match.team1 && match.team1.flag === team.flag) ||
            (match.team2 && match.team2.flag === team.flag)) {
            return match;
        }
    }

    // Check semi-finals
    for (const match of window.tournamentData.knockout.semiFinals || []) {
        if ((match.team1 && match.team1.flag === team.flag) ||
            (match.team2 && match.team2.flag === team.flag)) {
            return match;
        }
    }

    // Check final
    const final = window.tournamentData.knockout.final;
    if (final && ((final.team1 && final.team1.flag === team.flag) ||
                 (final.team2 && final.team2.flag === team.flag))) {
        return final;
    }

    return null;
}

// Helper function to get flag name abbreviation
function getFlagName(flag) {
    const flagNames = {
        'argentina': 'ARG',
        'belgium': 'BEL',
        'brazil-': 'BRA',
        'egypt': 'EGY',
        'china': 'CHN',
        'france': 'FRA',
        'germany': 'GER',
        'italy': 'ITA',
        'japan': 'JPN',
        'poland': 'POL',
        'portugal': 'POR',
        'england': 'ENG',
        'palestine': 'PAL',
        'united-kingdom': 'UK',
        'SaudiArabia': 'KSA',
        'qatar': 'QAT'
    };

    return flagNames[flag] || flag.substring(0, 3).toUpperCase();
}

// Save tournament data to localStorage
function saveTournamentData() {
    localStorage.setItem('tournamentData', JSON.stringify(window.tournamentData));
    console.log("Tournament data saved to localStorage");
}

// Load tournament data from localStorage
function loadTournamentData() {
    const savedData = localStorage.getItem('tournamentData');
    if (savedData) {
        try {
            window.tournamentData = JSON.parse(savedData);
            console.log("Tournament data loaded from localStorage:", window.tournamentData);

            // Update UI to reflect loaded data
            updateTournamentUI();

            // Scroll to show the current stage
            setTimeout(scrollToActiveStage, 500);

            return true;
        } catch (e) {
            console.error("Error parsing tournament data:", e);
        }
    }
    return false;
}

// Initialize tournament when DOM is loaded
document.addEventListener('DOMContentLoaded', initTournament);