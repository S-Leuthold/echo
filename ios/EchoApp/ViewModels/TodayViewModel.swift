import SwiftUI
import Foundation

@MainActor
class TodayViewModel: ObservableObject {
    @Published var todaysBlocks: [Block] = []
    @Published var currentBlock: Block?
    @Published var currentTimeString: String = ""
    @Published var blockProgress: Double = 0.0
    
    private var timer: Timer?
    
    init() {
        loadTodaysSchedule()
        startTimer()
    }
    
    deinit {
        timer?.invalidate()
    }
    
    private func startTimer() {
        timer = Timer.scheduledTimer(withTimeInterval: 60, repeats: true) { _ in
            self.updateCurrentTime()
        }
        updateCurrentTime()
    }
    
    private func updateCurrentTime() {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        currentTimeString = formatter.string(from: Date())
        
        updateCurrentBlock()
    }
    
    private func updateCurrentBlock() {
        let now = Date()
        currentBlock = todaysBlocks.first { block in
            block.startTime <= now && now < block.endTime
        }
        
        if let currentBlock = currentBlock {
            let elapsed = now.timeIntervalSince(currentBlock.startTime)
            let total = currentBlock.endTime.timeIntervalSince(currentBlock.startTime)
            blockProgress = elapsed / total
        } else {
            blockProgress = 0.0
        }
    }
    
    private func loadTodaysSchedule() {
        // TODO: Load from file system
        // For now, create sample data
        todaysBlocks = [
            Block(
                id: "1",
                startTime: Calendar.current.date(bySettingHour: 6, minute: 0, second: 0, of: Date()) ?? Date(),
                endTime: Calendar.current.date(bySettingHour: 7, minute: 0, second: 0, of: Date()) ?? Date(),
                emoji: "🌅",
                projectName: "Personal",
                taskName: "Morning Routine",
                note: "Kickstart your day with energy and focus",
                type: .anchor
            ),
            Block(
                id: "2",
                startTime: Calendar.current.date(bySettingHour: 9, minute: 0, second: 0, of: Date()) ?? Date(),
                endTime: Calendar.current.date(bySettingHour: 10, minute: 30, second: 0, of: Date()) ?? Date(),
                emoji: "🚀",
                projectName: "Echo Development",
                taskName: "Session Logging Architecture",
                note: "Design robust session logging with external tool integration",
                type: .flex
            ),
            Block(
                id: "3",
                startTime: Calendar.current.date(bySettingHour: 10, minute: 30, second: 0, of: Date()) ?? Date(),
                endTime: Calendar.current.date(bySettingHour: 12, minute: 0, second: 0, of: Date()) ?? Date(),
                emoji: "⚙️",
                projectName: "Echo Development",
                taskName: "Git Integration",
                note: "Implement git activity capture for session logging",
                type: .flex
            ),
            Block(
                id: "4",
                startTime: Calendar.current.date(bySettingHour: 12, minute: 0, second: 0, of: Date()) ?? Date(),
                endTime: Calendar.current.date(bySettingHour: 13, minute: 0, second: 0, of: Date()) ?? Date(),
                emoji: "🍴",
                projectName: "Personal",
                taskName: "Lunch Break",
                note: "Recharge and refuel",
                type: .anchor
            ),
            Block(
                id: "5",
                startTime: Calendar.current.date(bySettingHour: 17, minute: 0, second: 0, of: Date()) ?? Date(),
                endTime: Calendar.current.date(bySettingHour: 18, minute: 0, second: 0, of: Date()) ?? Date(),
                emoji: "📧",
                projectName: "Admin",
                taskName: "Email & Admin",
                note: "Wrap up loose ends and manage communications",
                type: .flex
            )
        ]
        
        updateCurrentBlock()
    }
    
    func startSession(for block: Block) {
        // TODO: Implement session start
        print("Starting session for: \(block.taskName)")
    }
    
    func endSession() {
        // TODO: Implement session end
        print("Ending current session")
    }
    
    func addNote() {
        // TODO: Implement note adding
        print("Adding note")
    }
} 