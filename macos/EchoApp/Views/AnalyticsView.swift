import SwiftUI
import Charts

struct AnalyticsView: View {
    @StateObject private var viewModel = AnalyticsViewModel()
    
    var body: some View {
        VStack(spacing: 20) {
            // Header
            HStack {
                Text("Analytics")
                    .font(.title)
                    .fontWeight(.bold)
                
                Spacer()
                
                Picker("Time Period", selection: $viewModel.selectedPeriod) {
                    Text("Week").tag(AnalyticsPeriod.week)
                    Text("Month").tag(AnalyticsPeriod.month)
                    Text("Quarter").tag(AnalyticsPeriod.quarter)
                }
                .pickerStyle(SegmentedPickerStyle())
                .frame(width: 200)
            }
            .padding(.horizontal)
            
            ScrollView {
                LazyVGrid(columns: [
                    GridItem(.flexible()),
                    GridItem(.flexible())
                ], spacing: 20) {
                    // Productivity Chart
                    AnalyticsCard(title: "Productivity") {
                        Chart(viewModel.productivityData) { item in
                            BarMark(
                                x: .value("Day", item.date),
                                y: .value("Hours", item.hours)
                            )
                            .foregroundStyle(.blue)
                        }
                        .frame(height: 200)
                    }
                    
                    // Project Distribution
                    AnalyticsCard(title: "Project Distribution") {
                        Chart(viewModel.projectData) { item in
                            SectorMark(
                                angle: .value("Hours", item.hours),
                                innerRadius: .ratio(0.5),
                                angularInset: 2
                            )
                            .foregroundStyle(by: .value("Project", item.project))
                        }
                        .frame(height: 200)
                    }
                    
                    // Energy Levels
                    AnalyticsCard(title: "Energy Levels") {
                        Chart(viewModel.energyData) { item in
                            LineMark(
                                x: .value("Day", item.date),
                                y: .value("Energy", item.level)
                            )
                            .foregroundStyle(.green)
                            .symbol(Circle())
                        }
                        .frame(height: 200)
                    }
                    
                    // Focus Time
                    AnalyticsCard(title: "Focus Time") {
                        Chart(viewModel.focusData) { item in
                            BarMark(
                                x: .value("Day", item.date),
                                y: .value("Hours", item.hours)
                            )
                            .foregroundStyle(.orange)
                        }
                        .frame(height: 200)
                    }
                }
                .padding(.horizontal)
            }
        }
        .navigationTitle("Analytics")
    }
}

struct AnalyticsCard<Content: View>: View {
    let title: String
    let content: Content
    
    init(title: String, @ViewBuilder content: () -> Content) {
        self.title = title
        self.content = content()
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.headline)
                .fontWeight(.semibold)
            
            content
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color(.windowBackgroundColor))
                .shadow(color: .black.opacity(0.1), radius: 4, x: 0, y: 2)
        )
    }
}

// Placeholder ViewModels and Data Models
@MainActor
class AnalyticsViewModel: ObservableObject {
    @Published var selectedPeriod: AnalyticsPeriod = .week
    @Published var productivityData: [ProductivityData] = []
    @Published var projectData: [ProjectData] = []
    @Published var energyData: [EnergyData] = []
    @Published var focusData: [FocusData] = []
    
    init() {
        loadSampleData()
    }
    
    private func loadSampleData() {
        // Sample data - replace with real data loading
        productivityData = [
            ProductivityData(date: "Mon", hours: 6.5),
            ProductivityData(date: "Tue", hours: 7.2),
            ProductivityData(date: "Wed", hours: 5.8),
            ProductivityData(date: "Thu", hours: 8.1),
            ProductivityData(date: "Fri", hours: 6.9)
        ]
        
        projectData = [
            ProjectData(project: "Echo Dev", hours: 25),
            ProjectData(project: "Research", hours: 15),
            ProjectData(project: "Admin", hours: 10)
        ]
        
        energyData = [
            EnergyData(date: "Mon", level: 8),
            EnergyData(date: "Tue", level: 7),
            EnergyData(date: "Wed", level: 6),
            EnergyData(date: "Thu", level: 9),
            EnergyData(date: "Fri", level: 7)
        ]
        
        focusData = [
            FocusData(date: "Mon", hours: 4.5),
            FocusData(date: "Tue", hours: 5.2),
            FocusData(date: "Wed", hours: 3.8),
            FocusData(date: "Thu", hours: 6.1),
            FocusData(date: "Fri", hours: 4.9)
        ]
    }
}

enum AnalyticsPeriod: String, CaseIterable {
    case week = "week"
    case month = "month"
    case quarter = "quarter"
}

struct ProductivityData: Identifiable {
    let id = UUID()
    let date: String
    let hours: Double
}

struct ProjectData: Identifiable {
    let id = UUID()
    let project: String
    let hours: Double
}

struct EnergyData: Identifiable {
    let id = UUID()
    let date: String
    let level: Int
}

struct FocusData: Identifiable {
    let id = UUID()
    let date: String
    let hours: Double
}

#Preview {
    AnalyticsView()
} 