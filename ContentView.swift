import SwiftUI
import RealityKit
import ARKit

struct ContentView: View {
    // Create an instance of our room scanning delegate
    @StateObject private var roomScanDelegate = RoomScanDelegate()
    
    var body: some View {
        ZStack {
            ARViewContainer()  // Shows your AR scene
                .edgesIgnoringSafeArea(.all)
            
            VStack {
                Spacer()
                Button(action: {
                    // Start the room capture session when tapped
                    roomScanDelegate.startRoomCaptureSession()
                }) {
                    Text("Start Room Scan")
                        .padding()
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(10)
                }
                .padding()
            }
        }
    }
} 