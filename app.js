import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// Add this new class to manage furniture data
class FurnitureItem {
  constructor(
    name,
    modelPath,
    thumbnailPath,
    defaultPosition = { x: 0, y: 0, z: 0 }
  ) {
    this.name = name;
    this.modelPath = modelPath;
    this.thumbnailPath = thumbnailPath;
    this.defaultPosition = defaultPosition;
  }
}

class ARFurnitureViewer {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.loader = new GLTFLoader();

    this.furnitureItems = [
      new FurnitureItem(
        "Modern Bookshelf",
        "./models/bookshelf.glb",
        "./thumbnails/bookshelf.jpg",
        { x: 0, y: 0, z: 0 }
      ),
      new FurnitureItem(
        "Dining Table",
        "./models/table.glb",
        "./thumbnails/table.jpg",
        { x: 0, y: 0, z: 0 }
      ),
      new FurnitureItem(
        "Chair",
        "./models/chair.glb",
        "./thumbnails/chair.jpg",
        { x: 0, y: 0, z: 0 }
      ),
      new FurnitureItem(
        "Flowers",
        "./models/flowers.glb",
        "./thumbnails/flowers.jpg",
        { x: 0, y: 0, z: 0 }
      ),
    ];

    this.placedFurniture = [];
    this.selectedFurniture = null;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0));

    this.isShiftDown = false; // Add this to track shift key state

    this.selectionBox = null; // Add this to track the selection outline
    this.outlineMaterial = new THREE.LineBasicMaterial({
      color: 0x00ff00, // Green outline
      linewidth: 2,
    });

    // Add rotation amount in radians
    this.rotationAmount = Math.PI / 32; // 11.25 degrees

    // Add keyboard handler for rotation
    window.addEventListener("keydown", (event) => {
      if (this.selectedFurniture) {
        switch (event.key) {
          case "ArrowLeft":
            this.selectedFurniture.rotation.y += this.rotationAmount;
            // Update selection box rotation
            if (this.selectionBox) {
              this.selectionBox.quaternion.copy(
                this.selectedFurniture.quaternion
              );
            }
            break;
          case "ArrowRight":
            this.selectedFurniture.rotation.y -= this.rotationAmount;
            // Update selection box rotation
            if (this.selectionBox) {
              this.selectionBox.quaternion.copy(
                this.selectedFurniture.quaternion
              );
            }
            break;
        }
      }
    });

    // Add shift key listeners
    window.addEventListener("keydown", (event) => {
      if (event.key === "Shift") {
        this.isShiftDown = true;
      }
    });

    window.addEventListener("keyup", (event) => {
      if (event.key === "Shift") {
        this.isShiftDown = false;
      }
    });

    this.init();
  }

  init() {
    // Setup renderer
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById("ar-overlay").appendChild(this.renderer.domElement);

    // Add background color to make scene visible
    this.scene.background = new THREE.Color(0xf0f0f0);

    // Enhanced lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0); // Increased intensity

    // Main directional light (sun-like)
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
    mainLight.position.set(5, 5, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;

    // Fill light from opposite direction
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
    fillLight.position.set(-5, 3, -5);

    // Add some point lights for more dynamic lighting
    const pointLight1 = new THREE.PointLight(0xffffff, 0.5);
    pointLight1.position.set(0, 4, 0);

    const pointLight2 = new THREE.PointLight(0xffffff, 0.3);
    pointLight2.position.set(5, 2, -5);

    const pointLight3 = new THREE.PointLight(0xffffff, 0.3);
    pointLight3.position.set(-5, 2, 5);

    // Optional: Add environment map for better reflections
    const envMapTexture = new THREE.CubeTextureLoader().load([
      "textures/env/px.jpg",
      "textures/env/nx.jpg",
      "textures/env/py.jpg",
      "textures/env/ny.jpg",
      "textures/env/pz.jpg",
      "textures/env/nz.jpg",
    ]);
    this.scene.environment = envMapTexture;

    // Add all lights to the scene
    this.scene.add(
      ambientLight,
      mainLight,
      fillLight,
      pointLight1,
      pointLight2,
      pointLight3
    );

    // Adjust renderer settings for better lighting
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.physicallyCorrectLights = true;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2; // Increased exposure

    // Setup camera - move it back further
    this.camera.position.set(0, 2, 10);
    this.camera.lookAt(0, 0, 0);

    // Add controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // Load room scan
    this.loadRoomScan();

    this.setupFurnitureGallery();

    // Add drag and drop event listeners
    this.setupDragAndDrop();

    // Start animation loop
    this.animate();
  }

  loadRoomScan() {
    this.loader.load(
      "./models/room.glb",
      (gltf) => {
        const room = gltf.scene;

        // Scale room to a standard size (assuming room should be about 5 units wide)
        const bbox = new THREE.Box3().setFromObject(room);
        const roomSize = bbox.getSize(new THREE.Vector3());
        const desiredWidth = 5;
        const scale = desiredWidth / roomSize.x;
        room.scale.set(scale, scale, scale);

        this.scene.add(room);
        console.log("Room loaded successfully");

        // Store room dimensions for future reference
        this.roomDimensions = roomSize.multiplyScalar(scale);

        // Update the drag plane to match the room's floor
        this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      },
      (progress) => {
        console.log(
          "Loading room:",
          (progress.loaded / progress.total) * 100 + "%"
        );
      },
      (error) => {
        console.error("Error loading room:", error);
        console.error("Error details:", {
          message: error.message,
          type: error.type,
          url: "./models/room.glb",
        });

        // Fallback to a ground plane if room loading fails
        console.log("Creating fallback ground plane...");
        const groundGeometry = new THREE.PlaneGeometry(10, 10);
        const groundMaterial = new THREE.MeshPhongMaterial({
          color: 0x999999,
          side: THREE.DoubleSide,
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        this.scene.add(ground);
      }
    );
  }

  setupDragAndDrop() {
    const overlay = document.getElementById("ar-overlay");

    overlay.addEventListener("dragover", (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    });

    overlay.addEventListener("drop", (event) => {
      event.preventDefault();
      const modelPath = event.dataTransfer.getData("model");

      // Calculate drop position in 3D space
      this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);

      // Get all objects in the scene except the currently selected furniture
      const objects = this.scene.children.filter(
        (obj) => obj.type === "Group" && !this.placedFurniture.includes(obj)
      );

      const intersects = this.raycaster.intersectObjects(objects, true);

      if (intersects.length > 0) {
        const intersection = intersects[0];
        const normal = intersection.face.normal.clone();
        normal.transformDirection(intersection.object.matrixWorld);
        const isWall = Math.abs(normal.y) < 0.5;
        const position = intersection.point;

        this.loadFurniture(modelPath, {
          position: position,
          normal: normal,
          isWall: isWall,
        });
      }
    });
  }

  setupFurnitureGallery() {
    const gallery = document.getElementById("furniture-gallery");

    this.furnitureItems.forEach((item) => {
      const itemElement = document.createElement("div");
      itemElement.className = "furniture-item";
      itemElement.draggable = true;

      itemElement.innerHTML = `
        <img src="${item.thumbnailPath}" alt="${item.name}">
        <h3>${item.name}</h3>
      `;

      // Add drag start event
      itemElement.addEventListener("dragstart", (event) => {
        event.dataTransfer.setData("model", item.modelPath);
        event.dataTransfer.effectAllowed = "move";
        itemElement.classList.add("dragging");
      });

      // Add drag end event
      itemElement.addEventListener("dragend", () => {
        itemElement.classList.remove("dragging");
      });

      // Keep the click event for backward compatibility
      itemElement.addEventListener("click", () => {
        this.loadFurniture(item.modelPath, item.defaultPosition);
      });

      gallery.appendChild(itemElement);
    });
  }

  loadFurniture(
    furniturePath,
    dropInfo = {
      position: new THREE.Vector3(),
      normal: new THREE.Vector3(0, 1, 0),
      isWall: false,
    }
  ) {
    this.loader.load(
      furniturePath,
      (gltf) => {
        const furniture = gltf.scene;
        const filename = furniturePath.split("/").pop();

        // Add material modification
        furniture.traverse((child) => {
          if (child.isMesh) {
            // Clone the material to avoid affecting other instances
            child.material = child.material.clone();

            if (filename === "bookshelf.glb") {
              // Special handling for bookshelf
              child.material.roughness = 0.7; // More realistic wood texture
              child.material.metalness = 0.1; // Slight metallic for varnished look
              child.material.envMapIntensity = 0.8; // Subtle reflections

              // Darken the color for more realistic wood
              if (child.material.color) {
                const currentColor = child.material.color;
                currentColor.multiplyScalar(0.7); // Darken by 30%
              }

              // Enhance shadow properties
              child.castShadow = true;
              child.receiveShadow = true;
              child.material.shadowBias = -0.001;
              child.material.dithering = true;
            } else {
              // Default handling for other furniture
              if (child.material.color) {
                const currentColor = child.material.color;
                currentColor.lerp(new THREE.Color(1, 1, 1), 0.3);
              }
              child.castShadow = true;
              child.receiveShadow = true;
            }
          }
        });

        // Scale furniture as before
        const bbox = new THREE.Box3().setFromObject(furniture);
        const size = bbox.getSize(new THREE.Vector3());

        const standardSizes = {
          "bookshelf.glb": { width: 0.8, height: 2.0, depth: 2 },
          "table.glb": { width: 1.6, height: 1, depth: 1.2 },
          "chair.glb": { width: 1.8, height: 1, depth: 0.7 },
          "flowers.glb": { width: 0.3, height: 0.4, depth: 0.3 }, // Typical size for a flower vase
        };

        const standardSize = standardSizes[filename] || {
          width: 1,
          height: 1,
          depth: 1,
        };

        const scaleX = standardSize.width / size.x;
        const scaleY = standardSize.height / size.y;
        const scaleZ = standardSize.depth / size.z;
        const scale = Math.min(scaleX, scaleY, scaleZ);
        furniture.scale.set(scale, scale, scale);

        // Center the pivot point
        bbox.setFromObject(furniture);
        const center = bbox.getCenter(new THREE.Vector3());
        furniture.position.sub(center);

        // Align furniture with the surface
        if (dropInfo.isWall) {
          // For walls, align the back of the furniture with the wall
          // and make it face outward from the wall
          const rotationMatrix = new THREE.Matrix4();
          rotationMatrix.lookAt(
            new THREE.Vector3(),
            dropInfo.normal,
            new THREE.Vector3(0, 1, 0)
          );
          furniture.quaternion.setFromRotationMatrix(rotationMatrix);

          // Move furniture slightly away from wall to prevent clipping
          const offset = 0.01; // 1cm offset
          furniture.position
            .copy(dropInfo.position)
            .add(dropInfo.normal.multiplyScalar(offset));
        } else {
          // For floor/horizontal surfaces, just place it on top
          furniture.position.copy(dropInfo.position);
          // Keep original rotation or align with room walls if needed
        }

        this.scene.add(furniture);
        this.placedFurniture.push(furniture);
        this.selectedFurniture = furniture;
        this.setupFurnitureDrag(furniture);
      },
      (progress) => {
        console.log(
          "Loading furniture:",
          (progress.loaded / progress.total) * 100 + "%"
        );
      },
      (error) => {
        console.error("Error loading furniture:", error);
      }
    );
  }

  setupFurnitureDrag(furniture) {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let isDragging = false;
    let dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0));
    let intersectionPoint = new THREE.Vector3();

    const onMouseDown = (event) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, this.camera);
      const intersects = raycaster.intersectObject(furniture, true);

      if (intersects.length > 0) {
        isDragging = true;
        this.selectedFurniture = furniture;
        dragPlane.constant = -furniture.position.y;
        document.body.style.cursor = "grabbing";

        // Add selection box when furniture is clicked
        this.updateSelectionBox(furniture);

        // Disable orbit controls if shift is held
        if (this.isShiftDown) {
          this.controls.enabled = false;
        }
      }
    };

    const onMouseMove = (event) => {
      if (!isDragging) return;

      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, this.camera);
      if (raycaster.ray.intersectPlane(dragPlane, intersectionPoint)) {
        furniture.position.x = intersectionPoint.x;
        furniture.position.z = intersectionPoint.z;

        // Update selection box position while dragging
        if (this.selectionBox) {
          const bbox = new THREE.Box3().setFromObject(furniture);
          const center = bbox.getCenter(new THREE.Vector3());
          this.selectionBox.position.copy(center);
        }
      }
    };

    const onMouseUp = () => {
      isDragging = false;
      document.body.style.cursor = "default";
      this.controls.enabled = true;
    };

    const onKeyDown = (event) => {
      if (event.key === "Delete" || event.key === "Backspace") {
        if (this.selectedFurniture === furniture) {
          this.scene.remove(furniture);
          this.placedFurniture = this.placedFurniture.filter(
            (f) => f !== furniture
          );
          this.selectedFurniture = null;
          // Remove selection box when furniture is deleted
          this.updateSelectionBox(null);

          // Clean up all event listeners
          window.removeEventListener("mousedown", onMouseDown);
          window.removeEventListener("mousemove", onMouseMove);
          window.removeEventListener("mouseup", onMouseUp);
          window.removeEventListener("keydown", onKeyDown);
        }
      }
    };

    // Add click handler for deselection
    window.addEventListener("mousedown", (event) => {
      // Check if click is not on any furniture
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, this.camera);
      const intersects = raycaster.intersectObjects(this.placedFurniture, true);

      if (intersects.length === 0) {
        // Click was on empty space, remove selection
        this.selectedFurniture = null;
        this.updateSelectionBox(null);
      }
    });

    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("keydown", onKeyDown);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  handleResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // Add this new method to create/update selection outline
  updateSelectionBox(furniture) {
    // Remove existing selection box if it exists
    if (this.selectionBox) {
      this.scene.remove(this.selectionBox);
    }

    if (furniture) {
      // Create a new bounding box
      const bbox = new THREE.Box3().setFromObject(furniture);
      const size = bbox.getSize(new THREE.Vector3());
      const center = bbox.getCenter(new THREE.Vector3());

      // Create wireframe geometry
      const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
      const edges = new THREE.EdgesGeometry(geometry);
      this.selectionBox = new THREE.LineSegments(edges, this.outlineMaterial);

      // Position the box at the furniture's position
      this.selectionBox.position.copy(center);
      this.selectionBox.quaternion.copy(furniture.quaternion);

      this.scene.add(this.selectionBox);
    }
  }
}

// Initialize the viewer
const viewer = new ARFurnitureViewer();

// Handle window resizing
window.addEventListener("resize", () => viewer.handleResize());
