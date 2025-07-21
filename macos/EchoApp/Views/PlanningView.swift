import SwiftUI

struct PlanningView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var planningViewModel = PlanningViewModel()
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Header
                headerView
                
                // Planning Form
                ScrollView {
                    VStack(spacing: 24) {
                        // Most Important
                        planningSection(
                            title: "Most Important",
                            subtitle: "What's the one thing you must accomplish today?",
                            text: $planningViewModel.mostImportant,
                            placeholder: "e.g., Complete the API server integration"
                        )
                        
                        // Energy Level
                        energyLevelSection
                        
                        // Todos
                        todosSection
                        
                        // Fixed Events
                        fixedEventsSection
                        
                        // Non-negotiables
                        planningSection(
                            title: "Non-negotiables",
                            subtitle: "What must you avoid or protect today?",
                            text: $planningViewModel.nonNegotiables,
                            placeholder: "e.g., No meetings after 3 PM, protect deep work time"
                        )
                        
                        // Avoid Today
                        planningSection(
                            title: "Avoid Today",
                            subtitle: "What should you stay away from?",
                            text: $planningViewModel.avoidToday,
                            placeholder: "e.g., Social media, unnecessary meetings"
                        )
                    }
                    .padding()
                }
                
                // Action Buttons
                actionButtonsView
            }
            .navigationTitle("Plan Your Day")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .confirmationAction) {
                    Button("Create Plan") {
                        planningViewModel.createPlan()
                        dismiss()
                    }
                    .disabled(planningViewModel.isLoading)
                }
            }
        }
        .alert("Error", isPresented: .constant(planningViewModel.error != nil)) {
            Button("OK") {
                planningViewModel.clearError()
            }
        } message: {
            Text(planningViewModel.error?.localizedDescription ?? "Unknown error")
        }
    }
    
    private var headerView: some View {
        VStack(spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Plan Your Day")
                        .font(.title2)
                        .fontWeight(.semibold)
                    
                    Text("Create a focused, productive schedule")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                if planningViewModel.isLoading {
                    ProgressView()
                        .scaleEffect(0.8)
                }
            }
            .padding()
            
            Divider()
        }
    }
    
    private var energyLevelSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Energy Level")
                .font(.headline)
            
            Text("How's your energy today?")
                .font(.subheadline)
                .foregroundColor(.secondary)
            
            HStack(spacing: 16) {
                ForEach(1...10, id: \.self) { level in
                    Button(action: {
                        planningViewModel.energyLevel = String(level)
                    }) {
                        Text("\(level)")
                            .font(.headline)
                            .fontWeight(.medium)
                            .foregroundColor(planningViewModel.energyLevel == String(level) ? .white : .primary)
                            .frame(width: 40, height: 40)
                            .background(
                                Circle()
                                    .fill(planningViewModel.energyLevel == String(level) ? Color.blue : Color(NSColor.controlBackgroundColor))
                            )
                    }
                    .buttonStyle(PlainButtonStyle())
                }
            }
        }
    }
    
    private var todosSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Todos")
                .font(.headline)
            
            Text("What tasks need to get done?")
                .font(.subheadline)
                .foregroundColor(.secondary)
            
            VStack(spacing: 8) {
                ForEach(planningViewModel.todos.indices, id: \.self) { index in
                    HStack {
                        TextField("Add a task...", text: $planningViewModel.todos[index])
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                        
                        Button(action: {
                            planningViewModel.todos.remove(at: index)
                        }) {
                            Image(systemName: "minus.circle.fill")
                                .foregroundColor(.red)
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                }
                
                Button(action: {
                    planningViewModel.todos.append("")
                }) {
                    HStack {
                        Image(systemName: "plus.circle.fill")
                        Text("Add Task")
                    }
                    .foregroundColor(.blue)
                }
                .buttonStyle(PlainButtonStyle())
            }
        }
    }
    
    private var fixedEventsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Fixed Events")
                .font(.headline)
            
            Text("What meetings or events are already scheduled?")
                .font(.subheadline)
                .foregroundColor(.secondary)
            
            VStack(spacing: 8) {
                ForEach(planningViewModel.fixedEvents.indices, id: \.self) { index in
                    HStack {
                        TextField("e.g., Team meeting at 2 PM", text: $planningViewModel.fixedEvents[index])
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                        
                        Button(action: {
                            planningViewModel.fixedEvents.remove(at: index)
                        }) {
                            Image(systemName: "minus.circle.fill")
                                .foregroundColor(.red)
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                }
                
                Button(action: {
                    planningViewModel.fixedEvents.append("")
                }) {
                    HStack {
                        Image(systemName: "plus.circle.fill")
                        Text("Add Event")
                    }
                    .foregroundColor(.blue)
                }
                .buttonStyle(PlainButtonStyle())
            }
        }
    }
    
    private func planningSection(title: String, subtitle: String, text: Binding<String>, placeholder: String) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.headline)
            
            Text(subtitle)
                .font(.subheadline)
                .foregroundColor(.secondary)
            
            TextField(placeholder, text: text, axis: .vertical)
                .textFieldStyle(RoundedBorderTextFieldStyle())
                .lineLimit(3...6)
        }
    }
    
    private var actionButtonsView: some View {
        VStack(spacing: 12) {
            Divider()
            
            HStack(spacing: 16) {
                Button("Cancel") {
                    dismiss()
                }
                .buttonStyle(.bordered)
                
                Spacer()
                
                Button("Create Plan") {
                    planningViewModel.createPlan()
                    dismiss()
                }
                .buttonStyle(.borderedProminent)
                .disabled(planningViewModel.isLoading)
            }
            .padding()
        }
    }
}

#Preview {
    PlanningView()
} 