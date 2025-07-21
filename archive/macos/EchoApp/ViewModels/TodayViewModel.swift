import SwiftUI
import Foundation
import Combine

@MainActor
class TodayViewModel: ObservableObject {
    @Published var todaysBlocks: [BlockResponse] = []
    @Published var currentBlock: BlockResponse?
    @Published var currentTimeString: String = ""
    @Published var dateString: String = ""
    @Published var blockProgress: Double = 0.0
    @Published var isLoading = false
    @Published var error: EchoAPIError?
    @Published var emailSummary: [String: Any] = [:]
    @Published var planningStats: [String: Any] = [:]
    
    private var timer: Timer?
    private var cancellables = Set<AnyCancellable>()
    private let api = EchoAPI.shared
    
    init() {
        startTimer()
        loadTodaysSchedule()
    }
    
    deinit {
        timer?.invalidate()
        cancellables.removeAll()
    }
    
    private func startTimer() {
        timer = Timer.scheduledTimer(withTimeInterval: 60, repeats: true) { [weak self] _ in
            Task { @MainActor in
                self?.updateCurrentTime()
            }
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
            // Parse time strings and compare
            let startTime = parseTimeString(block.startTime)
            let endTime = parseTimeString(block.endTime)
            let currentTime = Calendar.current.dateComponents([.hour, .minute], from: now)
            
            let startMinutes = startTime.hour * 60 + startTime.minute
            let endMinutes = endTime.hour * 60 + endTime.minute
            let currentMinutes = currentTime.hour! * 60 + currentTime.minute!
            
            return startMinutes <= currentMinutes && currentMinutes < endMinutes
        }
        
        if let currentBlock = currentBlock {
            let startTime = parseTimeString(currentBlock.startTime)
            let endTime = parseTimeString(currentBlock.endTime)
            let currentTime = Calendar.current.dateComponents([.hour, .minute], from: now)
            
            let startMinutes = startTime.hour * 60 + startTime.minute
            let endMinutes = endTime.hour * 60 + endTime.minute
            let currentMinutes = currentTime.hour! * 60 + currentTime.minute!
            
            let elapsed = currentMinutes - startMinutes
            let total = endMinutes - startMinutes
            blockProgress = max(0.0, min(1.0, Double(elapsed) / Double(total)))
        } else {
            blockProgress = 0.0
        }
    }
    
    private func parseTimeString(_ timeString: String) -> (hour: Int, minute: Int) {
        let components = timeString.split(separator: ":")
        if components.count >= 2 {
            let hour = Int(components[0]) ?? 0
            let minute = Int(components[1]) ?? 0
            return (hour: hour, minute: minute)
        }
        return (hour: 0, minute: 0)
    }
    
    func loadTodaysSchedule() {
        Task {
            do {
                isLoading = true
                error = nil
                
                let todayResponse = try await api.fetchTodaySchedule()
                
                todaysBlocks = todayResponse.blocks
                currentBlock = todayResponse.currentBlock
                currentTimeString = todayResponse.currentTime
                dateString = todayResponse.date
                emailSummary = todayResponse.emailSummary
                planningStats = todayResponse.planningStats
                
                updateCurrentBlock()
                
            } catch let apiError as EchoAPIError {
                self.error = apiError
            } catch {
                self.error = .networkError(error)
            }
            
            isLoading = false
        }
    }
    
    func refreshData() {
        loadTodaysSchedule()
    }
    
    func clearError() {
        error = nil
    }
    
    // MARK: - Email Summary Helpers
    
    var emailActionItems: [String] {
        if let actionItems = emailSummary["action_items"] as? [String] {
            return actionItems
        }
        return []
    }
    
    var emailSummaryText: String {
        if let summary = emailSummary["summary"] as? String {
            return summary
        }
        return "No email summary available"
    }
    
    var totalUnrespondedEmails: Int {
        return emailSummary["total_unresponded"] as? Int ?? 0
    }
    
    var urgentEmailCount: Int {
        return emailSummary["urgent_count"] as? Int ?? 0
    }
    
    var highPriorityEmailCount: Int {
        return emailSummary["high_priority_count"] as? Int ?? 0
    }
    
    // MARK: - Planning Stats Helpers
    
    var totalScheduledTasks: Int {
        return planningStats["total_scheduled"] as? Int ?? 0
    }
    
    var totalCompletedTasks: Int {
        return planningStats["total_completed"] as? Int ?? 0
    }
    
    var completionRate: Double {
        return planningStats["completion_rate"] as? Double ?? 0.0
    }
    
    // MARK: - Block Helpers
    
    func blockTypeColor(for block: BlockResponse) -> Color {
        switch block.type {
        case "anchor":
            return .blue
        case "flex":
            return .green
        case "fixed":
            return .orange
        default:
            return .gray
        }
    }
    
    func blockTypeIcon(for block: BlockResponse) -> String {
        switch block.type {
        case "anchor":
            return "anchor"
        case "flex":
            return "leaf"
        case "fixed":
            return "clock"
        default:
            return "circle"
        }
    }
    
    func formatBlockDuration(_ minutes: Int) -> String {
        let hours = minutes / 60
        let remainingMinutes = minutes % 60
        
        if hours > 0 {
            return remainingMinutes > 0 ? "\(hours)h \(remainingMinutes)m" : "\(hours)h"
        } else {
            return "\(remainingMinutes)m"
        }
    }
    
    func formatBlockTime(_ timeString: String) -> String {
        // Convert "HH:MM:SS" to "HH:MM"
        let components = timeString.split(separator: ":")
        if components.count >= 2 {
            return "\(components[0]):\(components[1])"
        }
        return timeString
    }
} 