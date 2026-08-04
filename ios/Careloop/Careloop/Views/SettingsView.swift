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
    @State private var connectionDetailsExpanded = false

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Picker(
                        "Care experience",
                        selection: Binding(
                            get: { store.appMode },
                            set: { store.setAppMode($0) }
                        )
                    ) {
                        ForEach(CareExperienceMode.allCases) { mode in
                            Text(mode.label).tag(mode)
                        }
                    }
                    .pickerStyle(.segmented)
                    .labelsHidden()

                    HStack(alignment: .top, spacing: 13) {
                        Image(systemName: store.appMode.symbol)
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundStyle(Color.careCoralInk)
                            .frame(width: 42, height: 42)
                            .background(Color.careCoralSoft)
                            .clipShape(Circle())

                        VStack(alignment: .leading, spacing: 3) {
                            Text(store.appMode.shortDescription)
                                .font(.headline)
                                .foregroundStyle(Color.careInk)
                            Text(store.appMode.description)
                                .font(store.appMode == .myCare ? .body : .caption)
                                .foregroundStyle(Color.careInkSoft)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                    .padding(.vertical, 5)
                } header: {
                    Text("Choose your view")
                } footer: {
                    Text("You can switch views at any time. Your pillbox data and medicine plan stay the same.")
                }

                Section {
                    HStack(spacing: 14) {
                        ZStack {
                            Circle().fill(Color.careMintSoft)
                            Text(store.userProfile.initials)
                                .font(.headline.weight(.bold))
                                .foregroundStyle(Color.careMintInk)
                        }
                        .frame(width: 54, height: 54)

                        VStack(alignment: .leading, spacing: 3) {
                            Text(store.userProfile.fullName)
                                .font(store.appMode == .myCare ? .title3.weight(.bold) : .headline)
                                .foregroundStyle(Color.careInk)
                            Text(profileSummary)
                                .font(store.appMode == .myCare ? .body : .caption)
                                .foregroundStyle(Color.careInkSoft)
                        }
                    }
                    .padding(.vertical, 5)

                    NavigationLink {
                        EditProfileView()
                            .environmentObject(store)
                    } label: {
                        Label(
                            store.appMode == .myCare ? "Edit my details" : "Edit profile",
                            systemImage: "person.crop.circle.badge.pencil"
                        )
                    }

                    if let message = store.profileSyncMessage {
                        Label(
                            message,
                            systemImage: store.profileSyncFailed
                                ? "exclamationmark.icloud"
                                : "checkmark.icloud.fill"
                        )
                        .font(.caption)
                        .foregroundStyle(
                            store.profileSyncFailed
                                ? Color.careCoralInk
                                : Color.careMintInk
                        )
                    }
                } header: {
                    Text("Profile")
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

                if store.appMode == .circleCare {
                    Section("Notifications") {
                        Toggle("Missed dose alerts", isOn: $missedDoseAlerts)
                        Toggle("Late dose updates", isOn: $lateDoseAlerts)
                        Toggle("Device goes offline", isOn: $offlineAlerts)
                        Toggle("Weekly care summary", isOn: $weeklySummary)
                    }
                    .tint(.careMint)
                } else {
                    Section {
                        Toggle("Medicine reminders", isOn: $missedDoseAlerts)
                        Toggle("Pillbox connection updates", isOn: $offlineAlerts)
                    } header: {
                        Text("Reminders")
                    } footer: {
                        Text("My Care keeps notifications focused on your medicines and pillbox.")
                    }
                    .font(.body)
                    .tint(.careMint)
                }

                if store.appMode == .circleCare {
                    Section {
                        connectionSettingsFields
                    } header: {
                        Text("Smart Pillbox server")
                    } footer: {
                        Text("The iOS Simulator can use 127.0.0.1. On a physical iPhone, enter your Mac's local network address or a production HTTPS server.")
                    }
                } else {
                    Section {
                        DisclosureGroup(isExpanded: $connectionDetailsExpanded) {
                            connectionSettingsFields
                        } label: {
                            Label("Connection details", systemImage: "network")
                                .font(.body.weight(.semibold))
                        }
                    } header: {
                        Text("Smart Pillbox")
                    } footer: {
                        Text("Only change these details when someone helping with your pillbox asks you to.")
                    }
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
            .contentMargins(.top, 18, for: .scrollContent)
            .background(Color.careCream)
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(Color.careSurface, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .refreshable {
                await store.refreshUserProfile(reportFailure: true)
            }
            .onAppear {
                draftServerURL = store.serverURL
                draftDeviceID = store.deviceID
            }
        }
    }

    private var profileSummary: String {
        if store.appMode == .myCare {
            return "Your personal medicine profile"
        }
        return "\(store.userProfile.role) · \(store.patients.count) \(store.patients.count == 1 ? "person" : "people")"
    }

    @ViewBuilder
    private var connectionSettingsFields: some View {
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
    }
}

private struct EditProfileView: View {
    @EnvironmentObject private var store: CareStore
    @Environment(\.dismiss) private var dismiss

    @State private var fullName = ""
    @State private var role = ""
    @State private var email = ""
    @State private var phone = ""
    @State private var hasLoadedDraft = false

    var body: some View {
        Form {
            Section("About you") {
                TextField("Full name", text: $fullName)
                    .textContentType(.name)

                TextField(
                    store.appMode == .myCare ? "About you" : "Caregiver role",
                    text: $role
                )
            }

            Section("Contact") {
                TextField("Email", text: $email)
                    .keyboardType(.emailAddress)
                    .textContentType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()

                TextField("Phone", text: $phone)
                    .keyboardType(.phonePad)
                    .textContentType(.telephoneNumber)
            }

            if let message = store.profileSyncMessage,
               store.profileSyncFailed {
                Section {
                    Label(message, systemImage: "exclamationmark.circle")
                        .font(.caption)
                        .foregroundStyle(Color.careCoralInk)
                }
            }

            Section {
                Button {
                    Task {
                        let didSave = await store.updateUserProfile(
                            fullName: fullName,
                            email: email,
                            phone: phone,
                            role: role
                        )
                        if didSave {
                            dismiss()
                        }
                    }
                } label: {
                    HStack {
                        Label("Save profile", systemImage: "checkmark.circle.fill")
                        Spacer()
                        if store.isSavingProfile {
                            ProgressView()
                        }
                    }
                }
                .disabled(
                    store.isSavingProfile
                        || fullName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                        || role.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                )
            } footer: {
                Text(
                    store.appMode == .myCare
                        ? "Your details are saved on this iPhone first, then synced with Smart Pillbox."
                        : "Changes are saved on this iPhone first, then synced with the Smart Pillbox server."
                )
            }
        }
        .scrollContentBackground(.hidden)
        .background(Color.careCream)
        .navigationTitle("Edit profile")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            guard !hasLoadedDraft else { return }
            fullName = store.userProfile.fullName
            role = store.userProfile.role
            email = store.userProfile.email
            phone = store.userProfile.phone
            hasLoadedDraft = true
        }
    }
}
