import Foundation
import XCTest

// Simple test to verify API connectivity
class APITest {
    static func testAPIConnection() async {
        let api = await EchoAPI.shared
        
        do {
            // Test health check
            let isHealthy = try await api.checkHealth()
            print("✅ API Health Check: \(isHealthy)")
            
            // Test today's schedule
            let todayResponse = try await api.fetchTodaySchedule()
            print("✅ Today's Schedule: \(todayResponse.blocks.count) blocks")
            print("   Current time: \(todayResponse.currentTime)")
            print("   Email summary: \(todayResponse.emailSummary.count) items")
            
            // Test analytics
            let analytics = try await api.fetchAnalytics()
            print("✅ Analytics: \(analytics.totalTime) minutes total")
            print("   Productivity score: \(analytics.productivityScore)%")
            
            // Test projects
            let projects = try await api.fetchProjects()
            print("✅ Projects: \(projects.count) projects")
            
            print("🎉 All API tests passed!")
            
        } catch {
            print("❌ API Test Failed: \(error.localizedDescription)")
        }
    }
}

// Note: This test can be run manually when needed
// Task {
//     await APITest.testAPIConnection()
// } 