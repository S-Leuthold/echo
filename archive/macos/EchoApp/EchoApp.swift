import SwiftUI

@main
struct EchoApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .windowStyle(.hiddenTitleBar)
        .windowResizability(.contentSize)
        .defaultSize(width: 800, height: 600)
        
        Settings {
            SettingsView()
        }
    }
}

#Preview {
    ContentView()
} 