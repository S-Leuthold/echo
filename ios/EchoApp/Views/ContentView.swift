import SwiftUI

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

#Preview {
    ContentView()
} 