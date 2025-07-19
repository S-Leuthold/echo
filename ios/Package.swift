// swift-tools-version: 5.9
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "EchoApp",
    platforms: [
        .iOS(.v17),
        .macOS(.v14)
    ],
    products: [
        .executable(
            name: "EchoPreview",
            targets: ["EchoPreview"]
        ),
    ],
    dependencies: [
        // Dependencies go here
    ],
    targets: [
        .executableTarget(
            name: "EchoPreview",
            dependencies: [],
            path: ".",
            sources: ["PreviewApp.swift"]
        ),
    ]
)
