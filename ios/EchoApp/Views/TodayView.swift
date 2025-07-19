import SwiftUI

struct TodayView: View {
    @StateObject private var viewModel = TodayViewModel()
    @State private var showingSessionView = false
    @State private var selectedBlock: Block?
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Header
                headerView
                
                // Schedule
                scheduleView
                
                // Quick Actions
                quickActionsView
            }
            .navigationTitle("Today")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Plan") {
                        // TODO: Launch planning
                    }
                }
            }
        }
        .sheet(isPresented: $showingSessionView) {
            if let block = selectedBlock {
                SessionView(block: block)
            }
        }
    }
    
    private var headerView: some View {
        VStack(spacing: 12) {
            // Current time and progress
            HStack {
                VStack(alignment: .leading) {
                    Text(viewModel.currentTimeString)
                        .font(.title2)
                        .fontWeight(.semibold)
                    
                    if let currentBlock = viewModel.currentBlock {
                        Text("In: \(currentBlock.label)")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                }
                
                Spacer()
                
                // Progress indicator
                if let currentBlock = viewModel.currentBlock {
                    ProgressView(value: viewModel.blockProgress)
                        .progressViewStyle(CircularProgressViewStyle())
                        .scaleEffect(0.8)
                }
            }
            .padding(.horizontal)
            
            Divider()
        }
    }
    
    private var scheduleView: some View {
        ScrollView {
            LazyVStack(spacing: 8) {
                ForEach(viewModel.todaysBlocks, id: \.id) { block in
                    ScheduleBlockView(
                        block: block,
                        isCurrent: block.id == viewModel.currentBlock?.id,
                        onTap: {
                            selectedBlock = block
                            showingSessionView = true
                        }
                    )
                }
            }
            .padding(.horizontal)
        }
    }
    
    private var quickActionsView: some View {
        VStack(spacing: 16) {
            Divider()
            
            HStack(spacing: 20) {
                QuickActionButton(
                    title: "Start Session",
                    icon: "play.fill",
                    color: .green
                ) {
                    // TODO: Start session
                }
                
                QuickActionButton(
                    title: "End Session",
                    icon: "stop.fill",
                    color: .red
                ) {
                    // TODO: End session
                }
                
                QuickActionButton(
                    title: "Add Note",
                    icon: "note.text",
                    color: .blue
                ) {
                    // TODO: Add note
                }
            }
            .padding(.horizontal)
        }
        .padding(.bottom)
    }
}

struct ScheduleBlockView: View {
    let block: Block
    let isCurrent: Bool
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 12) {
                // Time
                VStack(alignment: .leading, spacing: 2) {
                    Text(block.startTimeString)
                        .font(.caption)
                        .fontWeight(.medium)
                    Text(block.endTimeString)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .frame(width: 50, alignment: .leading)
                
                // Block content
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text(block.emoji)
                            .font(.title2)
                        
                        VStack(alignment: .leading, spacing: 2) {
                            Text(block.projectName)
                                .font(.headline)
                                .fontWeight(.semibold)
                            
                            Text(block.taskName)
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        
                        Spacer()
                        
                        if isCurrent {
                            Image(systemName: "circle.fill")
                                .foregroundColor(.green)
                                .font(.caption)
                        }
                    }
                    
                    if !block.note.isEmpty {
                        Text(block.note)
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .lineLimit(2)
                    }
                }
                
                Spacer()
                
                // Duration
                Text(block.durationString)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color(.systemBackground))
                    .shadow(color: isCurrent ? .green.opacity(0.3) : .black.opacity(0.1), radius: 4, x: 0, y: 2)
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct QuickActionButton: View {
    let title: String
    let icon: String
    let color: Color
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundColor(color)
                
                Text(title)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(.primary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(
                RoundedRectangle(cornerRadius: 8)
                    .fill(Color(.systemGray6))
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

#Preview {
    TodayView()
} 