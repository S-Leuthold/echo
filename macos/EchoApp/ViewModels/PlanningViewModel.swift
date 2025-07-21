import SwiftUI
import Foundation

@MainActor
class PlanningViewModel: ObservableObject {
    @Published var mostImportant = ""
    @Published var energyLevel = "7"
    @Published var todos: [String] = [""]
    @Published var nonNegotiables = ""
    @Published var avoidToday = ""
    @Published var fixedEvents: [String] = [""]
    
    @Published var isLoading = false
    @Published var error: EchoAPIError?
    
    private let api = EchoAPI.shared
    
    func createPlan() {
        Task {
            do {
                isLoading = true
                error = nil
                
                // Filter out empty todos and events
                let filteredTodos = todos.filter { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
                let filteredEvents = fixedEvents.filter { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
                
                let request = PlanningRequest(
                    mostImportant: mostImportant,
                    todos: filteredTodos,
                    energyLevel: energyLevel,
                    nonNegotiables: nonNegotiables,
                    avoidToday: avoidToday,
                    fixedEvents: filteredEvents
                )
                
                let result = try await api.createPlan(request)
                print("✅ Plan created successfully: \(result)")
                
                // Reset form
                resetForm()
                
            } catch let apiError as EchoAPIError {
                self.error = apiError
            } catch {
                self.error = .networkError(error)
            }
            
            isLoading = false
        }
    }
    
    func clearError() {
        error = nil
    }
    
    private func resetForm() {
        mostImportant = ""
        energyLevel = "7"
        todos = [""]
        nonNegotiables = ""
        avoidToday = ""
        fixedEvents = [""]
    }
} 