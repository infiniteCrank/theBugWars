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
function iniOrbitControls() {
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = true;
    controls.target.set(0, 0, 0);
    controls.update();
    logEvent("Initialize orbit controls.", false, false);
}

// Function to rotate the camera down and zoom out
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
        } else {
            // Once rotation is done, zoom out smoothly
            zoomOutCamera(75, 1); // Assuming your current z position is around 50
        }
    }

    requestAnimationFrame(animateRotation);
}

// Function to zoom out the camera
function zoomOutCamera(targetZPosition, duration) {
    const initialZPosition = camera.position.z;
    const startTime = performance.now();

    function animateZoom(now) {
        const elapsedTime = (now - startTime) / 1000; // Convert to seconds
        const progress = Math.min(elapsedTime / duration, 1); // Normalize to [0, 1]

        // Interpolating between initial and target z position
        camera.position.z = THREE.MathUtils.lerp(initialZPosition, targetZPosition, progress);

        // Continue the animation until the duration is complete
        if (progress < 1) {
            requestAnimationFrame(animateZoom);
        }
    }

    requestAnimationFrame(animateZoom);
}

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
// Define enemy territory boundaries
const ENEMY_TERRITORY_LEFT = 0;   // Left side boundary for enemy territory
const ENEMY_TERRITORY_RIGHT = 100;  // Right side boundary for enemy territory

// This is the type of unit the player has selected to place next 
let selectedUnit = 'ant';

// Define unit costs for enemy units
const enemyUnitCosts = {
    wasp: 250,
    blackAnt: 50,
    greyRoller: 100
};

// Define equivalent attributes for enemy units
const WASP_HEALTH = 10;
const WASP_DAMAGE = 10;
const BLACK_ANT_HEALTH = 50;
const BLACK_ANT_DAMAGE = 5;
const GREY_ROLLER_HEALTH = 100;
const GREY_ROLLER_DAMAGE = 1;

const enemyUnits = [
    { type: 'wasp', cost: enemyUnitCosts.wasp, health: WASP_HEALTH, damage: WASP_DAMAGE },
    { type: 'blackAnt', cost: enemyUnitCosts.blackAnt, health: BLACK_ANT_HEALTH, damage: BLACK_ANT_DAMAGE },
    { type: 'greyRoller', cost: enemyUnitCosts.greyRoller, health: GREY_ROLLER_HEALTH, damage: GREY_ROLLER_DAMAGE }
];

// Function to generate enemy units
function generateEnemyUnits() {
    const numberOfUnits = 5; // Adjust this number as needed
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
        document.getElementById("enemyGold").innerHTML = "Enemy Gold: " + (enemyGold - spentGold)
    }
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

// Initialize the game state
function startGame() {
    if (playerGold > 0) {
        logEvent("You  must spend all your gold befor teh game starts", true, true);
        return
    }
    updateGoldDisplay();
    rotateCameraDown(15, 1.5); // Rotate down to 45 degrees over 1.5 seconds
    iniOrbitControls()
    // Initialize last attack time for all units
    initializeLastAttackTime();
    gamestarted = true;
}

// Updated checkGameStatus to incorporate the beetle and grey roller rule
function checkGameStatus() {
    const redAnts = getUnitsOfType('ant');
    const blackAnts = getUnitsOfType('blackAnt');
    const greyRollers = getUnitsOfType('greyRoller');
    const blueBeetles = getUnitsOfType('beetle');
    const bees = getUnitsOfType('bee');
    const wasps = getUnitsOfType('wasp');

    // if all the back ants are gone beetles and wasps fight eachother 
    if (blackAnts.length === 0 && blueBeetles.length > 0 && wasps.length > 0) {
        logEvent("No black ants present. Beetles will attack wasps!", true, true);
        initiateBeetleAttack(blueBeetles, wasps); // Start beetle to wasp attack
    }

    // if all the red ants are gone grey rollers and bees fight eachother 
    if (redAnts.length === 0 && greyRollers.length > 0 && bees.length > 0) {
        logEvent("No red ants present. Grey rollers will attack bees!", true, true);
        initiateGreyRollerAttack(greyRollers, bees); // Start grey roller to bee attack
    }

    // if only beetles and grey rollers are present, they will attack each other
    if (blueBeetles.length > 0 && greyRollers.length > 0 && redAnts.length === 0 && blackAnts.length === 0 && bees.length === 0 && wasps.length === 0) {
        logEvent("Only beetles and grey rollers remain. They will attack each other!", true, true);
        initiateBeetleGreyRollerAttack(blueBeetles, greyRollers); // Start beetle to grey roller attack
    }

    // if only bees and wasps then they will battle eachother 
    if (blueBeetles.length === 0 && greyRollers.length === 0 && redAnts.length === 0 && blackAnts.length === 0 && bees.length > 0 && wasps.length > 0) {
        logEvent("Only bees and wasps remain. They will attack each other!", true, true);
        continuousWaspBeeBattle(wasps, bees)
    }

    // Check if all enemy units are defeated
    if (greyRollers.length === 0 &&
        wasps.length === 0 &&
        blackAnts.length === 0 && gamestarted) {
        logEvent("All enemy units defeated! You win!", true, true);
        endGame(); // Call a function to handle the end of the game
    }

    // Check if all player units are defeated
    if (redAnts.length === 0 &&
        blueBeetles.length === 0 &&
        bees.length === 0 && gamestarted) {
        logEvent("All your units have been defeated! You lose!", true, true);
        endGame(); // Call a function to handle the end of the game
    }
}

function endGame() {
    if (gamestarted) {
        gamestarted = false; // Stop the game logic
        logEvent("Game Over!", false, true);

        //Clear the scene of all units
        scene.children.forEach(unit => {
            if (unit.userData.health) {
                scene.remove(unit);
            }
        });

        // Reset the game variables
        playerGold = 500; // Reset player gold to starting amount
        enemyGold = 500; // Reset player gold to starting amount
        selectedUnit = 'ant'; // Reset selected unit (you can customize this if needed)
        initializeLastAttackTime(); // Reinitialize last attack times
        updateGoldDisplay(); // Update the UI for gold

        // Inform user about the restart
        logEvent("You can now start a new game!", false, true);
    }
}


// ************************************************************************************
// *        Main combat functions
// ***********************************************************************************/

// Function for beetles to attack grey rollers
function initiateBeetleGreyRollerAttack(beetles, greyRollers) {
    beetles.forEach(beetle => {
        const targetGreyRoller = greyRollers.find(roller => getDistance(beetle.position, roller.position) < ATTACK_RANGE);
        if (targetGreyRoller) {
            attackUnit(beetle, targetGreyRoller);
        } else {
            const closestGreyRoller = greyRollers.reduce((prev, curr) =>
                getDistance(beetle.position, curr.position) < getDistance(beetle.position, prev.position) ? curr : prev
            );
            moveTowards(beetle, closestGreyRoller);
        }
    });

    greyRollers.forEach(greyRoller => {
        const targetBeetle = beetles.find(beetle => getDistance(greyRoller.position, beetle.position) < ATTACK_RANGE);
        if (targetBeetle) {
            attackUnit(greyRoller, targetBeetle);
        } else {
            const closestBeetle = beetles.reduce((prev, curr) =>
                getDistance(greyRoller.position, curr.position) < getDistance(greyRoller.position, prev.position) ? curr : prev
            );
            moveTowards(greyRoller, closestBeetle);
        }
    });
}

// Function for beetles to attack wasps
function initiateBeetleAttack(beetles, wasps) {
    beetles.forEach(beetle => {
        const targetWasp = wasps.find(wasp => getDistance(beetle.position, wasp.position) < ATTACK_RANGE);
        if (targetWasp) {
            attackUnit(beetle, targetWasp);
        } else {
            const closestWasp = wasps.reduce((prev, curr) =>
                getDistance(beetle.position, curr.position) < getDistance(beetle.position, prev.position) ? curr : prev
            );
            moveTowards(beetle, closestWasp);
        }
    });
}

// Function for grey rollers to attack bees
function initiateGreyRollerAttack(greyRollers, bees) {
    greyRollers.forEach(greyRoller => {
        const targetBee = bees.find(bee => getDistance(greyRoller.position, bee.position) < ATTACK_RANGE);
        if (targetBee) {
            attackUnit(greyRoller, targetBee);
        } else {
            const closestBee = bees.reduce((prev, curr) =>
                getDistance(greyRoller.position, curr.position) < getDistance(greyRoller.position, prev.position) ? curr : prev
            );
            moveTowards(greyRoller, closestBee);
        }
    });
}

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
    moveAndAttack(redAnts, blackAnts, greyRollers);
    moveAndAttack(blackAnts, redAnts, blueBeetles);
    moveAndAttack(bees, blackAnts);
    moveAndAttack(wasps, redAnts);

    // Check the status of units and trigger appropriate moves
    if (areAllAntsDefeated()) {
        initiateFinalCombat(); // Initiate final combat if all ants are defeated
    } else {
        handleRemainingUnits(redAnts, blackAnts, greyRollers, blueBeetles);
    }

}

function moveAndAttack(attackingUnits, primaryTargets, secondaryTargets) {
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
        if (!target && secondaryTargets) {
            target = secondaryTargets.find(defender => getDistance(attacker.position, defender.position) < ATTACK_RANGE);
            if (target && currentTime - lastAttackTime[attacker.uuid] >= ATTACK_INTERVAL) {
                attackUnit(attacker, target);
                lastAttackTime[attacker.uuid] = currentTime; // Update the last attack time
            } else if (secondaryTargets.length > 0) {
                const closestTarget = secondaryTargets.reduce((prev, curr) =>
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

//********************************************************************************************
// *        Finnal combat 
// *******************************************************************************************/

function areAllAntsDefeated() {
    const redAnts = getUnitsOfType('ant');
    const blackAnts = getUnitsOfType('blackAnt');
    return redAnts.length === 0 && blackAnts.length === 0;
}

function initiateFinalCombat() {
    const beetles = getUnitsOfType('beetle');
    const wasps = getUnitsOfType('wasp');
    const bees = getUnitsOfType('bee');
    const greyRollers = getUnitsOfType('greyRoller');

    // Move beetles towards wasps
    beetles.forEach(beetle => {
        const targetWasp = wasps.find(wasp => getDistance(beetle.position, wasp.position) < ATTACK_RANGE);
        if (targetWasp) {
            attackUnit(beetle, targetWasp);
        } else if (wasps.length > 0) {
            const closestWasp = wasps.reduce((prev, curr) =>
                getDistance(beetle.position, curr.position) < getDistance(beetle.position, prev.position) ? curr : prev
            );
            moveTowards(beetle, closestWasp);
        }
    });

    // Move bees towards grey rollers
    bees.forEach(bee => {
        const targetGreyRoller = greyRollers.find(roller => getDistance(bee.position, roller.position) < ATTACK_RANGE);
        if (targetGreyRoller) {
            attackUnit(bee, targetGreyRoller);
        } else if (greyRollers.length > 0) {
            const closestGreyRoller = greyRollers.reduce((prev, curr) =>
                getDistance(bee.position, curr.position) < getDistance(bee.position, prev.position) ? curr : prev
            );
            moveTowards(bee, closestGreyRoller);
        }
    });

    // If no ants, initiate final battle between beetles and grey rollers
    if (beetles.length === 0 && wasps.length === 0) {
        greyRollers.forEach(greyRoller => {
            let closestBeetle;
            if (beetles.length > 0) {
                closestBeetle = beetles.reduce((prev, curr) =>
                    getDistance(greyRoller.position, curr.position) < getDistance(greyRoller.position, prev.position) ? curr : prev
                );
                moveTowards(greyRoller, closestBeetle);
            }
        });
    }
}

function handleRemainingUnits(redAnts, blackAnts, greyRollers, blueBeetles) {
    if (blackAnts.length === 0) {
        // Black ants are defeated, red ants should engage grey rollers
        if (redAnts.length > 0) {
            moveAndAttack(redAnts, greyRollers);
        }
    } else if (redAnts.length > 0 && blackAnts.length > 0) {
        // When both red ants and black ants are present, prioritize attacks
        moveAndAttack(redAnts, blackAnts);
    }
}

// Function to handle continuous battle between wasps and bees
function continuousWaspBeeBattle(wasps, bees) {
    wasps.forEach(wasp => {
        const targetBee = bees.find(bee => getDistance(wasp.position, bee.position) < ATTACK_RANGE);
        if (targetBee) {
            attackUnit(wasp, targetBee);
        } else {
            const closestBee = bees.reduce((prev, curr) =>
                getDistance(wasp.position, curr.position) < getDistance(wasp.position, prev.position) ? curr : prev
            );
            moveTowards(wasp, closestBee);
        }
    });

    bees.forEach(bee => {
        const targetWasp = wasps.find(wasp => getDistance(bee.position, wasp.position) < ATTACK_RANGE);
        if (targetWasp) {
            attackUnit(bee, targetWasp);
        } else {
            const closestWasp = wasps.reduce((prev, curr) =>
                getDistance(bee.position, curr.position) < getDistance(bee.position, prev.position) ? curr : prev
            );
            moveTowards(bee, closestWasp);
        }
    });

    // Check if the battle continues
    const anyWaspsAlive = wasps.some(wasp => wasp.userData.health > 0);
    const anyBeesAlive = bees.some(bee => bee.userData.health > 0);

    // If at least one type is still alive, keep checking
    if (anyWaspsAlive && anyBeesAlive) {
        requestAnimationFrame(() => continuousWaspBeeBattle(wasps, bees));
    } else {
        if (anyWaspsAlive) {
            logEvent("All your units have been defeated! You lose!", true, true);
            endGame(); // Call a function to handle the end of the game
        }
        if (anyBeesAlive) {
            logEvent("All enemy units defeated! You win!", true, true);
            endGame(); // Call a function to handle the end of the game
        }

        logEvent("The battle has ended!", true, true);
        endGame(); // or handle end game differently
    }
}

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
        damage: damage,
        velocity: new THREE.Vector3(0, 0, 0),
        unitType: unitType
    };
    scene.add(unit);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);

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