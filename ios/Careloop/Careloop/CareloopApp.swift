import SwiftUI

@main
struct CareloopApp: App {
    @StateObject private var store = CareStore()
    @AppStorage("careloop.appearance.darkMode") private var darkMode = false

    var body: some Scene {
        WindowGroup {
            RootTabView()
                .environmentObject(store)
                .tint(.careCoral)
                .preferredColorScheme(darkMode ? .dark : .light)
        }
    }
}
