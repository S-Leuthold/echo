import SwiftUI

struct SessionView: View {
    let block: Block
    @StateObject private var viewModel = SessionViewModel()
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                // Session header
                sessionHeaderView
                
                // Session notes
                sessionNotesView
                
                // External tool data
                externalToolsView
                
                Spacer()
                
                // Action buttons
                actionButtonsView
            }
            .padding()
            .navigationTitle("Session")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
    
    private var sessionHeaderView: some View {
        VStack(spacing: 12) {
            HStack {
                Text(block.emoji)
                    .font(.largeTitle)
                
                VStack(alignment: .leading, spacing: 4) {
                    Text(block.projectName)
                        .font(.headline)
                        .fontWeight(.semibold)
                    
                    Text(block.taskName)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 4) {
                    Text(viewModel.sessionDuration)
                        .font(.title2)
                        .fontWeight(.semibold)
                    
                    Text("Duration")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            if !block.note.isEmpty {
                Text(block.note)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.leading)
            }
            
            Divider()
        }
    }
    
    private var sessionNotesView: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Session Notes")
                .font(.headline)
                .fontWeight(.semibold)
            
            TextEditor(text: $viewModel.sessionNotes)
                .frame(minHeight: 100)
                .padding(8)
                .background(
                    RoundedRectangle(cornerRadius: 8)
                        .fill(Color(.systemGray6))
                )
            
            HStack {
                Button("Add Note") {
                    viewModel.addNote()
                }
                .buttonStyle(.borderedProminent)
                
                Spacer()
                
                Button("Clear") {
                    viewModel.sessionNotes = ""
                }
                .buttonStyle(.bordered)
            }
        }
    }
    
    private var externalToolsView: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("External Tools")
                .font(.headline)
                .fontWeight(.semibold)
            
            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 12) {
                ExternalToolCard(
                    title: "Git",
                    icon: "git",
                    data: viewModel.gitData,
                    isEnabled: viewModel.gitEnabled
                ) {
                    viewModel.toggleGit()
                }
                
                ExternalToolCard(
                    title: "Browser",
                    icon: "globe",
                    data: viewModel.browserData,
                    isEnabled: viewModel.browserEnabled
                ) {
                    viewModel.toggleBrowser()
                }
                
                ExternalToolCard(
                    title: "IDE",
                    icon: "code",
                    data: viewModel.ideData,
                    isEnabled: viewModel.ideEnabled
                ) {
                    viewModel.toggleIDE()
                }
                
                ExternalToolCard(
                    title: "Calendar",
                    icon: "calendar",
                    data: viewModel.calendarData,
                    isEnabled: viewModel.calendarEnabled
                ) {
                    viewModel.toggleCalendar()
                }
            }
        }
    }
    
    private var actionButtonsView: some View {
        VStack(spacing: 12) {
            Button("End Session") {
                viewModel.endSession()
                dismiss()
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            
            Button("Save & Continue") {
                viewModel.saveSession()
            }
            .buttonStyle(.bordered)
            .controlSize(.large)
        }
    }
}

struct ExternalToolCard: View {
    let title: String
    let icon: String
    let data: String
    let isEnabled: Bool
    let onToggle: () -> Void
    
    var body: some View {
        Button(action: onToggle) {
            VStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundColor(isEnabled ? .green : .gray)
                
                Text(title)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(isEnabled ? .primary : .secondary)
                
                if !data.isEmpty {
                    Text(data)
                        .font(.caption2)
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(
                RoundedRectangle(cornerRadius: 8)
                    .fill(isEnabled ? Color(.systemGray6) : Color(.systemGray5))
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

#Preview {
    SessionView(block: Block(
        id: "1",
        startTime: Date(),
        endTime: Date().addingTimeInterval(3600),
        emoji: "🚀",
        projectName: "Echo Development",
        taskName: "Session Logging",
        note: "Design robust session logging with external tool integration",
        type: .flex
    ))
} 