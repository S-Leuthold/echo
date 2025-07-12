//
//  main.swift
//  EchoApp
//
//  Created by Sam Leuthold on 7/12/25.
//

import SwiftUI
import Foundation

@main
struct EchoApp: App {
    var body: some Scene {
        WindowGroup {
            PlanView()
        }
    }
}

enum EngineBridge {
    static func run(notes: [String: String]) throws -> [[String: Any]] {
        let notesData  = try JSONSerialization.data(withJSONObject: notes)
        let notesJSON  = String(data: notesData, encoding: .utf8) ?? "{}"

        let process = Process()
        process.executableURL = URL(
            fileURLWithPath: "/Users/samleuthold/Desktop/echo/.venv/bin/python")
        process.arguments = ["-m", "echo.cli", "--notes", notesJSON]
        process.currentDirectoryURL =
            URL(fileURLWithPath: "/Users/samleuthold/Desktop/echo")

        var env = ProcessInfo.processInfo.environment
        env["PYTHONPATH"] = "/Users/samleuthold/Desktop/echo"
        process.environment = env

        let outPipe = Pipe();  process.standardOutput = outPipe
        let errPipe = Pipe();  process.standardError  = errPipe

        try process.run();  process.waitUntilExit()

        // Forward Python stderr to Xcode console for debugging
        if let errStr = String(data: errPipe.fileHandleForReading.readDataToEndOfFile(),
                               encoding: .utf8), !errStr.isEmpty {
            print("Python stderr:", errStr)
        }

        let outData = outPipe.fileHandleForReading.readDataToEndOfFile()
        guard !outData.isEmpty else { return [] }

        return try JSONSerialization.jsonObject(with: outData)
               as? [[String: Any]] ?? []
    }
}

import SwiftUI

struct PlanView: View {
    @State private var plan: [[String: Any]] = []
    @State private var error: String?

    var body: some View {
        NavigationStack {
            List(plan, id: \.self) { blk in
                Text(blk["label"] as? String ?? "—")
            }
            .navigationTitle("Echo Plan")
            .overlay {
                if let error {
                    Text(error).foregroundColor(.red).padding()
                }
            }
        }
        .task {
            do {
                plan = try EngineBridge.run(notes: ["Priority": "MIR"])
            } catch {
                self.error = error.localizedDescription
            }
        }
    }
}
