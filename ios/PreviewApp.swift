import SwiftUI

// Simple preview app to view the UI
@main
struct PreviewApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}

// Copy all the view files here for easy preview
struct ContentView: View {
    var body: some View {
        TabView {
            TodayView()
                .tabItem {
                    Image(systemName: "calendar")
                    Text("Today")
                }
            
            AnalyticsView()
                .tabItem {
                    Image(systemName: "chart.bar")
                    Text("Analytics")
                }
            
            ProjectsView()
                .tabItem {
                    Image(systemName: "folder")
                    Text("Projects")
                }
        }
    }
}

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
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
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
                if viewModel.currentBlock != nil {
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
                    .fill(Color(NSColor.windowBackgroundColor))
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
                    .fill(Color(NSColor.controlBackgroundColor))
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

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
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
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
                        .fill(Color(NSColor.controlBackgroundColor))
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
                    .fill(isEnabled ? Color(NSColor.controlBackgroundColor) : Color(NSColor.controlColor))
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct AnalyticsView: View {
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                Text("📊 Analytics")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                
                Text("Coming Soon!")
                    .font(.title2)
                    .foregroundColor(.secondary)
                
                Text("Rich analytics with SwiftUI Charts will be implemented here.")
                    .font(.body)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
                
                Spacer()
            }
            .navigationTitle("Analytics")
        }
    }
}

struct ProjectsView: View {
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                Text("📁 Projects")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                
                Text("Coming Soon!")
                    .font(.title2)
                    .foregroundColor(.secondary)
                
                Text("Project management with rich notes and progress tracking will be implemented here.")
                    .font(.body)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
                
                Spacer()
            }
            .navigationTitle("Projects")
        }
    }
}

// Models
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

// ViewModels
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
        // Sample data
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
}

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
        timer = Timer.scheduledTimer(withTimeInterval: 60, repeats: true) { [weak self] _ in
            Task { @MainActor in
                self?.updateSessionDuration()
            }
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
        print("Adding note: \(sessionNotes)")
    }
    
    func toggleGit() {
        gitEnabled.toggle()
        if gitEnabled {
            gitData = "2 commits, 45 lines added"
        } else {
            gitData = ""
        }
    }
    
    func toggleBrowser() {
        browserEnabled.toggle()
        if browserEnabled {
            browserData = "3 tabs, 20min on GitHub"
        } else {
            browserData = ""
        }
    }
    
    func toggleIDE() {
        ideEnabled.toggle()
        if ideEnabled {
            ideData = "2 files edited, 3 functions"
        } else {
            ideData = ""
        }
    }
    
    func toggleCalendar() {
        calendarEnabled.toggle()
        if calendarEnabled {
            calendarData = "1 meeting, 2 interruptions"
        } else {
            calendarData = ""
        }
    }
    
    func saveSession() {
        print("Saving session with notes: \(sessionNotes)")
    }
    
    func endSession() {
        timer?.invalidate()
        saveSession()
        print("Session ended")
    }
} 