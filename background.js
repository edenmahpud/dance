import * as THREE from 'three';

// Color gradient configuration
export const colorGradient = [
    { position: 0, color: '#2b1b17' },    // Deep purple-brown
    { position: 0.1, color: '#5b0e2d' },  // Deep burgundy
    { position: 0.2, color: '#8B0000' },  // Dark red
    { position: 0.3, color: '#FF4500' },  // Bright orange-red
    { position: 0.4, color: '#FF8C00' },  // Dark orange
    { position: 0.5, color: '#FFA500' },  // Orange
    { position: 0.6, color: '#FFD700' },  // Gold
    { position: 0.7, color: '#FFE066' },  // Light gold
    { position: 0.8, color: '#FFFACD' },  // Lemon chiffon
    { position: 1.0, color: '#FFFFE0' }   // Light yellow
];

// Function to interpolate between two colors
function interpolateColor(color1, color2, factor) {
    const result = new THREE.Color();
    result.r = color1.r + (color2.r - color1.r) * factor;
    result.g = color1.g + (color2.g - color1.g) * factor;
    result.b = color1.b + (color2.b - color1.b) * factor;
    return result;
}

// Function to get background color based on position
export function getBackgroundColor(x, minX, maxX) {
    // Normalize position to 0-1 range
    const normalizedX = (x - minX) / (maxX - minX);
    
    // Find the two colors to interpolate between
    let lowerColor = colorGradient[0];
    let upperColor = colorGradient[colorGradient.length - 1];
    
    for (let i = 0; i < colorGradient.length - 1; i++) {
        if (normalizedX >= colorGradient[i].position && normalizedX <= colorGradient[i + 1].position) {
            lowerColor = colorGradient[i];
            upperColor = colorGradient[i + 1];
            break;
        }
    }
    
    // Calculate interpolation factor
    const factor = (normalizedX - lowerColor.position) / (upperColor.position - lowerColor.position);
    
    // Interpolate between colors
    const color1 = new THREE.Color(lowerColor.color);
    const color2 = new THREE.Color(upperColor.color);
    const result = interpolateColor(color1, color2, factor);
    
    return result.getStyle();
}

// Function to update background color
export function updateBackgroundColor(x) {
    const minX = -10; // Left boundary
    const maxX = 10;  // Right boundary
    const newColor = getBackgroundColor(x, minX, maxX);
    document.getElementById('color-background').style.backgroundColor = newColor;
}

// Function to calculate opacity based on position
export function getOpacityForPosition(x, minX, maxX) {
    // Normalize position to 0-1 range
    const normalizedX = (x - minX) / (maxX - minX);
    // Invert the value so opacity decreases as x increases
    return 1 - normalizedX;
}

// Function to update sky fade opacity
export function updateSkyFade(x) {
    const minX = -10; // Left boundary
    const maxX = 10;  // Right boundary
    const opacity = getOpacityForPosition(x, minX, maxX);
    document.getElementById('sky-fade-layer').style.opacity = opacity;
}

// Function to update materials based on position
export function updateMaterialsColor(x, model, screenBoundaries) {
    if (!model) return;
    
    const minX = screenBoundaries.left;
    const maxX = screenBoundaries.right;
    const newColor = new THREE.Color(getBackgroundColor(x, minX, maxX));
    
    model.traverse((child) => {
        if (child.isMesh && child.material) {
            // Check if the mesh should be color-reactive
            if (child.userData.sunReactive !== false) { // Default to true if not specified
                if (Array.isArray(child.material)) {
                    child.material.forEach(mat => {
                        if (mat.color) {
                            mat.color.set(newColor);
                        }
                    });
                } else if (child.material.color) {
                    child.material.color.set(newColor);
                }
            }
        }
    });
} 