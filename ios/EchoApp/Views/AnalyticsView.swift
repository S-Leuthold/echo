import SwiftUI

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
            .navigationBarTitleDisplayMode(.large)
        }
    }
}

#Preview {
    AnalyticsView()
} 