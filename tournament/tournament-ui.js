// Tournament UI Module

// UI module for handling tournament visuals
window.tournamentUI = {
    // Initialize tournament UI
    initTournamentUI: function() {
    console.log("Initializing tournament UI");
    
        // Initialize flag copies container if it doesn't exist
        this.initFlagCopiesContainer();
        
        // Create flag copies for teams that have won matches
        this.createFlagCopies();
        
        // Ensure the container size adjusts to its content
        this.adjustContainerSize();
    },
    
    // Initialize the container for flag copies
    initFlagCopiesContainer: function() {
        // Check if container already exists
        let flagCopiesContainer = document.getElementById('flag-copies-container');
        if (!flagCopiesContainer) {
            flagCopiesContainer = document.createElement('div');
            flagCopiesContainer.id = 'flag-copies-container';
            flagCopiesContainer.className = 'flag-copies-container';
            
            // Add to bracket view
            const bracketView = document.querySelector('.bracket-view');
            if (bracketView) {
                bracketView.appendChild(flagCopiesContainer);
            }
        }
    },
    
    // Adjust container size to ensure scrolling works properly
    adjustContainerSize: function() {
        const bracketView = document.querySelector('.bracket-view');
        const tournament = window.tournamentData || {};
        
        if (!bracketView) return;
        
        // Default minimum height
        let minHeight = 650;
        
        // Adjust height based on visible stages
        if (tournament.currentStage === 'semiFinals' || tournament.currentStage === 'final') {
            minHeight = 750;
        } else if (tournament.currentStage === 'final' && tournament.champion) {
            minHeight = 800;
        }
        
        bracketView.style.minHeight = `${minHeight}px`;
    },
    
    // Create flag copies for all winners
    createFlagCopies: function() {
        // Clear existing flag copies
        this.clearFlagCopies();
        
        const tournamentData = window.tournamentData || {};
        
        // Create quarter-final winner flags
        if (tournamentData.knockout && tournamentData.knockout.quarterFinals) {
            tournamentData.knockout.quarterFinals.forEach((match, index) => {
                if (match.played && match.winner) {
                    this.createWinnerFlagCopy(match.winner, index, 'quarter', index >= 2);
                }
            });
        }
        
        // Create semi-final winner flags
        if (tournamentData.knockout && tournamentData.knockout.semiFinals) {
            tournamentData.knockout.semiFinals.forEach((match, index) => {
                if (match.played && match.winner) {
                    this.createWinnerFlagCopy(match.winner, index, 'semi', index === 1);
        }
    });
}

        // Create championship flag
        if (tournamentData.knockout && tournamentData.knockout.final && 
            tournamentData.knockout.final.played && tournamentData.knockout.final.winner) {
            this.createChampionFlagCopy(tournamentData.knockout.final.winner);
        }
        
        // Adjust the container size after creating flags
        this.adjustContainerSize();
    },
    
    // Create a copy of a winning team's flag
    createWinnerFlagCopy: function(team, matchIndex, stage, isRightSide) {
        if (!team) return;
        
        console.log(`Creating ${stage} winner flag copy for ${team.name} (match ${matchIndex})`);
        
        // Get container
        const container = document.getElementById('flag-copies-container');
        if (!container) return;
        
        // Create flag copy element
        const flagCopy = document.createElement('div');
        flagCopy.className = `flag-copy ${stage}-winner-${matchIndex}`;
        
        if (isRightSide) {
            flagCopy.classList.add('right-side');
        } else {
            flagCopy.classList.add('left-side');
        }
        
        // Add player team class if applicable
        if (team.isPlayer) {
            flagCopy.classList.add('player-team-copy');
        }
        
        // Set position based on stage and match index
        this.positionFlagCopy(flagCopy, stage, matchIndex, isRightSide);
        
        // Create the flag image
        const flagImage = document.createElement('div');
        flagImage.className = 'copy-flag';
        flagImage.style.backgroundImage = `url('../flags/${team.flag}.png')`;
        
        // Add team name
        const teamName = document.createElement('div');
        teamName.className = 'copy-team-name';
        teamName.textContent = team.name;
        
        // Append elements
        flagCopy.appendChild(flagImage);
        flagCopy.appendChild(teamName);
        container.appendChild(flagCopy);
    },
    
    // Create the champion flag copy
    createChampionFlagCopy: function(champion) {
        if (!champion) return;
        
        console.log(`Creating champion flag copy for ${champion.name}`);
        
        // Get container
        const container = document.getElementById('flag-copies-container');
        if (!container) return;
        
        // Create champion flag element
        const flagCopy = document.createElement('div');
        flagCopy.className = 'champion-flag-copy';
        
        // Add player team class if applicable
        if (champion.isPlayer) {
            flagCopy.classList.add('player-champion');
        }
        
        // Position in center of bracket
        flagCopy.style.top = '50%';
        flagCopy.style.left = '50%';
        flagCopy.style.transform = 'translate(-50%, -50%)';
        
        // Create the flag image
        const flagImage = document.createElement('div');
        flagImage.className = 'champion-flag';
        flagImage.style.backgroundImage = `url('../flags/${champion.flag}.png')`;
        
        // Add team name
        const teamName = document.createElement('div');
        teamName.className = 'champion-team-name';
        teamName.textContent = champion.name;
        
        // Add trophy icon
        const trophy = document.createElement('div');
        trophy.className = 'trophy-icon';
        trophy.innerHTML = '🏆';
        
        // Create champion message
        const championMsg = document.createElement('div');
        championMsg.className = 'champion-message';
        championMsg.textContent = champion.isPlayer ? 'You are the Champion!' : `${champion.name} is the Champion!`;
        
        // Append elements
        flagCopy.appendChild(trophy);
        flagCopy.appendChild(flagImage);
        flagCopy.appendChild(teamName);
        flagCopy.appendChild(championMsg);
        container.appendChild(flagCopy);
    },
    
    // Position flag copy based on stage and match index
    positionFlagCopy: function(flagCopy, stage, matchIndex, isRightSide) {
        // Default positions that can be adjusted
        let posX, posY;
        
        if (stage === 'quarter') {
            // Quarter-finals positions
            if (isRightSide) {
                // Right side of bracket
                if (matchIndex === 2) {
                    posX = '73%';
                    posY = '25%';
                } else {
                    posX = '73%';
                    posY = '75%';
                }
            } else {
                // Left side of bracket
                if (matchIndex === 0) {
                    posX = '27%';
                    posY = '25%';
                } else {
                    posX = '27%';
                    posY = '75%';
                }
            }
        } else if (stage === 'semi') {
            // Semi-finals positions
            if (isRightSide) {
                posX = '66%';
                posY = '50%';
            } else {
                posX = '34%';
                posY = '50%';
            }
        }
        
        // Apply positions
        flagCopy.style.left = posX;
        flagCopy.style.top = posY;
    },
    
    // Clear all flag copies
    clearFlagCopies: function() {
        const container = document.getElementById('flag-copies-container');
        if (container) {
            container.innerHTML = '';
        }
    },
    
    // Update UI when the tournament stage changes
    updateStageUI: function(newStage) {
        console.log(`Updating UI for stage: ${newStage}`);
        
        // Show/hide elements based on stage
        switch (newStage) {
            case 'quarterFinals':
                // Show quarter-finals
                document.querySelectorAll('.quarter-final').forEach(el => {
                    el.hidden = false;
                });
                break;
                
            case 'semiFinals':
                // Show semi-finals
                document.querySelectorAll('.left-Bracket-semi').forEach(el => {
                    el.hidden = false;
                });
                break;
                
            case 'final':
                // Show finals
                document.querySelectorAll('.left-Bracket-final, .right-Bracket-final').forEach(el => {
                    el.hidden = false;
                });
                break;
        }
        
        // Create flag copies for the updated stage
        this.createFlagCopies();
        
        // Adjust container size
        this.adjustContainerSize();
        
        // Scroll to the current stage
        if (typeof scrollToActiveStage === 'function') {
            setTimeout(scrollToActiveStage, 300);
        }
    }
};

// Add CSS for flag copies
function addFlagCopiesCSS() {
    const style = document.createElement('style');
    style.textContent = `
        .flag-copies-container {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 20;
        }
        
        .flag-copy {
            position: absolute;
            display: flex;
            flex-direction: column;
            align-items: center;
            transform: translate(-50%, -50%);
            pointer-events: auto;
            transition: all 0.3s ease;
            z-index: 20;
        }
        
        .copy-flag {
            width: 40px;
            height: 30px;
            background-size: cover;
            background-position: center;
            border: 2px solid #fff;
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
            transition: transform 0.3s ease;
        }
        
        .flag-copy:hover .copy-flag {
            transform: scale(1.2);
        }
        
        .copy-team-name {
            font-size: 12px;
            font-weight: bold;
            color: #fff;
            margin-top: 5px;
            text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
        }
        
        .player-team-copy .copy-flag {
            border-color: gold;
            box-shadow: 0 2px 15px rgba(255, 215, 0, 0.7);
        }
        
        .player-team-copy .copy-team-name {
            color: gold;
        }
        
        .champion-flag-copy {
            position: absolute;
            display: flex;
            flex-direction: column;
            align-items: center;
            z-index: 30;
            animation: champion-pulse 2s infinite alternate;
            pointer-events: auto;
        }
        
        .champion-flag {
            width: 60px;
            height: 45px;
            background-size: cover;
            background-position: center;
            border: 3px solid gold;
            border-radius: 8px;
            box-shadow: 0 0 20px rgba(255, 215, 0, 0.8);
        }
        
        .champion-team-name {
            font-size: 16px;
            font-weight: bold;
            color: gold;
            margin-top: 8px;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
        }
        
        .trophy-icon {
            font-size: 24px;
            margin-bottom: 5px;
            filter: drop-shadow(0 2px 5px rgba(0, 0, 0, 0.7));
        }
        
        .champion-message {
            font-size: 18px;
            font-weight: bold;
            color: white;
            margin-top: 12px;
            background-color: rgba(0, 0, 0, 0.6);
            padding: 8px 15px;
            border-radius: 20px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
            text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
            border: 1px solid gold;
        }
        
        @keyframes champion-pulse {
            0% {
                transform: translate(-50%, -50%) scale(1);
            }
            100% {
                transform: translate(-50%, -50%) scale(1.1);
            }
        }
    `;
    
    document.head.appendChild(style);
}

// Add CSS for flag copies when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    addFlagCopiesCSS();
    
    // Initialize tournament UI
    if (window.tournamentUI) {
        window.tournamentUI.initTournamentUI();
    }
    
    // Listen for tournament stage changes
    document.addEventListener('tournamentStageChanged', function(e) {
        if (window.tournamentUI && e.detail && e.detail.newStage) {
            window.tournamentUI.updateStageUI(e.detail.newStage);
        }
    });
}); 