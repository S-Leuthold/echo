//
//  EchoAPI.swift
//  EchoApp
//
//  Created by Echo Team
//  Purpose: Networking layer for connecting to the Python API server
//

import Foundation
import Combine

// MARK: - API Models

struct BlockResponse: Codable, Identifiable {
    let id: String
    let startTime: String
    let endTime: String
    let emoji: String
    let projectName: String
    let taskName: String
    let note: String
    let type: String
    let duration: Int
    let label: String
    let isCurrent: Bool
    let progress: Double
    
    enum CodingKeys: String, CodingKey {
        case id, emoji, note, type, duration, label, progress
        case startTime = "start_time"
        case endTime = "end_time"
        case projectName = "project_name"
        case taskName = "task_name"
        case isCurrent = "is_current"
    }
}

struct AnalyticsResponse: Codable {
    let date: String
    let totalTime: Int
    let categories: [String: Int]
    let projects: [String: Int]
    let productivityScore: Double
    let focusTime: Int
    let breakTime: Int
    
    enum CodingKeys: String, CodingKey {
        case date, categories, projects
        case totalTime = "total_time"
        case productivityScore = "productivity_score"
        case focusTime = "focus_time"
        case breakTime = "break_time"
    }
}

struct ProjectResponse: Codable, Identifiable {
    let id: String
    let name: String
    let status: String
    let currentFocus: String?
    let timeSpentToday: Int
    let timeSpentWeek: Int
    let progressPercentage: Double
    
    enum CodingKeys: String, CodingKey {
        case id, name, status
        case currentFocus = "current_focus"
        case timeSpentToday = "time_spent_today"
        case timeSpentWeek = "time_spent_week"
        case progressPercentage = "progress_percentage"
    }
}

struct SessionResponse: Codable, Identifiable {
    let id: String
    let startTime: String
    let endTime: String?
    let duration: Int?
    let project: String
    let task: String
    let notes: String
    let externalTools: [String: Bool]
    
    enum CodingKeys: String, CodingKey {
        case id, project, task, notes, duration
        case startTime = "start_time"
        case endTime = "end_time"
        case externalTools = "external_tools"
    }
}

struct TodayResponse: Decodable {
    let date: String
    let currentTime: String
    let currentBlock: BlockResponse?
    let blocks: [BlockResponse]
    let emailSummary: [String: Any]
    let planningStats: [String: Any]
    
    enum CodingKeys: String, CodingKey {
        case date, blocks
        case currentTime = "current_time"
        case currentBlock = "current_block"
        case emailSummary = "email_summary"
        case planningStats = "planning_stats"
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        date = try container.decode(String.self, forKey: .date)
        currentTime = try container.decode(String.self, forKey: .currentTime)
        currentBlock = try container.decodeIfPresent(BlockResponse.self, forKey: .currentBlock)
        blocks = try container.decode([BlockResponse].self, forKey: .blocks)
        
        // Handle dynamic JSON for email summary and planning stats
        if let emailData = try? container.decode(Data.self, forKey: .emailSummary) {
            emailSummary = (try? JSONSerialization.jsonObject(with: emailData)) as? [String: Any] ?? [:]
        } else {
            emailSummary = [:]
        }
        
        if let planningData = try? container.decode(Data.self, forKey: .planningStats) {
            planningStats = (try? JSONSerialization.jsonObject(with: planningData)) as? [String: Any] ?? [:]
        } else {
            planningStats = [:]
        }
    }
}

// MARK: - Planning Request/Response

struct PlanningRequest: Codable {
    let mostImportant: String
    let todos: [String]
    let energyLevel: String
    let nonNegotiables: String
    let avoidToday: String
    let fixedEvents: [String]
}

struct PlanningResponse: Codable {
    let success: Bool
    let message: String
    let schedule: [BlockResponse]
}

// MARK: - API Errors

enum EchoAPIError: Error, LocalizedError {
    case networkError(Error)
    case decodingError(Error)
    case serverError(Int)
    case invalidResponse
    case httpError(Int)
    case invalidURL
    
    var errorDescription: String? {
        switch self {
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        case .decodingError(let error):
            return "Decoding error: \(error.localizedDescription)"
        case .serverError(let code):
            return "Server error: \(code)"
        case .invalidResponse:
            return "Invalid response from server"
        case .httpError(let code):
            return "HTTP error: \(code)"
        case .invalidURL:
            return "Invalid URL"
        }
    }
}

// MARK: - API Service

@MainActor
class EchoAPI: ObservableObject {
    static let shared = EchoAPI()
    
    private let baseURL = "http://localhost:8000"
    private let session = URLSession.shared
    
    @Published var isLoading = false
    @Published var error: EchoAPIError?
    
    private init() {}
    
    // MARK: - Health Check
    
    func checkHealth() async throws -> Bool {
        let url = URL(string: "\(baseURL)/health")!
        let (data, response) = try await session.data(from: url)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw EchoAPIError.networkError(NSError(domain: "", code: -1))
        }
        
        guard httpResponse.statusCode == 200 else {
            throw EchoAPIError.serverError(httpResponse.statusCode)
        }
        
        let healthData = try JSONDecoder().decode([String: String].self, from: data)
        return healthData["status"] == "healthy"
    }
    
    // MARK: - Today's Schedule
    
    func fetchTodaySchedule() async throws -> TodayResponse {
        isLoading = true
        error = nil
        
        defer { isLoading = false }
        
        let url = URL(string: "\(baseURL)/today")!
        let (data, response) = try await session.data(from: url)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw EchoAPIError.networkError(NSError(domain: "", code: -1))
        }
        
        guard httpResponse.statusCode == 200 else {
            throw EchoAPIError.serverError(httpResponse.statusCode)
        }
        
        do {
            let todayResponse = try JSONDecoder().decode(TodayResponse.self, from: data)
            return todayResponse
        } catch {
            throw EchoAPIError.decodingError(error)
        }
    }
    
    // MARK: - Analytics
    
    func fetchAnalytics(for date: Date? = nil) async throws -> AnalyticsResponse {
        isLoading = true
        error = nil
        
        defer { isLoading = false }
        
        var urlString = "\(baseURL)/analytics"
        if let date = date {
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd"
            urlString += "?date_str=\(formatter.string(from: date))"
        }
        
        guard let url = URL(string: urlString) else {
            throw EchoAPIError.invalidURL
        }
        
        let (data, response) = try await session.data(from: url)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw EchoAPIError.networkError(NSError(domain: "", code: -1))
        }
        
        guard httpResponse.statusCode == 200 else {
            throw EchoAPIError.serverError(httpResponse.statusCode)
        }
        
        do {
            let analyticsResponse = try JSONDecoder().decode(AnalyticsResponse.self, from: data)
            return analyticsResponse
        } catch {
            throw EchoAPIError.decodingError(error)
        }
    }
    
    // MARK: - Projects
    
    func fetchProjects() async throws -> [ProjectResponse] {
        isLoading = true
        error = nil
        
        defer { isLoading = false }
        
        let url = URL(string: "\(baseURL)/projects")!
        let (data, response) = try await session.data(from: url)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw EchoAPIError.networkError(NSError(domain: "", code: -1))
        }
        
        guard httpResponse.statusCode == 200 else {
            throw EchoAPIError.serverError(httpResponse.statusCode)
        }
        
        do {
            let projects = try JSONDecoder().decode([ProjectResponse].self, from: data)
            return projects
        } catch {
            throw EchoAPIError.decodingError(error)
        }
    }
    
    // MARK: - Sessions
    
    func fetchSessions() async throws -> [SessionResponse] {
        isLoading = true
        error = nil
        
        defer { isLoading = false }
        
        let url = URL(string: "\(baseURL)/sessions")!
        let (data, response) = try await session.data(from: url)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw EchoAPIError.networkError(NSError(domain: "", code: -1))
        }
        
        guard httpResponse.statusCode == 200 else {
            throw EchoAPIError.serverError(httpResponse.statusCode)
        }
        
        do {
            let sessions = try JSONDecoder().decode([SessionResponse].self, from: data)
            return sessions
        } catch {
            throw EchoAPIError.decodingError(error)
        }
    }
    
    // MARK: - Planning
    
    func createPlan(_ request: PlanningRequest) async throws -> PlanningResponse {
        guard let url = URL(string: "\(baseURL)/plan") else {
            throw EchoAPIError.networkError(NSError(domain: "", code: -1))
        }
        
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let encoder = JSONEncoder()
        urlRequest.httpBody = try encoder.encode(request)
        
        let (data, response) = try await URLSession.shared.data(for: urlRequest)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw EchoAPIError.invalidResponse
        }
        
        guard httpResponse.statusCode == 200 else {
            throw EchoAPIError.httpError(httpResponse.statusCode)
        }
        
        let decoder = JSONDecoder()
        return try decoder.decode(PlanningResponse.self, from: data)
    }
    
    // MARK: - Utility Methods
    
    func clearError() {
        error = nil
    }
    
    func formatDuration(_ minutes: Int) -> String {
        let hours = minutes / 60
        let remainingMinutes = minutes % 60
        
        if hours > 0 {
            return remainingMinutes > 0 ? "\(hours)h \(remainingMinutes)m" : "\(hours)h"
        } else {
            return "\(remainingMinutes)m"
        }
    }
    
    func formatTime(_ timeString: String) -> String {
        // Convert "HH:MM:SS" to "HH:MM"
        let components = timeString.split(separator: ":")
        if components.count >= 2 {
            return "\(components[0]):\(components[1])"
        }
        return timeString
    }
}

// MARK: - Combine Extensions

extension EchoAPI {
    func todaySchedulePublisher() -> AnyPublisher<TodayResponse, EchoAPIError> {
        Future { promise in
            Task {
                do {
                    let response = try await self.fetchTodaySchedule()
                    promise(.success(response))
                } catch {
                    promise(.failure(error as? EchoAPIError ?? .networkError(error)))
                }
            }
        }
        .eraseToAnyPublisher()
    }
    
    func analyticsPublisher(for date: Date? = nil) -> AnyPublisher<AnalyticsResponse, EchoAPIError> {
        Future { promise in
            Task {
                do {
                    let response = try await self.fetchAnalytics(for: date)
                    promise(.success(response))
                } catch {
                    promise(.failure(error as? EchoAPIError ?? .networkError(error)))
                }
            }
        }
        .eraseToAnyPublisher()
    }
    
    func projectsPublisher() -> AnyPublisher<[ProjectResponse], EchoAPIError> {
        Future { promise in
            Task {
                do {
                    let response = try await self.fetchProjects()
                    promise(.success(response))
                } catch {
                    promise(.failure(error as? EchoAPIError ?? .networkError(error)))
                }
            }
        }
        .eraseToAnyPublisher()
    }
} 