// swift-tools-version: 6.1
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription
let package = Package(
    name: "EchoApp",
    platforms: [.macOS(.v13), .iOS(.v16)],
    dependencies: [
        .package(url: "https://github.com/pvieito/PythonKit.git", from: "0.0.4")
    ],
    targets: [
        .executableTarget(
            name: "EchoApp",
            dependencies: ["PythonKit"]),
    ]
)
