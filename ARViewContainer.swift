import SwiftUI
import RealityKit
import ARKit

struct ARViewContainer: UIViewRepresentable {
    func makeUIView(context: Context) -> ARView {
        let arView = ARView(frame: .zero)
        // Configure the AR session for world tracking
        let configuration = ARWorldTrackingConfiguration()
        configuration.planeDetection = [.horizontal, .vertical]
        // Run the AR session. (Needs LiDAR for best results with RoomPlan.)
        arView.session.run(configuration)
        return arView
    }
    
    func updateUIView(_ uiView: ARView, context: Context) {}
}   