import SwiftUI

struct SettingsView: View {
    @EnvironmentObject private var store: CareStore

    @AppStorage("careloop.alerts.missedDose") private var missedDoseAlerts = true
    @AppStorage("careloop.alerts.lateDose") private var lateDoseAlerts = true
    @AppStorage("careloop.alerts.offline") private var offlineAlerts = true
    @AppStorage("careloop.alerts.weekly") private var weeklySummary = true
    @AppStorage("careloop.appearance.darkMode") private var darkMode = false

    @State private var draftServerURL = ""
    @State private var draftDeviceID = ""

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    HStack(spacing: 14) {
                        ZStack {
                            Circle().fill(Color.careMintSoft)
                            Text("SC")
                                .font(.headline.weight(.bold))
                                .foregroundStyle(Color.careMintInk)
                        }
                        .frame(width: 54, height: 54)

                        VStack(alignment: .leading, spacing: 3) {
                            Text("Sarah Chen")
                                .font(.headline)
                                .foregroundStyle(Color.careInk)
                            Text("Family caregiver · \(store.patients.count) \(store.patients.count == 1 ? "person" : "people")")
                                .font(.caption)
                                .foregroundStyle(Color.careInkSoft)
                        }
                    }
                    .padding(.vertical, 5)
                }

                Section {
                    Toggle(isOn: $darkMode) {
                        Label("Dark mode", systemImage: "moon.fill")
                    }
                } header: {
                    Text("Appearance")
                } footer: {
                    Text("Use a lower-glare appearance throughout Smart Pillbox.")
                }
                .tint(.careMint)

                Section("Notifications") {
                    Toggle("Missed dose alerts", isOn: $missedDoseAlerts)
                    Toggle("Late dose updates", isOn: $lateDoseAlerts)
                    Toggle("Device goes offline", isOn: $offlineAlerts)
                    Toggle("Weekly care summary", isOn: $weeklySummary)
                }
                .tint(.careMint)

                Section {
                    TextField("http://127.0.0.1:3100", text: $draftServerURL)
                        .keyboardType(.URL)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()

                    TextField("Device ID", text: $draftDeviceID)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()

                    Button {
                        Task {
                            await store.applyConnectionSettings(
                                serverURL: draftServerURL,
                                deviceID: draftDeviceID
                            )
                        }
                    } label: {
                        HStack {
                            Label("Save and test connection", systemImage: "arrow.triangle.2.circlepath")
                            Spacer()
                            if store.isRefreshing {
                                ProgressView()
                            }
                        }
                    }
                    .disabled(store.isRefreshing)

                    if let message = store.connectionMessage {
                        Label(message, systemImage: "exclamationmark.circle")
                            .font(.caption)
                            .foregroundStyle(Color.careCoralInk)
                    } else if let lastUpdated = store.lastUpdated {
                        Label(
                            "Connected · \(lastUpdated.formatted(date: .omitted, time: .shortened))",
                            systemImage: "checkmark.circle.fill"
                        )
                        .font(.caption)
                        .foregroundStyle(Color.careMintInk)
                    }
                } header: {
                    Text("Smart Pillbox server")
                } footer: {
                    Text("The iOS Simulator can use 127.0.0.1. On a physical iPhone, enter your Mac's local network address or a production HTTPS server.")
                }

                Section("Device") {
                    LabeledContent("Name", value: store.selectedPatient.deviceName)
                    LabeledContent("Status", value: store.isDeviceSynced ? "Synced" : "Waiting")
                    LabeledContent("Battery", value: "\(store.selectedPatient.batteryPercent)%")
                }

                Section("About") {
                    LabeledContent("App", value: "Smart Pillbox for iPhone")
                    LabeledContent("Version", value: "1.0")
                }
            }
            .scrollContentBackground(.hidden)
            .background(Color.careCream)
            .navigationTitle("Settings")
            .onAppear {
                draftServerURL = store.serverURL
                draftDeviceID = store.deviceID
            }
        }
    }
}
