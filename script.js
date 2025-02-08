let scene, camera, renderer, controls;
let floorMesh = null;         
let furnitureToPlace = null;  
let currentDraggedModel = null;
let activeFurniture = null;
let selectedFurniture = null;

function init() {
  // Create scene
  scene = new THREE.Scene();
  
  // Create camera (PerspectiveCamera: fov, aspect, near, far)
  const fov = 60;
  const aspect = window.innerWidth / window.innerHeight;
  const near = 0.1;
  const far = 1000;
  camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.set(0, 5, 10); // Adjust as needed

  // Create renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Append renderer to our container div
  const container = document.getElementById('canvas-container');
  container.appendChild(renderer.domElement);

  // Add basic lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(5, 10, 7);
  scene.add(directionalLight);

  // Add OrbitControls for camera
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.minDistance = 1;   // Keep the camera from zooming in too close
  controls.maxDistance = 50;  // Limit the max zoom-out distance

  // Create or load a floor for raycasting
  createFloorMesh(); 
  // or if you have a scanned room, call loadRoomModel(); then set floorMesh to that portion of the scene.

  // Listen for user clicks to place furniture
  document.addEventListener('click', onDocumentClick, false);

  // Initialize drag-and-drop for furniture items
  initDragAndDrop();

  makeObjectsSelectable();

  handleResize();

  // Start the animation loop
  animate();
}

function initDragAndDrop() {
  const furnitureItems = document.querySelectorAll('.furniture-item');
  const canvasContainer = document.getElementById('canvas-container');

  furnitureItems.forEach(item => {
      item.addEventListener('dragstart', (e) => {
          currentDraggedModel = item.dataset.model;
      });
  });

  canvasContainer.addEventListener('dragover', (e) => {
      e.preventDefault();
  });

  canvasContainer.addEventListener('drop', (e) => {
      e.preventDefault();
      if (currentDraggedModel) {
          const rect = canvasContainer.getBoundingClientRect();
          const mouse = new THREE.Vector2(
              ((e.clientX - rect.left) / canvasContainer.clientWidth) * 2 - 1,
              -((e.clientY - rect.top) / canvasContainer.clientHeight) * 2 + 1
          );

          const raycaster = new THREE.Raycaster();
          raycaster.setFromCamera(mouse, camera);
          const intersects = raycaster.intersectObject(floorMesh, true);

          if (intersects.length > 0) {
              const point = intersects[0].point;
              addFurniture(currentDraggedModel, point);
          }
      }
  });
}

function makeObjectsSelectable() {
  renderer.domElement.addEventListener('click', (event) => {
      const mouse = new THREE.Vector2(
          (event.clientX / window.innerWidth) * 2 - 1,
          -(event.clientY / window.innerHeight) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      // Get all objects in the scene except the floor
      const objects = scene.children.filter(obj => obj !== floorMesh);
      const intersects = raycaster.intersectObjects(objects, true);

      if (intersects.length > 0) {
          // Find the top-level parent of the intersected object
          let object = intersects[0].object;
          while (object.parent && object.parent !== scene) {
              object = object.parent;
          }
          selectedFurniture = object;
      } else {
          selectedFurniture = null;
      }
  });
}

function handleResize() {
  renderer.domElement.addEventListener('wheel', (event) => {
      if (selectedFurniture) {
          event.preventDefault();
          
          // Determine scaling factor based on wheel delta
          const scaleFactor = event.deltaY > 0 ? 0.95 : 1.05;
          
          // Apply scaling to the selected furniture
          selectedFurniture.scale.multiplyScalar(scaleFactor);
      }
  }, { passive: false });
}


// Example of creating a basic plane as our "floor"
function createFloorMesh() {
  const floorGeo = new THREE.PlaneGeometry(20, 20);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0xcccccc });
  floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.rotation.x = -Math.PI / 2; // Lay it flat (horizontal)
  floorMesh.receiveShadow = true;
  scene.add(floorMesh);
}

/*
// If you'd rather load a scanned room model, do something like:
function loadRoomModel() {
  const loader = new THREE.GLTFLoader();
  loader.load('models/room.glb', (gltf) => {
    const roomScene = gltf.scene;
    scene.add(roomScene);
    
    // If the floor is a separate mesh in your model, identify it here:
    // floorMesh = roomScene.getObjectByName('Floor');
  });
}
*/

// Function to load a furniture model and store it for placement
function addFurniture(modelPath, position) {
  const loader = new THREE.GLTFLoader();
  loader.load(modelPath, (gltf) => {
      const furniture = gltf.scene;
      furniture.position.copy(position);
      furniture.scale.set(0.5, 0.5, 0.5);
      scene.add(furniture);
      activeFurniture = furniture;
      console.log(`${modelPath} placed at`, position);
  }, 
  undefined, 
  (error) => {
      console.error(`Error loading model from ${modelPath}:`, error);
  });
}

// Raycasting handler for placing furniture on a click
function onDocumentClick(event) {
  // If we don't have any furniture ready to place, ignore the click
  if (!furnitureToPlace) return;

  // Convert mouse position to normalized device coordinates (-1 to +1)
  const mouse = new THREE.Vector2(
    ( event.clientX / window.innerWidth ) * 2 - 1,
    - ( event.clientY / window.innerHeight ) * 2 + 1
  );

  // Create a ray from the camera
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);

  // Intersect the ray with our floor mesh
  // (If using a scanned model as your floor, you can intersect with that mesh)
  const intersects = raycaster.intersectObject(floorMesh, true);

  if (intersects.length > 0) {
    // Get the point of intersection (where the user clicked on the floor)
    const point = intersects[0].point;

    // Clone the furniture so we can place multiple pieces (if you like)
    const newFurniture = furnitureToPlace.clone();
    newFurniture.position.copy(point);

    // Optional: adjust the Y position so it sits on top of the floor if needed
    // newFurniture.position.y += offsetHeight; // if the model sinks into floor
    
    scene.add(newFurniture);

    // If you want to place only one piece, reset furnitureToPlace
    // furnitureToPlace = null;
  }
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  scene.traverse((object) => {
    if (object.isMesh) {
      if (object === selectedFurniture || object.parent === selectedFurniture) {
        object.material.emissive = new THREE.Color(0x333333);
      } else {
        object.material.emissive = new THREE.Color(0x000000);
      }
    }
  });
  
  controls.update();
  renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Initialize
window.addEventListener('load', init);