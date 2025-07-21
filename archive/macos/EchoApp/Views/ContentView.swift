import SwiftUI

struct ContentView: View {
    @State private var selectedTab = 0
    
    var body: some View {
        NavigationSplitView {
            List(selection: $selectedTab) {
                NavigationLink(value: 0) {
                    Label("Today", systemImage: "calendar")
                }
                
                NavigationLink(value: 1) {
                    Label("Analytics", systemImage: "chart.bar")
                }
                
                NavigationLink(value: 2) {
                    Label("Projects", systemImage: "folder")
                }
                
                NavigationLink(value: 3) {
                    Label("Sessions", systemImage: "timer")
                }
            }
            .navigationTitle("Echo")
            .listStyle(SidebarListStyle())
        } detail: {
            switch selectedTab {
            case 0:
                TodayView()
            case 1:
                AnalyticsView()
            case 2:
                ProjectsView()
            case 3:
                Text("Sessions")
                    .font(.title)
                    .foregroundColor(.secondary)
            default:
                TodayView()
            }
        }
        .navigationSplitViewStyle(.balanced)
    }
}

#Preview {
    ContentView()
} 