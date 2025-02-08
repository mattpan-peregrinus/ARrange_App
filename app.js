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
        "./thumbnails/bookshelf.png",
        { x: 0, y: 0, z: 0 }
      ),
      new FurnitureItem(
        "Modern Sofa",
        "./models/sofa.glb",
        "./thumbnails/sofa.png",
        { x: 0, y: 0, z: 0 }
      ),
      new FurnitureItem(
        "Dining Table",
        "./models/table.glb",
        "./thumbnails/table.png",
        { x: 0, y: 0, z: 0 }
      ),
      new FurnitureItem(
        "Chair",
        "./models/chair.glb",
        "./thumbnails/chair.png",
        { x: 0, y: 0, z: 0 }
      ),
      new FurnitureItem(
        "Flowers",
        "./models/flowers.glb",
        "./thumbnails/flowers.png",
        { x: 0, y: 0, z: 0 }
      ),
    ];

    this.placedFurniture = [];
    this.selectedFurniture = null;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0));

    this.isShiftDown = false; // Add this to track shift key state

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

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    this.scene.add(ambientLight, directionalLight);

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

        // Scale furniture as before
        const bbox = new THREE.Box3().setFromObject(furniture);
        const size = bbox.getSize(new THREE.Vector3());

        const standardSizes = {
          "bookshelf.glb": { width: 0.8, height: 2.0, depth: 0.4 },
          "sofa.glb": { width: 2.0, height: 0.9, depth: 0.9 },
          "table.glb": { width: 1.6, height: 0.75, depth: 0.9 },
          "chair.glb": { width: 1.8, height: 1, depth: 1.2 },
          "flowers.glb": { width: 0.3, height: 0.4, depth: 0.3 }, // Typical size for a flower vase
        };

        const filename = furniturePath.split("/").pop();
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
        if (this.isShiftDown) {
          // Free movement in X and Z when holding shift
          furniture.position.x = intersectionPoint.x;
          furniture.position.z = intersectionPoint.z;
        } else {
          // Normal dragging behavior
          furniture.position.x = intersectionPoint.x;
          furniture.position.z = intersectionPoint.z;
        }
      }
    };

    const onMouseUp = () => {
      isDragging = false;
      document.body.style.cursor = "default";
      // Re-enable orbit controls
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

          // Clean up all event listeners
          window.removeEventListener("mousedown", onMouseDown);
          window.removeEventListener("mousemove", onMouseMove);
          window.removeEventListener("mouseup", onMouseUp);
          window.removeEventListener("keydown", onKeyDown);
        }
      }
    };

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
}

// Initialize the viewer
const viewer = new ARFurnitureViewer();

// Handle window resizing
window.addEventListener("resize", () => viewer.handleResize());
