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
    @State private var showingModeChooser = false
    @State private var showingModeConfirmation = false
    @State private var pendingMode: CareExperienceMode?
    @State private var isSwitchingMode = false
    @State private var modeSwitchStatus = ""

    var body: some View {
        NavigationStack {
            Form {
                Section {
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

                    Button {
                        showingModeChooser = true
                    } label: {
                        HStack {
                            Label("Explore or switch care mode", systemImage: "arrow.left.arrow.right")
                                .font(.subheadline.weight(.semibold))
                            Spacer()
                            Image(systemName: "chevron.right")
                                .font(.caption.weight(.bold))
                                .foregroundStyle(Color.careInkFaint)
                        }
                        .foregroundStyle(Color.careInk)
                    }
                } header: {
                    Text("Current care mode")
                } footer: {
                    Text("Circle Care and My Care are separate experiences. Switching requires confirmation; your pillbox data and medicine plan stay the same.")
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
        .sheet(isPresented: $showingModeChooser) {
            CareModeChooserView(currentMode: store.appMode) { mode in
                showingModeChooser = false
                Task {
                    try? await Task.sleep(nanoseconds: 250_000_000)
                    pendingMode = mode
                    showingModeConfirmation = true
                }
            }
            .presentationDetents([.large])
        }
        .alert(
            "Switch to \(pendingMode?.label ?? "another mode")?",
            isPresented: $showingModeConfirmation
        ) {
            Button("Cancel", role: .cancel) {
                pendingMode = nil
            }
            Button("Switch mode") {
                beginModeSwitch()
            }
        } message: {
            Text(modeConfirmationMessage)
        }
        .overlay {
            if isSwitchingMode {
                ZStack {
                    Color.black.opacity(0.32)
                        .ignoresSafeArea()

                    VStack(spacing: 17) {
                        ZStack {
                            Circle()
                                .fill(Color.careCoralSoft)
                                .frame(width: 68, height: 68)
                            Image(systemName: pendingMode?.symbol ?? "arrow.left.arrow.right")
                                .font(.system(size: 25, weight: .semibold))
                                .foregroundStyle(Color.careCoralInk)
                        }

                        ProgressView()
                            .tint(.careMint)
                            .controlSize(.large)

                        VStack(spacing: 5) {
                            Text(modeSwitchStatus)
                                .font(.headline)
                                .foregroundStyle(Color.careInk)
                                .multilineTextAlignment(.center)
                            Text("Your medicine plan and pillbox history remain shared.")
                                .font(.caption)
                                .foregroundStyle(Color.careInkSoft)
                                .multilineTextAlignment(.center)
                        }
                    }
                    .padding(.horizontal, 26)
                    .padding(.vertical, 28)
                    .frame(maxWidth: 310)
                    .background(Color.careSurface)
                    .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                    .shadow(color: .black.opacity(0.18), radius: 24, y: 10)
                }
                .transition(.opacity)
            }
        }
    }

    private var profileSummary: String {
        if store.appMode == .myCare {
            return "Your personal medicine profile"
        }
        return "\(store.userProfile.role) · \(store.patients.count) \(store.patients.count == 1 ? "person" : "people")"
    }

    private var modeConfirmationMessage: String {
        guard let pendingMode else { return "" }
        if pendingMode == .myCare {
            return "My Care is a calmer personal experience for the person taking the medicine. Circle Care data and the medication plan will stay unchanged."
        }
        return "Circle Care is the caregiver experience for family oversight, AI briefings and handoff notes. My Care data and the medication plan will stay unchanged."
    }

    private func beginModeSwitch() {
        guard let pendingMode else { return }
        isSwitchingMode = true
        modeSwitchStatus = "Preparing \(pendingMode.label)…"

        Task {
            try? await Task.sleep(nanoseconds: 650_000_000)
            modeSwitchStatus = "Loading your shared medicine plan…"
            try? await Task.sleep(nanoseconds: 850_000_000)
            withAnimation(.easeInOut(duration: 0.3)) {
                store.setAppMode(pendingMode)
            }
            modeSwitchStatus = "\(pendingMode.label) is ready"
            try? await Task.sleep(nanoseconds: 350_000_000)
            withAnimation(.easeOut(duration: 0.2)) {
                isSwitchingMode = false
            }
            self.pendingMode = nil
        }
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

private struct CareModeChooserView: View {
    @Environment(\.dismiss) private var dismiss

    let currentMode: CareExperienceMode
    let onSelect: (CareExperienceMode) -> Void

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    VStack(alignment: .leading, spacing: 7) {
                        Text("Two ways to use Smart Pillbox")
                            .font(.title2.weight(.bold))
                            .foregroundStyle(Color.careInk)
                        Text("Choose the experience that matches who is using the app right now. They share one pillbox history and one medication plan.")
                            .font(.subheadline)
                            .foregroundStyle(Color.careInkSoft)
                            .lineSpacing(3)
                            .fixedSize(horizontal: false, vertical: true)
                    }

                    modeCard(
                        .circleCare,
                        accent: .careCoralInk,
                        background: .careCoralSoft,
                        points: [
                            "Family and caregiver overview",
                            "Caregiver AI briefings and patterns",
                            "Journal entries for calls and handoffs",
                        ]
                    )

                    modeCard(
                        .myCare,
                        accent: .careMintInk,
                        background: .careMintSoft,
                        points: [
                            "Calm, larger personal layout",
                            "Simple daily medicine routine",
                            "One clear AI check-in",
                        ]
                    )

                    Label(
                        "Switching changes the interface only. It does not copy, delete or reset any care data.",
                        systemImage: "lock.shield.fill"
                    )
                    .font(.caption)
                    .foregroundStyle(Color.careInkSoft)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(15)
                    .careCard()
                }
                .padding(.horizontal, 18)
                .padding(.top, 20)
                .padding(.bottom, 30)
            }
            .background(Color.careCream)
            .navigationTitle("Care modes")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(Color.careSurface, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
        }
    }

    private func modeCard(
        _ mode: CareExperienceMode,
        accent: Color,
        background: Color,
        points: [String]
    ) -> some View {
        let isCurrent = currentMode == mode

        return VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .top, spacing: 13) {
                Image(systemName: mode.symbol)
                    .font(.system(size: 21, weight: .semibold))
                    .foregroundStyle(accent)
                    .frame(width: 48, height: 48)
                    .background(Color.careSurface)
                    .clipShape(Circle())

                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 8) {
                        Text(mode.label)
                            .font(.title3.weight(.bold))
                            .foregroundStyle(Color.careInk)
                        if isCurrent {
                            Text("CURRENT")
                                .font(.caption2.weight(.bold))
                                .foregroundStyle(accent)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Color.careSurface)
                                .clipShape(Capsule())
                        }
                    }
                    Text(mode.shortDescription)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(accent)
                }
            }

            VStack(alignment: .leading, spacing: 9) {
                ForEach(points, id: \.self) { point in
                    Label(point, systemImage: "checkmark.circle.fill")
                        .font(.subheadline)
                        .foregroundStyle(Color.careInkSoft)
                }
            }

            Button {
                onSelect(mode)
            } label: {
                HStack {
                    Text(isCurrent ? "You are in \(mode.label)" : "Switch to \(mode.label)")
                    Spacer()
                    Image(systemName: isCurrent ? "checkmark" : "arrow.right")
                }
                .font(.subheadline.weight(.bold))
                .foregroundStyle(isCurrent ? accent : Color.careOnAction)
                .padding(.horizontal, 16)
                .frame(height: 48)
                .background(isCurrent ? Color.careSurface : Color.careAction)
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            }
            .buttonStyle(.plain)
            .disabled(isCurrent)
        }
        .padding(18)
        .background(background)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(isCurrent ? accent.opacity(0.55) : Color.clear, lineWidth: 1.5)
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
