import SwiftUI

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
            .navigationBarTitleDisplayMode(.large)
        }
    }
}

#Preview {
    ProjectsView()
} 