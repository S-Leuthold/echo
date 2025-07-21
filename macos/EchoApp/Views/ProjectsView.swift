import SwiftUI

struct ProjectsView: View {
    @StateObject private var viewModel = ProjectsViewModel()
    @State private var showingAddProject = false
    @State private var selectedProject: Project?
    
    var body: some View {
        VStack(spacing: 20) {
            // Header
            HStack {
                Text("Projects")
                    .font(.title)
                    .fontWeight(.bold)
                
                Spacer()
                
                Button("Add Project") {
                    showingAddProject = true
                }
                .buttonStyle(.borderedProminent)
            }
            .padding(.horizontal)
            
            // Projects List
            ScrollView {
                LazyVStack(spacing: 12) {
                    ForEach(viewModel.projects) { project in
                        ProjectCard(
                            project: project,
                            onTap: {
                                selectedProject = project
                            }
                        )
                    }
                }
                .padding(.horizontal)
            }
        }
        .navigationTitle("Projects")
        .sheet(isPresented: $showingAddProject) {
            AddProjectView()
        }
        .sheet(item: $selectedProject) { project in
            ProjectDetailView(project: project)
        }
    }
}

struct ProjectCard: View {
    let project: Project
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 16) {
                // Project Icon
                ZStack {
                    Circle()
                        .fill(project.color)
                        .frame(width: 50, height: 50)
                    
                    Text(project.emoji)
                        .font(.title2)
                }
                
                // Project Info
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text(project.name)
                            .font(.headline)
                            .fontWeight(.semibold)
                        
                        Spacer()
                        
                        StatusBadge(status: project.status)
                    }
                    
                    Text(project.description)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                    
                    HStack {
                        Text("Deadline: \(project.deadline)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        
                        Spacer()
                        
                        Text("\(project.progress)%")
                            .font(.caption)
                            .fontWeight(.medium)
                            .foregroundColor(.primary)
                    }
                }
                
                Spacer()
                
                // Progress
                VStack(alignment: .trailing, spacing: 4) {
                    ProgressView(value: Double(project.progress) / 100)
                        .progressViewStyle(LinearProgressViewStyle())
                        .frame(width: 100)
                    
                    Text("\(project.completedTasks)/\(project.totalTasks) tasks")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color(.windowBackgroundColor))
                    .shadow(color: .black.opacity(0.1), radius: 4, x: 0, y: 2)
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct StatusBadge: View {
    let status: ProjectStatus
    
    var body: some View {
        Text(status.displayName)
            .font(.caption)
            .fontWeight(.medium)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(
                Capsule()
                    .fill(status.color.opacity(0.2))
            )
            .foregroundColor(status.color)
    }
}

// Placeholder ViewModels and Data Models
@MainActor
class ProjectsViewModel: ObservableObject {
    @Published var projects: [Project] = []
    
    init() {
        loadSampleProjects()
    }
    
    private func loadSampleProjects() {
        projects = [
            Project(
                id: "1",
                name: "Echo Development",
                description: "Build the next generation productivity app",
                emoji: "🚀",
                status: .active,
                progress: 65,
                completedTasks: 13,
                totalTasks: 20,
                deadline: "2025-07-31",
                color: .blue
            ),
            Project(
                id: "2",
                name: "Research Paper",
                description: "Write research paper on productivity systems",
                emoji: "📚",
                status: .onHold,
                progress: 30,
                completedTasks: 3,
                totalTasks: 10,
                deadline: "2025-06-15",
                color: .orange
            ),
            Project(
                id: "3",
                name: "Website Redesign",
                description: "Modernize the company website",
                emoji: "🌐",
                status: .completed,
                progress: 100,
                completedTasks: 8,
                totalTasks: 8,
                deadline: "2025-05-01",
                color: .green
            )
        ]
    }
}

struct Project: Identifiable {
    let id: String
    let name: String
    let description: String
    let emoji: String
    let status: ProjectStatus
    let progress: Int
    let completedTasks: Int
    let totalTasks: Int
    let deadline: String
    let color: Color
}

enum ProjectStatus: String, CaseIterable {
    case active = "active"
    case onHold = "on_hold"
    case completed = "completed"
    
    var displayName: String {
        switch self {
        case .active:
            return "Active"
        case .onHold:
            return "On Hold"
        case .completed:
            return "Completed"
        }
    }
    
    var color: Color {
        switch self {
        case .active:
            return .green
        case .onHold:
            return .orange
        case .completed:
            return .blue
        }
    }
}

struct AddProjectView: View {
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        VStack(spacing: 20) {
            Text("Add New Project")
                .font(.title2)
                .fontWeight(.semibold)
            
            Text("Project creation form will be implemented here")
                .foregroundColor(.secondary)
            
            Button("Cancel") {
                dismiss()
            }
        }
        .padding()
        .frame(width: 400, height: 300)
    }
}

struct ProjectDetailView: View {
    let project: Project
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        VStack(spacing: 20) {
            Text(project.name)
                .font(.title2)
                .fontWeight(.semibold)
            
            Text("Project detail view will be implemented here")
                .foregroundColor(.secondary)
            
            Button("Close") {
                dismiss()
            }
        }
        .padding()
        .frame(width: 600, height: 400)
    }
}

#Preview {
    ProjectsView()
} 