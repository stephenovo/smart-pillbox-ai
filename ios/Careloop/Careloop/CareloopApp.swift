import SwiftUI

@main
struct CareloopApp: App {
    @StateObject private var store = CareStore()

    var body: some Scene {
        WindowGroup {
            RootTabView()
                .environmentObject(store)
                .tint(.careCoral)
        }
    }
}
