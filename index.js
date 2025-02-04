import * as THREE from "three";
import { OrbitControls, GLTFLoader } from "addons";

// Basic setup of the Three.js scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Create a basic plane to represent the battlefield
// Create a geometry for the first half
const playerTerritoryMesh = new THREE.PlaneGeometry(100, 100);
const playerTerritoryMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
const playerTerritory = new THREE.Mesh(playerTerritoryMesh, playerTerritoryMaterial);

// Position the first half (left side)
playerTerritory.position.x = -50; // Move it to the left
playerTerritory.rotation.z = Math.PI / 2; //Rotate to display correctly
scene.add(playerTerritory);

// Create a geometry for the second half
const enemyTerritoryMesh = new THREE.PlaneGeometry(100, 100);
const enemyTerritoryMaterial = new THREE.MeshBasicMaterial({ color: 0x004400, side: THREE.DoubleSide }); // Darker green
const enemyTerritory = new THREE.Mesh(enemyTerritoryMesh, enemyTerritoryMaterial);

// Position the second half (right side)
enemyTerritory.position.x = 50; // Move it to the right
enemyTerritory.rotation.z = Math.PI / 2; //Rotate to display correctly
scene.add(enemyTerritory);

camera.position.z = 50;

// Initialize OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableZoom = true;
controls.target.set(0, 0, 0);
controls.update();
logEvent("Initialize orbit controls.", false, false);

// Function to rotate the camera down
function rotateCameraDown(targetAngle, duration) {
    const targetYRotation = THREE.MathUtils.degToRad(targetAngle);
    const initialYRotation = camera.rotation.x;

    const startTime = performance.now();

    function animateRotation(now) {
        const elapsedTime = (now - startTime) / 1000; // Convert to seconds
        const progress = Math.min(elapsedTime / duration, 1); // Normalize to [0, 1]

        // Interpolating between initial and target rotation
        camera.rotation.x = THREE.MathUtils.lerp(initialYRotation, targetYRotation, progress);

        // Continue the animation until the duration is complete
        if (progress < 1) {
            requestAnimationFrame(animateRotation);
        }
    }

    requestAnimationFrame(animateRotation);
}

//**************************************************************************
//*         Begin Game Logic 
//*********************************************************************** */

let playerGold = 500; // Starting player gold

// unit costs
const unitCosts = {
    beetle: 100,
    ant: 50,
    bee: 250
};
const BEETLE_HEALTH = 100;
const BEETLE_DAMAGE = 1;
const ANT_HEALTH = 50;
const ANT_DAMAGE = 5;
const BEE_HEALTH = 10;
const BEE_DAMAGE = 10;

// This is the type of unit the player has selected to place next 
let selectedUnit = 'ant';

// Initialize the game state
function startGame() {
    updateGoldDisplay();
    rotateCameraDown(45, 1.5); // Rotate down to 45 degrees over 1.5 seconds
    // Additional game initialization logic if needed
}

// Unit placement logic
function placeUnit(event) {
    const unitType = selectedUnit; // Assuming selectedUnit is defined elsewhere
    if (!unitType) return; // No unit type selected

    const cost = unitCosts[unitType];
    if (playerGold >= cost) {
        // Subtract cost from player gold
        playerGold -= cost;
        updateGoldDisplay();

        // Create and place the unit at the clicked location
        createUnit(unitType, event.clientX, event.clientY);

        // Log the event
        logEvent(`${unitType.charAt(0).toUpperCase() + unitType.slice(1)} placed!`, true, false);
    } else {
        logEvent("Not enough gold!", true, true);
    }
}

// Function to create unit
function createUnit(unitType, mouseX, mouseY) {
    // Convert screen coordinates to normalized device coordinates
    const rect = renderer.domElement.getBoundingClientRect();
    const x = ((mouseX - rect.left) / rect.width) * 2 - 1;
    const y = -((mouseY - rect.top) / rect.height) * 2 + 1;

    // Create a vector from the normalized device coordinates
    const vector = new THREE.Vector3(x, y, 0.5); // Use z = 0.5 for depth
    vector.unproject(camera); // Unproject the coordinates onto the 3D space

    // Calculate the position on the plane
    const dir = vector.sub(camera.position).normalize();
    const distance = - camera.position.z / dir.z; // Assuming the camera's location
    const position = camera.position.clone().add(dir.multiplyScalar(distance));

    // Create a basic geometry for the unit
    const geometry = new THREE.BoxGeometry(1, 1, 1); // Placeholder shape
    let color;
    let health;
    let damage;
    switch (unitType) {
        case 'beetle':
            color = 0x0000ff; // Blue
            health = BEETLE_HEALTH;
            damage = BEETLE_DAMAGE;
            break;
        case 'ant':
            color = 0xff0000; // Green
            health = ANT_HEALTH;
            damage = ANT_DAMAGE;
            break;
        case 'bee':
            color = 0xffff00; // Yellow
            health = BEE_HEALTH;
            damage = BEE_DAMAGE;
            break;
        default:
            return; // Invalid unit type
    }

    const material = new THREE.MeshBasicMaterial({ color });
    const unit = new THREE.Mesh(geometry, material);

    // Set position to calculated position
    unit.position.set(position.x, position.y, 0); // Adjust z as needed
    unit.userData = {
        health: health,
        health: damage,
        velocity: new THREE.Vector3(0, 0, 0),
        unitType: unitType
    };
    scene.add(unit);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();

//*************************************************************
// *        UI Logic Below 
// ************************************************************/

// Add event listener for the start button
document.getElementById('startButton').addEventListener('click', startGame);

// Set up event listener for mouse click on the renderer
renderer.domElement.addEventListener('click', placeUnit);

// Function to handle unit selection
function selectUnit(unit) {
    // Remove the selected class from all buttons
    document.querySelectorAll('button').forEach((btn) => {
        btn.classList.remove('selected');
    });

    // Add the selected class to the clicked button and set the selected unit
    const button = document.getElementById(unit + 'Button');
    button.classList.add('selected');
    selectedUnit = unit; // Update the selected unit
}

// Event listeners for buttons
document.getElementById('beetleButton').addEventListener('click', () => selectUnit('beetle'));
document.getElementById('antButton').addEventListener('click', () => selectUnit('ant'));
document.getElementById('beeButton').addEventListener('click', () => selectUnit('bee'));

// Function to update gold display on UI
function updateGoldDisplay() {
    document.getElementById('playerGold').textContent = `Player Gold: ${playerGold}`;
}

// Handle window resizing
window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
});

const logElement = document.getElementById('eventLog');

let isDragging = false;
let startX, startY, initialMouseX, initialMouseY;

logElement.addEventListener('mousedown', (event) => {
    isDragging = true;
    startX = logElement.offsetLeft;
    startY = logElement.offsetTop;
    initialMouseX = event.clientX;
    initialMouseY = event.clientY;
});

document.addEventListener('mousemove', (event) => {
    if (isDragging) {
        const dx = event.clientX - initialMouseX;
        const dy = event.clientY - initialMouseY;
        logElement.style.left = startX + dx + 'px';
        logElement.style.top = startY + dy + 'px';
    }
});

document.addEventListener('mouseup', () => {
    isDragging = false;
});

function logEvent(eventMessage, toggleLogOpen, highlight) {
    const logList = document.getElementById('logList');
    const newLogEntry = document.createElement('li');
    newLogEntry.classList.add("noClick")
    if (highlight) {
        newLogEntry.classList.add("highlight")
    }
    newLogEntry.textContent = eventMessage;
    logList.appendChild(newLogEntry);

    // Optional: Scroll to the bottom of the log to show the latest entry
    logList.scrollTop = logList.scrollHeight;

    //open the log if toggleLogOpen is true and its hidden
    if (logList.classList.contains('hidden') && toggleLogOpen) {
        logList.classList.toggle('hidden'); // Toggle the hidden class
        logList.scrollTop = logList.scrollHeight;
    }

}

const toggleButton = document.getElementById('toggleButton');
const logList = document.getElementById('logList');

toggleButton.addEventListener('click', () => {
    logList.classList.toggle('hidden'); // Toggle the hidden class
});
