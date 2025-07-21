import SwiftUI

struct SessionView: View {
    let block: BlockResponse
    @StateObject private var sessionViewModel = SessionViewModel()
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                // Header
                headerView
                
                // Session Controls
                sessionControlsView
                
                // External Tools
                externalToolsView
                
                // Notes
                notesView
                
                Spacer()
            }
            .padding()
            .navigationTitle("Session")
            .toolbar {
                ToolbarItem(placement: .automatic) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
    
    private var headerView: some View {
        VStack(spacing: 12) {
            // Block info
            VStack(spacing: 8) {
                Text(block.emoji)
                    .font(.system(size: 48))
                
                Text(block.label)
                    .font(.title2)
                    .fontWeight(.semibold)
                    .multilineTextAlignment(.center)
                
                if !block.note.isEmpty {
                    Text(block.note)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                }
                
                HStack {
                    Label(block.type.capitalized, systemImage: blockTypeIcon(for: block.type))
                        .font(.caption)
                        .foregroundColor(blockTypeColor(for: block.type))
                    
                    Spacer()
                    
                    Text(formatDuration(block.duration))
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 8)
                    .fill(Color(NSColor.controlBackgroundColor))
            )
            
            // Session status
            if sessionViewModel.isSessionActive {
                VStack(spacing: 8) {
                    Text("Session Active")
                        .font(.headline)
                        .foregroundColor(.green)
                    
                    Text(sessionViewModel.sessionDuration)
                        .font(.title)
                        .fontWeight(.bold)
                        .monospacedDigit()
                }
                .padding()
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.green.opacity(0.1))
                )
            }
        }
    }
    
    private var sessionControlsView: some View {
        VStack(spacing: 16) {
            if sessionViewModel.isSessionActive {
                Button(action: sessionViewModel.endSession) {
                    HStack {
                        Image(systemName: "stop.fill")
                        Text("End Session")
                    }
                    .font(.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.red)
                    .cornerRadius(12)
                }
            } else {
                Button(action: sessionViewModel.startSession) {
                    HStack {
                        Image(systemName: "play.fill")
                        Text("Start Session")
                    }
                    .font(.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.green)
                    .cornerRadius(12)
                }
            }
        }
    }
    
    private var externalToolsView: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("External Tools")
                .font(.headline)
            
            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 12) {
                ExternalToolCard(
                    title: "Git Activity",
                    icon: "git",
                    isActive: sessionViewModel.gitActivityEnabled,
                    onToggle: sessionViewModel.toggleGitActivity
                )
                
                ExternalToolCard(
                    title: "Time Tracking",
                    icon: "timer",
                    isActive: sessionViewModel.timeTrackingEnabled,
                    onToggle: sessionViewModel.toggleTimeTracking
                )
                
                ExternalToolCard(
                    title: "Screen Recording",
                    icon: "video",
                    isActive: sessionViewModel.screenRecordingEnabled,
                    onToggle: sessionViewModel.toggleScreenRecording
                )
                
                ExternalToolCard(
                    title: "Notes",
                    icon: "note.text",
                    isActive: sessionViewModel.notesEnabled,
                    onToggle: sessionViewModel.toggleNotes
                )
            }
        }
    }
    
    private var notesView: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Session Notes")
                .font(.headline)
            
            TextEditor(text: $sessionViewModel.sessionNotes)
                .font(.body)
                .padding(8)
                .background(
                    RoundedRectangle(cornerRadius: 8)
                        .fill(Color(NSColor.controlBackgroundColor))
                )
                .frame(minHeight: 100)
        }
    }
    
    private func blockTypeColor(for type: String) -> Color {
        switch type {
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
    
    private func blockTypeIcon(for type: String) -> String {
        switch type {
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
    
    private func formatDuration(_ minutes: Int) -> String {
        let hours = minutes / 60
        let remainingMinutes = minutes % 60
        
        if hours > 0 {
            return remainingMinutes > 0 ? "\(hours)h \(remainingMinutes)m" : "\(hours)h"
        } else {
            return "\(remainingMinutes)m"
        }
    }
}

struct ExternalToolCard: View {
    let title: String
    let icon: String
    let isActive: Bool
    let onToggle: () -> Void
    
    var body: some View {
        Button(action: onToggle) {
            VStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundColor(isActive ? .white : .primary)
                
                Text(title)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(isActive ? .white : .primary)
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 8)
                    .fill(isActive ? Color.blue : Color(NSColor.controlBackgroundColor))
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

#Preview {
    SessionView(block: BlockResponse(
        id: "1",
        startTime: "09:00:00",
        endTime: "10:30:00",
        emoji: "🚀",
        projectName: "Echo Development",
        taskName: "API Server",
        note: "Build the API server for the macOS app",
        type: "flex",
        duration: 90,
        label: "Echo Development | API Server",
        isCurrent: true,
        progress: 0.5
    ))
} 