import SwiftUI
import Foundation

@MainActor
class SessionViewModel: ObservableObject {
    @Published var isSessionActive = false
    @Published var sessionDuration = "00:00"
    @Published var sessionNotes = ""
    
    // External tools state
    @Published var gitActivityEnabled = false
    @Published var timeTrackingEnabled = false
    @Published var screenRecordingEnabled = false
    @Published var notesEnabled = true
    
    private var timer: Timer?
    private var startTime: Date?
    private let api = EchoAPI.shared
    
    deinit {
        timer?.invalidate()
    }
    
    // MARK: - Session Management
    
    func startSession() {
        isSessionActive = true
        startTime = Date()
        startTimer()
        
        // TODO: Send session start to API
        print("Session started")
    }
    
    func endSession() {
        isSessionActive = false
        timer?.invalidate()
        timer = nil
        
        // TODO: Send session end to API
        print("Session ended")
    }
    
    private func startTimer() {
        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
            Task { @MainActor in
                self?.updateSessionDuration()
            }
        }
    }
    
    private func updateSessionDuration() {
        guard let startTime = startTime else { return }
        
        let elapsed = Date().timeIntervalSince(startTime)
        let minutes = Int(elapsed) / 60
        let seconds = Int(elapsed) % 60
        
        sessionDuration = String(format: "%02d:%02d", minutes, seconds)
    }
    
    // MARK: - External Tools
    
    func toggleGitActivity() {
        gitActivityEnabled.toggle()
        // TODO: Integrate with git activity tracking
        print("Git activity \(gitActivityEnabled ? "enabled" : "disabled")")
    }
    
    func toggleTimeTracking() {
        timeTrackingEnabled.toggle()
        // TODO: Integrate with time tracking service
        print("Time tracking \(timeTrackingEnabled ? "enabled" : "disabled")")
    }
    
    func toggleScreenRecording() {
        screenRecordingEnabled.toggle()
        // TODO: Integrate with screen recording service
        print("Screen recording \(screenRecordingEnabled ? "enabled" : "disabled")")
    }
    
    func toggleNotes() {
        notesEnabled.toggle()
        // TODO: Integrate with notes service
        print("Notes \(notesEnabled ? "enabled" : "disabled")")
    }
    
    // MARK: - Session Data
    
    func saveSession() async {
        // TODO: Save session data to API
        let sessionData: [String: Any] = [
            "duration": sessionDuration,
            "notes": sessionNotes,
            "external_tools": [
                "git_activity": gitActivityEnabled,
                "time_tracking": timeTrackingEnabled,
                "screen_recording": screenRecordingEnabled,
                "notes": notesEnabled
            ]
        ]
        
        print("Saving session data: \(sessionData)")
    }
    
    func loadSessionData() async {
        // TODO: Load session data from API
        print("Loading session data")
    }
} 