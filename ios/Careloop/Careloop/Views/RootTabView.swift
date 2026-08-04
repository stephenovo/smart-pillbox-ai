import SwiftUI

struct RootTabView: View {
    @EnvironmentObject private var store: CareStore

    var body: some View {
        TabView {
            TodayView()
                .tabItem {
                    Label(
                        store.appMode == .myCare ? "My Day" : "Today",
                        systemImage: "square.grid.2x2.fill"
                    )
                }

            MedicationsView()
                .tabItem {
                    Label(
                        store.appMode == .myCare ? "My Medicines" : "Meds",
                        systemImage: "pills.fill"
                    )
                }

            NotesView()
                .tabItem {
                    Label(
                        store.appMode == .myCare ? "AI Insight" : "Insights",
                        systemImage: "sparkles"
                    )
                }

            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gearshape.fill")
                }
        }
        .task {
            await store.startPolling()
        }
    }
}
