import SwiftUI

struct TodayView: View {
    @StateObject private var viewModel = TodayViewModel()
    @State private var showingSessionView = false
    @State private var selectedBlock: BlockResponse?
    @State private var showingPlanningView = false
    @State private var showingSettingsView = false
    
    var body: some View {
        VStack(spacing: 0) {
            // Header
            headerView
            
            // Email Summary (if available)
            if !viewModel.emailActionItems.isEmpty {
                emailSummaryView
            }
            
            // Schedule
            scheduleView
            
            // Quick Actions
            quickActionsView
        }
        .background(Color(NSColor.windowBackgroundColor))
        .navigationTitle("Today")
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button("Plan") {
                    print("Plan button tapped!")
                    showingPlanningView = true
                }
                .buttonStyle(.borderedProminent)
            }
            
            ToolbarItem(placement: .primaryAction) {
                Button("Refresh") {
                    print("Refresh button tapped!")
                    viewModel.refreshData()
                }
                .disabled(viewModel.isLoading)
            }
            
            ToolbarItem(placement: .primaryAction) {
                Button("Settings") {
                    print("Settings button tapped!")
                    showingSettingsView = true
                }
            }
        }
        .sheet(isPresented: $showingPlanningView) {
            NavigationView {
                PlanningView()
            }
        }
        .sheet(isPresented: $showingSettingsView) {
            NavigationView {
                SettingsView()
            }
        }
        .sheet(isPresented: $showingSessionView) {
            NavigationView {
                if let block = selectedBlock {
                    SessionView(block: block)
                }
            }
        }
        .alert("Error", isPresented: .constant(viewModel.error != nil)) {
            Button("OK") {
                viewModel.clearError()
            }
        } message: {
            Text(viewModel.error?.localizedDescription ?? "Unknown error")
        }
        .onAppear {
            viewModel.loadTodaysSchedule()
        }
    }
    
    private var headerView: some View {
        VStack(spacing: 16) {
            // Current time and progress
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(viewModel.currentTimeString)
                        .font(.system(size: 32, weight: .light, design: .monospaced))
                        .foregroundColor(.primary)
                    
                    if let currentBlock = viewModel.currentBlock {
                        Text("In: \(currentBlock.label)")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                }
                
                Spacer()
                
                // Progress indicator
                if viewModel.currentBlock != nil {
                    VStack(spacing: 8) {
                        ProgressView(value: viewModel.blockProgress)
                            .progressViewStyle(CircularProgressViewStyle())
                            .scaleEffect(1.2)
                        
                        Text("\(Int(viewModel.blockProgress * 100))%")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }
            .padding(.horizontal, 24)
            .padding(.vertical, 16)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color(NSColor.controlBackgroundColor))
            )
            .padding(.horizontal)
            
            Divider()
                .padding(.horizontal)
        }
    }
    
    private var emailSummaryView: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "envelope.fill")
                    .foregroundColor(.blue)
                    .font(.title2)
                Text("Email Summary")
                    .font(.headline)
                    .fontWeight(.semibold)
                Spacer()
                Text("\(viewModel.totalUnrespondedEmails) unresponded")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(
                        Capsule()
                            .fill(Color.blue.opacity(0.2))
                    )
            }
            
            Text(viewModel.emailSummaryText)
                .font(.subheadline)
                .foregroundColor(.secondary)
            
            if !viewModel.emailActionItems.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Action Items:")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.secondary)
                    
                    ForEach(viewModel.emailActionItems.prefix(3), id: \.self) { item in
                        HStack(alignment: .top, spacing: 8) {
                            Image(systemName: "circle.fill")
                                .font(.system(size: 6))
                                .foregroundColor(.blue)
                                .padding(.top, 6)
                            Text(item)
                                .font(.caption)
                                .foregroundColor(.secondary)
                                .lineLimit(2)
                        }
                    }
                }
            }
        }
        .padding(20)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.blue.opacity(0.1))
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(Color.blue.opacity(0.3), lineWidth: 1)
                )
        )
        .padding(.horizontal)
    }
    
    private var scheduleView: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text("Today's Schedule")
                    .font(.headline)
                    .fontWeight(.semibold)
                Spacer()
                Text(viewModel.dateString)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            .padding(.horizontal)
            
            if viewModel.isLoading {
                HStack {
                    ProgressView()
                        .scaleEffect(0.8)
                    Text("Loading schedule...")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity)
                .padding()
            } else if viewModel.todaysBlocks.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "calendar.badge.plus")
                        .font(.system(size: 48))
                        .foregroundColor(.secondary)
                    Text("No schedule for today")
                        .font(.headline)
                        .foregroundColor(.secondary)
                    Text("Tap 'Plan' to create your daily schedule")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity)
                .padding()
            } else {
                ScrollView {
                    LazyVStack(spacing: 12) {
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
        }
    }
    
    private var quickActionsView: some View {
        VStack(spacing: 16) {
            Divider()
                .padding(.horizontal)
            
            // Test button
            Button("Test Button - Click Me!") {
                print("Test button tapped!")
            }
            .buttonStyle(.borderedProminent)
            .padding(.horizontal)
            
            HStack(spacing: 20) {
                QuickActionButton(
                    title: "Start Session",
                    icon: "play.fill",
                    color: .green
                ) {
                    print("Start Session tapped!")
                    if let currentBlock = viewModel.currentBlock {
                        selectedBlock = currentBlock
                        showingSessionView = true
                    }
                }
                
                QuickActionButton(
                    title: "End Session",
                    icon: "stop.fill",
                    color: .red
                ) {
                    print("End Session tapped!")
                }
                
                QuickActionButton(
                    title: "Add Note",
                    icon: "note.text",
                    color: .blue
                ) {
                    print("Add Note tapped!")
                }
            }
            .padding(.horizontal)
        }
    }
}

struct ScheduleBlockView: View {
    let block: BlockResponse
    let isCurrent: Bool
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            blockContent
        }
        .buttonStyle(PlainButtonStyle())
    }
    
    private var blockContent: some View {
        HStack(spacing: 16) {
            timeIndicator
            blockDetails
            Spacer()
            durationBadge
        }
        .padding(16)
        .background(blockBackground)
    }
    
    private var timeIndicator: some View {
        VStack(spacing: 4) {
            Text(block.startTime)
                .font(.system(size: 14, weight: .medium, design: .monospaced))
                .foregroundColor(.primary)
            
            Text(block.endTime)
                .font(.system(size: 12, weight: .regular, design: .monospaced))
                .foregroundColor(.secondary)
        }
        .frame(width: 60, alignment: .leading)
    }
    
    private var blockDetails: some View {
        VStack(alignment: .leading, spacing: 8) {
            blockHeader
            blockDescription
            progressIndicator
        }
    }
    
    private var blockHeader: some View {
        HStack {
            Text(block.label)
                .font(.headline)
                .fontWeight(.semibold)
                .foregroundColor(.primary)
            
            Spacer()
            
            if isCurrent {
                currentIndicator
            }
        }
    }
    
    private var currentIndicator: some View {
        HStack(spacing: 4) {
            Circle()
                .fill(Color.green)
                .frame(width: 8, height: 8)
            Text("Active")
                .font(.caption)
                .foregroundColor(.green)
        }
    }
    
    private var blockDescription: some View {
        Group {
            if !block.note.isEmpty {
                Text(block.note)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .lineLimit(2)
            }
        }
    }
    
    private var progressIndicator: some View {
        Group {
            if isCurrent {
                ProgressView(value: calculateProgress())
                    .progressViewStyle(LinearProgressViewStyle())
                    .scaleEffect(y: 2)
            }
        }
    }
    
    private var durationBadge: some View {
        Text("\(block.duration) min")
            .font(.caption)
            .foregroundColor(.secondary)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(
                Capsule()
                    .fill(Color(NSColor.controlBackgroundColor))
            )
    }
    
    private var blockBackground: some View {
        RoundedRectangle(cornerRadius: 12)
            .fill(isCurrent ? Color.blue.opacity(0.1) : Color(NSColor.controlBackgroundColor))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isCurrent ? Color.blue.opacity(0.3) : Color.clear, lineWidth: 1)
            )
    }
    
    private func calculateProgress() -> Double {
        // Simple progress calculation based on time
        // In a real app, you'd calculate actual progress
        return 0.3 // Placeholder
    }
}

#Preview {
    TodayView()
} 