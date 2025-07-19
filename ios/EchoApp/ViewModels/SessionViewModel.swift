import SwiftUI
import Foundation

@MainActor
class SessionViewModel: ObservableObject {
    @Published var sessionNotes: String = ""
    @Published var sessionStartTime: Date = Date()
    @Published var sessionDuration: String = "0m"
    
    // External tool states
    @Published var gitEnabled: Bool = false
    @Published var browserEnabled: Bool = false
    @Published var ideEnabled: Bool = false
    @Published var calendarEnabled: Bool = false
    
    // External tool data
    @Published var gitData: String = ""
    @Published var browserData: String = ""
    @Published var ideData: String = ""
    @Published var calendarData: String = ""
    
    private var timer: Timer?
    
    init() {
        startSession()
    }
    
    deinit {
        timer?.invalidate()
    }
    
    private func startSession() {
        sessionStartTime = Date()
        startTimer()
    }
    
    private func startTimer() {
        timer = Timer.scheduledTimer(withTimeInterval: 60, repeats: true) { _ in
            self.updateSessionDuration()
        }
        updateSessionDuration()
    }
    
    private func updateSessionDuration() {
        let duration = Date().timeIntervalSince(sessionStartTime)
        let minutes = Int(duration / 60)
        
        if minutes < 60 {
            sessionDuration = "\(minutes)m"
        } else {
            let hours = minutes / 60
            let remainingMinutes = minutes % 60
            if remainingMinutes == 0 {
                sessionDuration = "\(hours)h"
            } else {
                sessionDuration = "\(hours)h \(remainingMinutes)m"
            }
        }
    }
    
    func addNote() {
        // TODO: Implement note adding logic
        print("Adding note: \(sessionNotes)")
    }
    
    func toggleGit() {
        gitEnabled.toggle()
        if gitEnabled {
            // TODO: Start git tracking
            gitData = "2 commits, 45 lines added"
        } else {
            gitData = ""
        }
    }
    
    func toggleBrowser() {
        browserEnabled.toggle()
        if browserEnabled {
            // TODO: Start browser tracking
            browserData = "3 tabs, 20min on GitHub"
        } else {
            browserData = ""
        }
    }
    
    func toggleIDE() {
        ideEnabled.toggle()
        if ideEnabled {
            // TODO: Start IDE tracking
            ideData = "2 files edited, 3 functions"
        } else {
            ideData = ""
        }
    }
    
    func toggleCalendar() {
        calendarEnabled.toggle()
        if calendarEnabled {
            // TODO: Start calendar tracking
            calendarData = "1 meeting, 2 interruptions"
        } else {
            calendarData = ""
        }
    }
    
    func saveSession() {
        // TODO: Save session data
        print("Saving session with notes: \(sessionNotes)")
        print("External tools enabled: Git(\(gitEnabled)), Browser(\(browserEnabled)), IDE(\(ideEnabled)), Calendar(\(calendarEnabled))")
    }
    
    func endSession() {
        timer?.invalidate()
        saveSession()
        
        // TODO: Process session data and save to file
        let sessionData = SessionData(
            sessionId: UUID().uuidString,
            startTime: sessionStartTime,
            endTime: Date(),
            notes: sessionNotes,
            externalTools: [
                "git": gitEnabled ? gitData : "",
                "browser": browserEnabled ? browserData : "",
                "ide": ideEnabled ? ideData : "",
                "calendar": calendarEnabled ? calendarData : ""
            ]
        )
        
        print("Session ended: \(sessionData)")
    }
}

struct SessionData {
    let sessionId: String
    let startTime: Date
    let endTime: Date
    let notes: String
    let externalTools: [String: String]
} 