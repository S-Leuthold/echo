import SwiftUI

struct SettingsView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var apiUrl = "http://localhost:8000"
    @State private var autoRefresh = true
    @State private var showEmailSummary = true
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Header
                VStack(spacing: 12) {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Settings")
                                .font(.title2)
                                .fontWeight(.semibold)
                            
                            Text("Configure your Echo experience")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        
                        Spacer()
                    }
                    .padding()
                    
                    Divider()
                }
                
                // Settings Form
                ScrollView {
                    VStack(spacing: 24) {
                        // API Configuration
                        settingsSection(title: "API Configuration") {
                            apiConfigurationView
                        }
                        
                        // Display Options
                        settingsSection(title: "Display Options") {
                            displayOptionsView
                        }
                        
                        // About
                        settingsSection(title: "About") {
                            aboutView
                        }
                    }
                    .padding()
                }
                
                // Action Buttons
                VStack(spacing: 12) {
                    Divider()
                    
                    HStack(spacing: 16) {
                        Button("Cancel") {
                            dismiss()
                        }
                        .buttonStyle(.bordered)
                        
                        Spacer()
                        
                        Button("Save") {
                            saveSettings()
                            dismiss()
                        }
                        .buttonStyle(.borderedProminent)
                    }
                    .padding()
                }
            }
            .navigationTitle("Settings")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        saveSettings()
                        dismiss()
                    }
                }
            }
        }
    }
    
    private var apiConfigurationView: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("API Server URL")
                .font(.headline)
            
            Text("The URL of your Echo API server")
                .font(.subheadline)
                .foregroundColor(.secondary)
            
            TextField("http://localhost:8000", text: $apiUrl)
                .textFieldStyle(RoundedBorderTextFieldStyle())
        }
    }
    
    private var displayOptionsView: some View {
        VStack(alignment: .leading, spacing: 16) {
            Toggle("Auto-refresh data", isOn: $autoRefresh)
            
            Toggle("Show email summary", isOn: $showEmailSummary)
        }
    }
    
    private var aboutView: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Echo macOS App")
                .font(.headline)
            
            Text("Version 1.0.0")
                .font(.subheadline)
                .foregroundColor(.secondary)
            
            Text("A beautiful, native macOS app for the Echo productivity system.")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
    }
    
    private func settingsSection<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(title)
                .font(.title3)
                .fontWeight(.semibold)
            
            content()
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color(NSColor.controlBackgroundColor))
        )
    }
    
    private func saveSettings() {
        // TODO: Save settings to UserDefaults
        print("Settings saved")
    }
}

#Preview {
    SettingsView()
} 