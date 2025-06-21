import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export function loadWindModel(cameraHeight, scene, onLoad) {
    const loader = new GLTFLoader();
    let windModel, windMixer, windWalkAction, windDanceAction;
    let animationsLoaded = 0;

    function checkAllAnimationsLoaded() {
        animationsLoaded++;
        if (animationsLoaded === 2) { // Both walk and dance animations loaded
            onLoad({ windModel, windMixer, windWalkAction, windDanceAction });
        }
    }

    loader.load(
        'wind/wind.walk.glb',
        function (gltf) {
            console.log('Wind model loaded:', gltf);
            windModel = gltf.scene;
            
            // Calculate the model's bounding box
            const box = new THREE.Box3().setFromObject(windModel);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            
            // Set up animation mixer
            windMixer = new THREE.AnimationMixer(windModel);
            console.log('Animation mixer created');
            
            // Ensure model is facing the camera
            windModel.rotation.y = 0;
            
            // Add the model to the scene
            scene.add(windModel);
            
            // Initialize movement states
            windModel.isWindMoving = false;
            windModel.isDancing = false;
            windModel.windMoveDirection = 0;
            
            // Set up walk animation from the same file
            if (gltf.animations && gltf.animations.length > 0) {
                console.log('Found animations:', gltf.animations);
                windWalkAction = windMixer.clipAction(gltf.animations[0]);
                windWalkAction.setLoop(THREE.LoopRepeat);
                windWalkAction.clampWhenFinished = true;
                console.log('Walk animation set up');
                checkAllAnimationsLoaded();
            } else {
                console.error('No animations found in wind.walk.glb');
            }
            
            // Load dance animation
            loader.load(
                'wind/wind.funny.glb',
                function (danceGltf) {
                    if (danceGltf.animations && danceGltf.animations.length > 0) {
                        windDanceAction = windMixer.clipAction(danceGltf.animations[0]);
                        windDanceAction.setLoop(THREE.LoopOnce);
                        windDanceAction.clampWhenFinished = true;
                        console.log('Dance animation set up');
                        checkAllAnimationsLoaded();
                    } else {
                        console.error('No animations found in wind.funny.glb');
                    }
                },
                undefined,
                function (error) {
                    console.error('Error loading wind dance animation:', error);
                }
            );
        },
        function (xhr) {
            console.log('Wind model loading progress:', (xhr.loaded / xhr.total * 100) + '% loaded');
        },
        function (error) {
            console.error('Error loading wind model:', error);
        }
    );
} 