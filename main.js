import * as THREE from 'three';
import { loadSunModel } from './sun.js';
import { loadWindModel } from './wind.js';
import { updateBackgroundColor, updateMaterialsColor, getBackgroundColor, colorGradient, getOpacityForPosition, updateSkyFade } from './background.js';
import { setupKeyboardControls, updateMovement, onDanceFinished, onWindDanceFinished } from './interactivity.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = null; // Keep scene background transparent

// Function to interpolate between two colors
function interpolateColor(color1, color2, factor) {
    const result = new THREE.Color();
    result.r = color1.r + (color2.r - color1.r) * factor;
    result.g = color1.g + (color2.g - color1.g) * factor;
    result.b = color1.b + (color2.b - color1.b) * factor;
    return result;
}

// Camera setup - using orthographic camera for no perspective distortion
const aspectRatio = window.innerWidth / window.innerHeight;
const cameraHeight = 12;
const cameraWidth = cameraHeight * aspectRatio;
const camera = new THREE.OrthographicCamera(
    -cameraWidth / 2,
    cameraWidth / 2,
    cameraHeight / 2,
    -cameraHeight / 2,
    0.1,
    1000
);
camera.position.set(0, 0, 10); // Move camera back to see both models
camera.lookAt(0, 0, 0);

// Renderer setup with transparency
const renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    alpha: true // Enable transparency
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0); // Set clear color to transparent
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Lighting setup
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
mainLight.position.set(0, 3, 5);
mainLight.lookAt(0, 0, 0);
scene.add(mainLight);

// Movement variables
const moveSpeed = 0.1;
let screenBoundaries = {
    left: -cameraWidth/2 + (cameraWidth * 0.1),
    right: cameraWidth/2 - (cameraWidth * 0.1)
};

// Load models
let model, mixer, walkAction, danceAction;
let windModel, windMixer, windWalkAction, windDanceAction;

// Function to calculate model scale based on screen height
function calculateModelScale(cameraHeight) {
    // Target 15% of screen height with additional safety margin
    const targetScreenHeightPercentage = 0.12; // Reduced from 0.15 to ensure comfortable fit
    // Assuming the model's natural height is 1 unit
    const modelNaturalHeight = 1;
    // Calculate scale needed to make model 15% of screen height
    return (cameraHeight * targetScreenHeightPercentage) / modelNaturalHeight;
}

// Function to calculate model position based on screen height
function calculateModelPosition(cameraHeight) {
    // Position model 5% from bottom of screen
    const bottomOffset = cameraHeight * 0.05;
    // Calculate model height based on the new scale
    const modelHeight = cameraHeight * 0.12; // Using the same percentage as scale
    // Calculate y position to ensure model stays within bounds
    const yPosition = -cameraHeight/2 + bottomOffset + (modelHeight/2);
    return yPosition;
}

// Animation loop
const clock = new THREE.Clock();
let isGameInitialized = false;
let sunUpdateRotation;

// Function to check sun's progress bar and show final video
function checkSunProgressBar() {
    const rightProgressFill = document.getElementById('right-progress-fill');
    if (rightProgressFill) {
        const progress = parseFloat(rightProgressFill.style.width) || 20;
        if (progress >= 100) {
            // Create and show final video
            const finalVideo = document.createElement('video');
            finalVideo.id = 'finalScreen';
            finalVideo.src = 'final.mp4';
            finalVideo.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; object-fit: cover; z-index: 99999;';
            finalVideo.autoplay = true;
            finalVideo.muted = true;
            finalVideo.loop = true;
            document.body.appendChild(finalVideo);
        }
    }
}

function animate() {
    requestAnimationFrame(animate);
    
    if (!isGameInitialized) return;
    
    const delta = clock.getDelta();
    
    // Check sun's progress bar
    checkSunProgressBar();
    
    // Update animation mixers
    if (mixer) {
        mixer.update(delta);
    }
    if (windMixer) {
        windMixer.update(delta);
    }
    
    // Update main light position to follow camera
    mainLight.position.copy(camera.position).add(new THREE.Vector3(0, 1, -1));
    
    // Update first character position if moving and not dancing
    if (model && model.isMoving && !model.isDancing) {
        const newX = model.position.x + (moveSpeed * model.moveDirection);
        if (newX >= screenBoundaries.left && newX <= screenBoundaries.right) {
            model.position.x = newX;
            updateBackgroundColor(newX);
            updateMaterialsColor(newX, model, screenBoundaries);
        }
    }
    
    // Update second character position if moving and not dancing
    if (windModel && windModel.isWindMoving && !windModel.isDancing) {
        const newX = windModel.position.x + (moveSpeed * windModel.windMoveDirection);
        if (newX >= screenBoundaries.left && newX <= screenBoundaries.right) {
            windModel.position.x = newX;
        }
    }
    
    renderer.render(scene, camera);
}

// Initialize game function
function initializeGame() {
    loadSunModel(cameraHeight, scene, (sunData) => {
        model = sunData.model;
        mixer = sunData.mixer;
        walkAction = sunData.walkAction;
        danceAction = sunData.danceAction;
        sunUpdateRotation = sunData.updateRotation;
        
        // Configure sun model with calculated scale and position
        scene.add(model);
        const modelScale = calculateModelScale(cameraHeight);
        model.scale.set(modelScale, modelScale, modelScale);
        
        // Calculate bounding box to find the bottom of the model
        const boundingBox = new THREE.Box3().setFromObject(model);
        const groundLevel = -cameraHeight/2 + (cameraHeight * 0.04); // 4% from bottom of screen
        const modelBottom = boundingBox.min.y * modelScale;
        
        // Position model so its bottom aligns with ground level
        model.position.set(5, groundLevel - modelBottom + 0.3, 0); // Added small offset to raise it slightly
        
        // Verify model fits within viewport with strict height limit
        const modelHeight = boundingBox.max.y - boundingBox.min.y;
        const screenHeight = cameraHeight;
        
        // If model is too tall, scale it down to exactly 15% of screen height
        if (modelHeight > screenHeight * 0.15) {
            const scaleFactor = (screenHeight * 0.15) / modelHeight;
            model.scale.multiplyScalar(scaleFactor);
            // Recalculate position after scale change
            const newBoundingBox = new THREE.Box3().setFromObject(model);
            const newModelBottom = newBoundingBox.min.y * model.scale.y;
            model.position.y = groundLevel - newModelBottom + 0.3; // Maintain the small offset
        }
        
        // Apply initial background color
        updateBackgroundColor(model.position.x);
        
        // Add event listener for dance animation completion
        danceAction.getMixer().addEventListener('finished', () => 
            onDanceFinished(mixer, danceAction, walkAction, model)
        );
    });

    loadWindModel(cameraHeight, scene, (windData) => {
        windModel = windData.windModel;
        windMixer = windData.windMixer;
        windWalkAction = windData.windWalkAction;
        windDanceAction = windData.windDanceAction;
        
        // Configure wind model
        scene.add(windModel);
        
        // Set larger scale for wind model
        const baseScale = calculateModelScale(cameraHeight);
        const largerScale = baseScale * 2.5 // Increase by 200%
        windModel.scale.set(largerScale, largerScale, largerScale);
        
        // Keep position at ground level
        windModel.position.set(-5, -5.5, 0);
        windModel.rotation.y = 0;
        
        // Add event listener for dance animation completion
        windDanceAction.getMixer().addEventListener('finished', () => 
            onWindDanceFinished(windMixer, windDanceAction, windWalkAction, windModel)
        );
    });

    // Setup keyboard controls
    setupKeyboardControls(() => {
        if (model && windModel) {  // Only update if both models are loaded
            updateMovement(model, windModel, mixer, windMixer, walkAction, windWalkAction, windDanceAction, moveSpeed, screenBoundaries);
        }
    });
}

// Start animation loop
animate();

// Listen for start screen click
window.addEventListener('startGame', () => {
    if (!isGameInitialized) {
        isGameInitialized = true;
        initializeGame();
    }
});

// Handle window resize
window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
    const aspectRatio = window.innerWidth / window.innerHeight;
    const cameraWidth = cameraHeight * aspectRatio;
    
    // Update camera
    camera.left = -cameraWidth / 2;
    camera.right = cameraWidth / 2;
    camera.top = cameraHeight / 2;
    camera.bottom = -cameraHeight / 2;
    camera.updateProjectionMatrix();
    
    // Update screen boundaries
    screenBoundaries = {
        left: -cameraWidth/2 + (cameraWidth * 0.1),
        right: cameraWidth/2 - (cameraWidth * 0.1)
    };
    
    // Update model scale and position if it exists
    if (model) {
        const modelScale = calculateModelScale(cameraHeight);
        model.scale.set(modelScale, modelScale, modelScale);
        model.position.y = calculateModelPosition(cameraHeight);
        
        // Verify model still fits within viewport after resize
        const boundingBox = new THREE.Box3().setFromObject(model);
        const modelHeight = boundingBox.max.y - boundingBox.min.y;
        const screenHeight = cameraHeight;
        
        // Enforce strict 15% height limit after resize
        if (modelHeight > screenHeight * 0.15) {
            const scaleFactor = (screenHeight * 0.15) / modelHeight;
            model.scale.multiplyScalar(scaleFactor);
        }
    }
    
    renderer.setSize(window.innerWidth, window.innerHeight);
} 