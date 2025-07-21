// swift-tools-version: 5.9
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "EchoApp",
    platforms: [
        .macOS(.v14)
    ],
    products: [
        .executable(
            name: "EchoApp",
            targets: ["EchoApp"]
        ),
    ],
    dependencies: [
        // Dependencies go here
    ],
    targets: [
        .executableTarget(
            name: "EchoApp",
            dependencies: [],
            path: "EchoApp"
        ),
    ]
) 