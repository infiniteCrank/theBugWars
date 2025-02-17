import * as THREE from "three";
import { OrbitControls, GLTFLoader } from "addons";

// Basic setup of the Three.js scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Add lighting to the scene
const ambientLight = new THREE.AmbientLight(0x404040); // Soft white light
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 10); // White directional light
directionalLight.position.set(0, 10, 10).normalize();
scene.add(directionalLight);

// Create a basic plane to represent the battlefield
// Create a geometry for the first half
const playerTerritoryMesh = new THREE.PlaneGeometry(100, 100);
const playerTerritoryMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
const playerTerritory = new THREE.Mesh(playerTerritoryMesh, playerTerritoryMaterial);

// Position the first half (left side)
playerTerritory.position.x = -50; // Move it to the left
scene.add(playerTerritory);

// Create a geometry for the second half
const enemyTerritoryMesh = new THREE.PlaneGeometry(100, 100);
const enemyTerritoryMaterial = new THREE.MeshBasicMaterial({ color: 0x004400, side: THREE.DoubleSide }); // Darker green
const enemyTerritory = new THREE.Mesh(enemyTerritoryMesh, enemyTerritoryMaterial);

// Position the second half (right side)
enemyTerritory.position.x = 50; // Move it to the right
scene.add(enemyTerritory);

camera.position.z = 70;

//**************************************************************************
//*         Begin Game Logic 
//*********************************************************************** */

let playerGold = 500; // Starting player gold
let enemyGold = 500; // starting ebemy gold 
const ATTACK_INTERVAL = 0; // Attack every second
const ATTACK_RANGE = 1.5; // Distance within which units can attack
let lastAttackTime = {}; // Track the last attack time of each unit
let gamestarted = false

// unit costs
const unitCosts = {
    beetle: 120,
    ant: 60,
    bee: 220
};
const BEETLE_HEALTH = 90;
const BEETLE_DAMAGE = 2;
const ANT_HEALTH = 40;
const ANT_DAMAGE = 3;
const BEE_HEALTH = 12;
const BEE_DAMAGE = 10;
// Define enemy territory boundaries
const ENEMY_TERRITORY_LEFT = 0;   // Left side boundary for enemy territory
const ENEMY_TERRITORY_RIGHT = 100;  // Right side boundary for enemy territory

// This is the type of unit the player has selected to place next 
let selectedUnit = 'ant';

// Define unit costs for enemy units
const enemyUnitCosts = {
    wasp: 220,
    blackAnt: 60,
    greyRoller: 120
};

// Define equivalent attributes for enemy units
const WASP_HEALTH = 12;
const WASP_DAMAGE = 10;
const BLACK_ANT_HEALTH = 40;
const BLACK_ANT_DAMAGE = 3;
const GREY_ROLLER_HEALTH = 90;
const GREY_ROLLER_DAMAGE = 2;

const enemyUnits = [
    { type: 'wasp', cost: enemyUnitCosts.wasp, health: WASP_HEALTH, damage: WASP_DAMAGE },
    { type: 'blackAnt', cost: enemyUnitCosts.blackAnt, health: BLACK_ANT_HEALTH, damage: BLACK_ANT_DAMAGE },
    { type: 'greyRoller', cost: enemyUnitCosts.greyRoller, health: GREY_ROLLER_HEALTH, damage: GREY_ROLLER_DAMAGE }
];

//*************************************************************************************** */
// Function to generate enemy units
//*************************************************************************************** */
function generateEnemyUnits() {
    const numberOfUnits = 50; // Adjust this number as needed
    let spentGold = 0;

    for (let i = 0; i < numberOfUnits; i++) {
        const randomIndex = Math.floor(Math.random() * enemyUnits.length);
        const unit = enemyUnits[randomIndex];

        // Check if there's enough gold to place the unit
        if (spentGold + unit.cost <= enemyGold) {
            // Determine a random position on enemy territory
            const randomX = Math.random() * (ENEMY_TERRITORY_RIGHT - ENEMY_TERRITORY_LEFT) + ENEMY_TERRITORY_LEFT;

            // Create the unit at the random position
            createEnemyUnit(unit.type, randomX, 0); // Assuming y=0 for flat plane
            spentGold += unit.cost; // Update spent gold
        }
    }
    enemyGold = enemyGold - spentGold;
    console.log("enemy gold after buying units: " + enemyGold)
    document.getElementById("enemyGold").innerHTML = "Enemy Gold: " + enemyGold
}

// Function to create enemy unit
function createEnemyUnit(unitType, x, y) {
    // Create unit based on type
    let color;
    let health;
    let damage;
    switch (unitType) {
        case 'wasp':
            color = 0xffa500; // Orange
            health = WASP_HEALTH;
            damage = WASP_DAMAGE;
            break;
        case 'blackAnt':
            color = 0x000000; // Black
            health = BLACK_ANT_HEALTH;
            damage = BLACK_ANT_DAMAGE;
            break;
        case 'greyRoller':
            color = 0x808080; // Grey
            health = GREY_ROLLER_HEALTH;
            damage = GREY_ROLLER_DAMAGE;
            break;
        default:
            return; // Invalid unit type
    }

    // Create the geometry and material for the unit
    const geometry = new THREE.BoxGeometry(1, 1, 1); // Placeholder shape
    const material = new THREE.MeshBasicMaterial({ color });
    const unit = new THREE.Mesh(geometry, material);

    // Set position to the specified position
    unit.position.set(x, y, 0);
    unit.userData = {
        health: health,
        damage: damage,
        velocity: new THREE.Vector3(0, 0, 0),
        unitType: unitType
    };
    scene.add(unit);
}

// generate enemies before start of the game 
generateEnemyUnits();


//********************************************************************************************* 
//          Unit placement logic
//*********************************************************************************************/
function placeUnit(event) {
    const unitType = selectedUnit; // Assuming selectedUnit is defined elsewhere
    if (!unitType) return; // No unit type selected

    const cost = unitCosts[unitType];
    if (playerGold >= cost) {
        // Convert screen coordinates to normalized device coordinates
        const rect = renderer.domElement.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        // Create a vector from the normalized device coordinates
        const vector = new THREE.Vector3(x, y, 0.5); // Use z = 0.5 for depth
        vector.unproject(camera); // Unproject the coordinates onto the 3D space

        // Calculate the position on the plane
        const dir = vector.sub(camera.position).normalize();
        const distance = -camera.position.z / dir.z; // Assuming the camera's location
        const position = camera.position.clone().add(dir.multiplyScalar(distance));

        // Check if the position is within the battlefield bounds
        const isInPlayerTerritory = position.x >= (ENEMY_TERRITORY_LEFT - 100) && position.x <= (ENEMY_TERRITORY_RIGHT - 50);
        const isInEnemyTerritory = position.x >= ENEMY_TERRITORY_LEFT && position.x <= ENEMY_TERRITORY_RIGHT;

        if (!isInPlayerTerritory && !isInEnemyTerritory) {
            logEvent("Unit must be placed between the territories!", true, true);
            return; // Stop further execution if invalid placement
        }

        // Check if the position is within enemy territory
        if (isInEnemyTerritory) {
            logEvent("Cannot place unit in enemy territory!", true, true);
            return; // Stop further execution if invalid placement
        }

        // Subtract cost from player gold
        playerGold -= cost;
        updateGoldDisplay();

        // Create and place the unit at the calculated position
        createUnit(unitType, event.clientX, event.clientY);

        // Log the event
        logEvent(`${unitType.charAt(0).toUpperCase() + unitType.slice(1)} placed!`, true, false);
    } else {
        logEvent("Not enough gold!", true, true);
    }
}

// Function to create unit
function createUnit(unitType, mouseX, mouseY) {
    const rect = renderer.domElement.getBoundingClientRect();
    const x = ((mouseX - rect.left) / rect.width) * 2 - 1;
    const y = -((mouseY - rect.top) / rect.height) * 2 + 1;

    const vector = new THREE.Vector3(x, y, 0.5);
    vector.unproject(camera);

    const dir = vector.sub(camera.position).normalize();
    const distance = -camera.position.z / dir.z;
    const position = camera.position.clone().add(dir.multiplyScalar(distance));

    if (unitType === 'beetle') {
        const loader = new GLTFLoader();
        loader.load('beetle.glb', (gltf) => {
            const beetle = gltf.scene;

            // Scale the model if necessary
            beetle.scale.set(1, 1, 1);

            // Set position
            beetle.position.set(position.x, position.y, 5);
            beetle.rotation.x = 90;
            beetle.rotation.y = 89.5;

            beetle.userData = {
                health: BEETLE_HEALTH,
                damage: BEETLE_DAMAGE,
                velocity: new THREE.Vector3(0, 0, 0),
                unitType: 'beetle'
            };
            scene.add(beetle);

            // Start animation (if animations are present in the GLB)
            const mixer = new THREE.AnimationMixer(beetle);
            beetle.animationActions = []; // Store actions here
            gltf.animations.forEach((clip) => {
                const action = mixer.clipAction(clip);
                action.setEffectiveTimeScale(1000);
                beetle.animationActions.push(action);
            });

            beetle.animationMixer = mixer;
        });
    } else if (unitType === 'ant') {
        const loader = new GLTFLoader();
        loader.load('ant.glb', (gltf) => {
            const ant = gltf.scene;

            // Scale the model if necessary
            ant.scale.set(.5, .5, .5);

            // Set position
            ant.position.set(position.x, position.y, 5);
            ant.rotation.x = 90;
            ant.rotation.y = 89.5;

            ant.userData = {
                health: ANT_HEALTH,
                damage: ANT_DAMAGE,
                velocity: new THREE.Vector3(0, 0, 0),
                unitType: 'ant'
            };
            scene.add(ant);

            // Start animation (if animations are present in the GLB)
            const mixer = new THREE.AnimationMixer(ant);
            ant.animationActions = []; // Store actions here
            gltf.animations.forEach((clip) => {
                const action = mixer.clipAction(clip);

                ant.animationActions.push(action);
            });

            ant.animationMixer = mixer;
        });
    } else {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        let color;
        let health;
        let damage;

        switch (unitType) {
            case 'bee':
                color = 0xffff00;
                health = BEE_HEALTH;
                damage = BEE_DAMAGE;
                break;
            default:
                return;
        }

        const material = new THREE.MeshBasicMaterial({ color });
        const unit = new THREE.Mesh(geometry, material);

        unit.position.set(position.x, position.y, 0);
        unit.userData = {
            health: health,
            damage: damage,
            velocity: new THREE.Vector3(0, 0, 0),
            unitType: unitType
        };
        scene.add(unit);
    }
}

//******************************************************************** */
// Initialize the game state
//******************************************************************* */
function startGame() {
    updateGoldDisplay();
    // Initialize last attack time for all units
    initializeLastAttackTime();
    gamestarted = true;

    // Start beetle animations now that the game has started
    const beetles = getUnitsOfType('beetle');
    beetles.forEach(beetle => {
        if (beetle.animationActions) {
            beetle.animationActions.forEach(action => action.play());
        }
    });

    // Start ant animations now that the game has started
    const ants = getUnitsOfType('ant');
    ants.forEach(ant => {
        if (ant.animationActions) {
            ant.animationActions.forEach(action => action.play());
        }
    });
}

// Updated checkGameStatus to incorporate the beetle and grey roller rule
function checkGameStatus() {
    const redAnts = getUnitsOfType('ant');
    const blackAnts = getUnitsOfType('blackAnt');
    const greyRollers = getUnitsOfType('greyRoller');
    const blueBeetles = getUnitsOfType('beetle');
    const bees = getUnitsOfType('bee');
    const wasps = getUnitsOfType('wasp');


    // Check if all enemy units are defeated
    if (greyRollers.length === 0 &&
        wasps.length === 0 &&
        blackAnts.length === 0 && gamestarted) {
        logEvent("All enemy units defeated! You win!", true, true);
        let goldEarned = 5 * redAnts.length;
        goldEarned += 5 * blueBeetles.length;
        goldEarned += 5 * bees.length;
        playerGold += goldEarned + 500;
        enemyGold += 500;
        updateGoldDisplay();
        endGame(); // Call a function to handle the end of the game
    }

    // Check if all player units are defeated
    if (redAnts.length === 0 &&
        blueBeetles.length === 0 &&
        bees.length === 0 && gamestarted) {
        logEvent("All your units have been defeated! You lose!", true, true);
        let goldEarned = 5 * blackAnts.length;
        goldEarned += 5 * greyRollers.length;
        goldEarned += 5 * wasps.length;
        enemyGold += goldEarned + 500;
        playerGold += 500;
        updateGoldDisplay();
        endGame(); // Call a function to handle the end of the game
    }


}

function endGame() {
    if (gamestarted) {
        gamestarted = false; // Stop the game logic
        logEvent("Game Over!", false, true);

        //Clear the scene of all units
        // Create a copy of the scene's children to safely iterate over
        const units = scene.children.slice();
        units.forEach((unit) => {
            // Remove any object that has a unitType property
            if (unit.userData && unit.userData.unitType) {
                scene.remove(unit);
            }
        });

        // generate enemies before start of the game 
        generateEnemyUnits();
        initializeLastAttackTime(); // Reinitialize last attack times
        updateGoldDisplay(); // Update the UI for gold

        // Inform user about the restart
        logEvent("You can now start a new game!", false, true);
    }
}


// ************************************************************************************
// *        Main combat functions
// ***********************************************************************************/

// Initialize last attack time for all units
function initializeLastAttackTime() {
    scene.children.forEach(unit => {
        if (unit.userData) {
            lastAttackTime[unit.uuid] = Date.now(); // Set last attack to the current time
        }
    });
}

// Initiate combat for unit types
function initiateCombat() {
    const redAnts = getUnitsOfType('ant');
    const greyRollers = getUnitsOfType('greyRoller');
    const blackAnts = getUnitsOfType('blackAnt');
    const blueBeetles = getUnitsOfType('beetle');
    const bees = getUnitsOfType('bee');
    const wasps = getUnitsOfType('wasp');

    // Process each unit type for their combat interactions
    moveAndAttack(redAnts, blackAnts, greyRollers, wasps);
    moveAndAttack(blackAnts, redAnts, blueBeetles, bees);
    moveAndAttack(bees, greyRollers, blackAnts, wasps);
    moveAndAttack(wasps, blueBeetles, redAnts, bees);
    moveAndAttack(blueBeetles, blackAnts, wasps, greyRollers);
    moveAndAttack(greyRollers, redAnts, bees, blueBeetles);

}

function moveAndAttack(attackingUnits, primaryTargets, secondaryTargets, tirshiaryTarget) {
    attackingUnits.forEach(attacker => {
        const currentTime = Date.now();

        let target = primaryTargets.find(defender => getDistance(attacker.position, defender.position) < ATTACK_RANGE);

        // Attack if the target is in range and the attack interval has passed
        if (target && currentTime - lastAttackTime[attacker.uuid] >= ATTACK_INTERVAL) {
            attackUnit(attacker, target);
            lastAttackTime[attacker.uuid] = currentTime; // Update the last attack time
        } else if (primaryTargets.length > 0) { // If no attack occurs, move towards the target
            const closestTarget = primaryTargets.reduce((prev, curr) =>
                getDistance(attacker.position, curr.position) < getDistance(attacker.position, prev.position) ? curr : prev
            );

            moveTowards(attacker, closestTarget);
        }

        // If no primary targets, check secondary targets
        let secondTarget = (secondaryTargets) ? secondaryTargets.find(defender => getDistance(attacker.position, defender.position) < ATTACK_RANGE) : false;

        if (!target && secondaryTargets) {
            if (secondTarget && currentTime - lastAttackTime[attacker.uuid] >= ATTACK_INTERVAL) {
                attackUnit(attacker, secondTarget);
                lastAttackTime[attacker.uuid] = currentTime; // Update the last attack time
            } else if (secondaryTargets.length > 0) {
                const closestTarget = secondaryTargets.reduce((prev, curr) =>
                    getDistance(attacker.position, curr.position) < getDistance(attacker.position, prev.position) ? curr : prev
                );

                moveTowards(attacker, closestTarget);
            }
        }

        // If no primary targets,  or second targets. check third  targets
        let thirdTarget = (tirshiaryTarget) ? tirshiaryTarget.find(defender => getDistance(attacker.position, defender.position) < ATTACK_RANGE) : false;

        if (!target && !secondTarget && tirshiaryTarget) {
            if (thirdTarget && currentTime - lastAttackTime[attacker.uuid] >= ATTACK_INTERVAL) {
                attackUnit(attacker, thirdTarget);
                lastAttackTime[attacker.uuid] = currentTime; // Update the last attack time
            } else if (tirshiaryTarget.length > 0) {
                const closestTarget = tirshiaryTarget.reduce((prev, curr) =>
                    getDistance(attacker.position, curr.position) < getDistance(attacker.position, prev.position) ? curr : prev
                );

                moveTowards(attacker, closestTarget);
            }
        }

    });
}

// Function to calculate distance
function getDistance(pos1, pos2) {
    return pos1.distanceTo(pos2);
}

// Function to move unit towards a target
function moveTowards(unit, target) {
    const direction = new THREE.Vector3().subVectors(target.position, unit.position).normalize();
    unit.position.add(direction.multiplyScalar(0.1)); // Move towards the target by a small factor
}

// Function to attack another unit
function attackUnit(attacker, target) {
    if (attacker.userData.health > 0 && target.userData.health > 0) {
        target.userData.health -= attacker.userData.damage; // Deal damage
        logEvent(`${attacker.userData.unitType} attacks ${target.userData.unitType}`, true, false);

        // Check if the target's health drops to zero
        if (target.userData.health <= 0) {
            scene.remove(target); // Remove the defeated unit from the scene
            logEvent(`${target.userData.unitType} is defeated!`, false, true);
        }
    }
}

// Helper function to get units of a specific type
function getUnitsOfType(unitType) {
    return scene.children.filter(unit => unit.userData && unit.userData.unitType === unitType);
}


//***************************************************************** */
// Animation loop
//****************************************************************** */
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);

    // Update animation mixers
    scene.children.forEach((child) => {
        if (child.animationMixer) {
            child.animationMixer.update(0.01); // Adjust delta time appropriately
        }
    });

    // Update combat logic in each animation frame
    if (gamestarted === true) {
        initiateCombat();
        checkGameStatus(); // Ensure we check game status continuously
    }

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
    document.getElementById('enemyGold').textContent = `Enemy Gold: ${enemyGold}`;
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