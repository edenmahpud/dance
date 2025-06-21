// Keyboard controls and movement logic
export const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    ' ': false, // Spacebar for first character
    'a': false, // A key for second character
    'd': false, // D key for second character
    'w': false  // W key for second character dance
};

export function setupKeyboardControls(updateMovement) {
    window.addEventListener('keydown', (event) => {
        if (keys.hasOwnProperty(event.key)) {
            keys[event.key] = true;
            updateMovement();
        }
    });

    window.addEventListener('keyup', (event) => {
        if (keys.hasOwnProperty(event.key)) {
            keys[event.key] = false;
            updateMovement();
        }
    });
}

export function onDanceFinished(mixer, danceAction, walkAction, model) {
    // Reset dancing state
    model.isDancing = false;
    
    // Ensure character faces forward
    model.rotation.y = 0;
    
    // Stop dance animation completely
    danceAction.stop();
    
    // Reset walk animation state
    walkAction.reset();
    
    // Clear any remaining animation weights
    mixer.stopAllAction();
}

export function onWindDanceFinished(windMixer, windDanceAction, windWalkAction, windModel) {
    // Reset dancing state
    windModel.isDancing = false;
    
    // Ensure character faces forward
    windModel.rotation.y = 0;
    
    // Stop dance animation completely
    windDanceAction.stop();
    
    // Reset walk animation state
    windWalkAction.reset();
    
    // Don't stop all actions, just the dance action
    windDanceAction.fadeOut(0.2);

    // Ensure progress bar is fully filled
    const progressBar = document.getElementById('wind-progress-bar');
    if (progressBar) {
        progressBar.style.width = '84%';
    }
}

// Function to update progress bar
function updateWindProgressBar(currentTime, duration) {
    const progressBar = document.getElementById('wind-progress-bar');
    if (progressBar) {
        const progress = (currentTime / duration) * 84; // Max width is 84% of container
        progressBar.style.width = `${progress}%`;
    }
}

export function updateMovement(model, windModel, mixer, windMixer, walkAction, windWalkAction, windDanceAction, moveSpeed, screenBoundaries) {
    const wasMoving = model.isMoving;
    const wasWindMoving = windModel.isWindMoving;
    
    // Handle first character movement
    if (!model.isDancing) {
        model.isMoving = keys.ArrowLeft || keys.ArrowRight;
        model.moveDirection = keys.ArrowRight ? 1 : keys.ArrowLeft ? -1 : 0;
        
        if (model) {
            // Update rotation based on movement direction
            if (model.isMoving) {
                model.rotation.y = model.moveDirection === 1 ? Math.PI / 2 : -Math.PI / 2;
            } else {
                model.rotation.y = 0;
            }
            
            // Handle animation transitions
            if (model.isMoving && !wasMoving) {
                walkAction.reset();
                walkAction.fadeIn(0.2);
                walkAction.play();
            } else if (!model.isMoving && wasMoving) {
                walkAction.fadeOut(0.2);
            }
        }
    }
    
    // Handle wind character movement
    if (!windModel.isDancing) {
        windModel.isWindMoving = keys['a'] || keys['d'];
        windModel.windMoveDirection = keys['d'] ? 1 : keys['a'] ? -1 : 0;
        
        if (windModel) {
            // Update rotation based on movement direction
            if (windModel.isWindMoving) {
                // When moving right, face right (90 degrees)
                // When moving left, face left (-90 degrees)
                windModel.rotation.y = windModel.windMoveDirection === 1 ? Math.PI / 2 : -Math.PI / 2;
            } else {
                // When idle, face the camera (0 degrees)
                windModel.rotation.y = 0;
            }
            
            // Handle animation transitions
            if (windModel.isWindMoving && !wasWindMoving) {
                windWalkAction.reset();
                windWalkAction.fadeIn(0.2);
                windWalkAction.play();
            } else if (!windModel.isWindMoving && wasWindMoving) {
                windWalkAction.fadeOut(0.2);
            }
        }
    }
    
    // Handle wind character dance
    if (keys['w'] && windModel && windDanceAction) {
        // If animation hasn't started yet, initialize it
        if (!windModel.isDancing) {
            console.log('Initializing wind dance animation');
            windModel.isDancing = true;
            windModel.isWindMoving = false;
            
            if (windWalkAction.isRunning()) {
                windWalkAction.fadeOut(0.2);
            }
            
            // Reset progress bar to 20%
            const progressFill = document.getElementById('progress-fill');
            if (progressFill) {
                progressFill.style.width = '20%';
            }
            
            // During dance, face the camera
            windModel.rotation.y = 0;
            windDanceAction.reset();
            windDanceAction.fadeIn(0.2);
            windDanceAction.play();
            windDanceAction.paused = true; // Pause immediately after starting
        }
        
        // Advance animation by one frame (approximately 1/24th of a second)
        const frameTime = 1/24;
        const currentTime = windDanceAction.time;
        const clipDuration = windDanceAction.getClip().duration;
        
        // Update progress bar
        const progressFill = document.getElementById('progress-fill');
        if (progressFill) {
            // Calculate progress from 20% to 100%
            const progress = 20 + ((currentTime / clipDuration) * 80);
            progressFill.style.width = `${progress}%`;
        }
        
        // If we're at the end of the animation, loop back to start
        if (currentTime >= clipDuration) {
            windDanceAction.reset();
            windDanceAction.time = 0;
            // Reset progress bar to 20%
            if (progressFill) {
                progressFill.style.width = '20%';
            }
        } else {
            // Advance by one frame
            windDanceAction.time = Math.min(currentTime + frameTime, clipDuration);
        }
        
        // Update the animation mixer to reflect the new time
        windMixer.update(0);
    }
} 