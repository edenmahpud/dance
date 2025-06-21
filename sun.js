import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export function loadSunModel(cameraHeight, scene, onLoad) {
    const loader = new GLTFLoader();
    let model, mixer, walkAction, danceAction;
    const FRAME_INCREMENT = 1/24; // One frame at 24fps

    loader.load(
        'sun/sun.walk.glb',
        function (gltf) {
            model = gltf.scene;
            
            // Calculate the model's bounding box
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            
            // Scale the model
            const targetHeight = cameraHeight * 0.2;
            const scale = targetHeight / maxDim;
            model.scale.set(scale * 0.8, scale * 0.8, scale * 0.8);
            
            // Calculate the scaled height of the model
            const scaledHeight = size.y * scale * 0.8;
            
            // Position the model on the right side
            const bottomPosition = -cameraHeight/2 + (cameraHeight * 0.05);
            
            // Adjust position to place feet at the bottom
            const feetOffset = (scaledHeight / 2) - (size.y * scale * 0.8 * 0.1);
            const verticalOffset = -1;
            
            // Set initial position to be on the right side
            model.position.set(
                5,   // Fixed X position on the right
                bottomPosition + feetOffset + verticalOffset,
                0    // Z position at 0 to be in front of camera
            );
            
            // Add the model to the scene
            scene.add(model);
            
            // Initialize movement states
            model.isMoving = false;
            model.isDancing = false;
            model.moveDirection = 0;
            
            // Set up walk animation
            mixer = new THREE.AnimationMixer(model);
            walkAction = mixer.clipAction(gltf.animations[0]);
            walkAction.setLoop(THREE.LoopRepeat);
            walkAction.clampWhenFinished = true;
            
            // Load dance animation
            loader.load(
                'sun/sun.dance.glb',
                function (danceGltf) {
                    danceAction = mixer.clipAction(danceGltf.animations[0]);
                    danceAction.setLoop(THREE.LoopOnce);
                    danceAction.clampWhenFinished = true;
                    
                    // Set up keyboard event for frame-by-frame dance animation
                    const handleKeyDown = (event) => {
                        if (event.key === 'ArrowUp') {
                            // If not currently dancing
                            if (!model.isDancing) {
                                // Stop walk animation if it's running
                                if (walkAction.isRunning()) {
                                    walkAction.stop();
                                }
                                model.isDancing = true;
                                danceAction.reset();
                                danceAction.paused = true;
                                danceAction.play();
                            }
                            
                            // Get current animation state
                            const currentTime = danceAction.time;
                            const clipDuration = danceAction.getClip().duration;
                            
                            // Update progress bar
                            const progressFill = document.getElementById('right-progress-fill');
                            if (progressFill) {
                                // Calculate progress from 20% to 100%
                                const progress = 20 + ((currentTime / clipDuration) * 80);
                                progressFill.style.width = `${progress}%`;
                            }
                            
                            // Check if we've reached the end of the dance
                            if (currentTime >= clipDuration) {
                                // Reset dancing state
                                model.isDancing = false;
                                danceAction.stop();
                                
                                // Reset progress bar to 20%
                                if (progressFill) {
                                    progressFill.style.width = '20%';
                                }
                                
                                // Restore walk animation
                                walkAction.reset();
                                walkAction.play();
                                return;
                            }
                            
                            // Advance animation by one frame
                            danceAction.time = Math.min(currentTime + FRAME_INCREMENT, clipDuration);
                            mixer.update(0); // Update the mixer to reflect the new time
                        }
                    };
                    
                    // Add keydown listener
                    window.addEventListener('keydown', handleKeyDown);
                    
                    onLoad({ 
                        model, 
                        mixer, 
                        walkAction, 
                        danceAction
                    });
                },
                undefined,
                function (error) {
                    console.error('Error loading dance animation:', error);
                }
            );
        },
        function (xhr) {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        function (error) {
            console.error('An error happened:', error);
        }
    );
} 