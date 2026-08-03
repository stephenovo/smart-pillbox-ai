import SwiftUI

struct RootTabView: View {
    @EnvironmentObject private var store: CareStore

    var body: some View {
        TabView {
            TodayView()
                .tabItem {
                    Label("Today", systemImage: "square.grid.2x2.fill")
                }

            MedicationsView()
                .tabItem {
                    Label("Meds", systemImage: "pills.fill")
                }

            NotesView()
                .tabItem {
                    Label("Insights", systemImage: "sparkles")
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
