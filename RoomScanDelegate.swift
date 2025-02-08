import Foundation
import RoomPlan

class RoomScanDelegate: NSObject, ObservableObject, RoomCaptureSessionDelegate {
    private var roomCaptureSession: RoomCaptureSession?
    
    /// Starts a new room capture session using RoomPlan.
    func startRoomCaptureSession() {
        roomCaptureSession = RoomCaptureSession()
        roomCaptureSession?.delegate = self
        roomCaptureSession?.run()  // Begin capturing the room
        print("Started room capture session")
    }
    
    // MARK: - RoomCaptureSessionDelegate Methods
    
    /// Called repeatedly as the capture session updates.  
    func roomCaptureSession(_ session: RoomCaptureSession, didUpdate result: CapturedRoom?) {
        if let result = result {
            print("Room updated: \(result.room)")
            // You can update your AR scene here with partial capture data.
        }
    }
    
    /// Called when the room capture session completes successfully.
    func roomCaptureSession(_ session: RoomCaptureSession, didCompleteWith result: CapturedRoom) {
        print("Capture session completed with room: \(result.room)")
        // Here you could analyze the room model (result.room)
        // and then call code to place digital furniture into your AR scene.
    }
    
    /// Called if the room capture session fails.
    func roomCaptureSession(_ session: RoomCaptureSession, didFailWithError error: Error) {
        print("Room capture session failed with error: \(error.localizedDescription)")
    }
    
    /// Called when the capture session is interrupted.
    func roomCaptureSessionWasInterrupted(_ session: RoomCaptureSession) {
        print("Room capture session was interrupted")
    }
} 