import Foundation

struct Block: Identifiable, Codable {
    let id: String
    let startTime: Date
    let endTime: Date
    let emoji: String
    let projectName: String
    let taskName: String
    let note: String
    let type: BlockType
    
    var duration: TimeInterval {
        endTime.timeIntervalSince(startTime)
    }
    
    var startTimeString: String {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: startTime)
    }
    
    var endTimeString: String {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: endTime)
    }
    
    var durationString: String {
        let minutes = Int(duration / 60)
        if minutes < 60 {
            return "\(minutes)m"
        } else {
            let hours = minutes / 60
            let remainingMinutes = minutes % 60
            if remainingMinutes == 0 {
                return "\(hours)h"
            } else {
                return "\(hours)h \(remainingMinutes)m"
            }
        }
    }
    
    var label: String {
        "\(projectName) | \(taskName)"
    }
}

enum BlockType: String, Codable, CaseIterable {
    case anchor = "anchor"
    case flex = "flex"
    case fixed = "fixed"
    
    var displayName: String {
        switch self {
        case .anchor:
            return "Anchor"
        case .flex:
            return "Flex"
        case .fixed:
            return "Fixed"
        }
    }
    
    var color: String {
        switch self {
        case .anchor:
            return "blue"
        case .flex:
            return "green"
        case .fixed:
            return "orange"
        }
    }
} 