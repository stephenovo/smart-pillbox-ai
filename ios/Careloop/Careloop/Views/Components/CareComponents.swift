import PhotosUI
import SwiftUI
import UIKit

struct PatientAvatarPortrait: View {
    let initials: String
    let presetID: String?
    let customAvatarData: Data?
    var size: CGFloat
    var background: Color = .careCreamDeep

    var body: some View {
        ZStack {
            Circle().fill(background)

            if let customAvatarData,
               let image = UIImage(data: customAvatarData) {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
            } else if let preset = CareAvatarPreset.preset(for: presetID) {
                Image(preset.assetName)
                    .resizable()
                    .scaledToFill()
            } else {
                Text(initials)
                    .font(.system(size: size * 0.25, weight: .bold, design: .rounded))
                    .foregroundStyle(Color.careInkSoft)
            }
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
    }
}

struct CareAvatar: View {
    let patient: CarePatient
    let wellbeing: PatientWellbeing
    var size: CGFloat = 52

    private var fill: Color {
        if patient.id == "margaret" { return .careCoralSoft }
        let seed = patient.initials.unicodeScalars.reduce(0) { $0 + Int($1.value) }
        return seed.isMultiple(of: 2) ? .careMintSoft : .careSkySoft
    }

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            PatientAvatarPortrait(
                initials: patient.initials,
                presetID: patient.resolvedAvatarPresetID,
                customAvatarData: patient.customAvatarData,
                size: size,
                background: fill
            )
                .overlay {
                    Circle()
                        .stroke(wellbeing.tint, lineWidth: 2.5)
                }

            Circle()
                .fill(wellbeing.tint)
                .frame(width: size * 0.22, height: size * 0.22)
                .overlay { Circle().stroke(Color.careSurface, lineWidth: 2) }
                .offset(x: 1, y: 1)
        }
        .frame(width: size, height: size)
        .accessibilityLabel("\(patient.name), \(wellbeing.label)")
    }
}

struct PatientAvatarPickerView: View {
    @Environment(\.dismiss) private var dismiss

    let initials: String
    @Binding var selectedPresetID: String?
    @Binding var customAvatarData: Data?
    var onSave: ((String?, Data?) -> Void)?

    @State private var selectedPhotoItem: PhotosPickerItem?
    @State private var workingPresetID: String?
    @State private var workingAvatarData: Data?
    @State private var isLoadingPhoto = false
    @State private var photoError: String?

    private let columns = [
        GridItem(.adaptive(minimum: 72, maximum: 86), spacing: 14),
    ]

    init(
        initials: String,
        selectedPresetID: Binding<String?>,
        customAvatarData: Binding<Data?>,
        onSave: ((String?, Data?) -> Void)? = nil
    ) {
        self.initials = initials
        _selectedPresetID = selectedPresetID
        _customAvatarData = customAvatarData
        self.onSave = onSave
        _workingPresetID = State(initialValue: selectedPresetID.wrappedValue)
        _workingAvatarData = State(initialValue: customAvatarData.wrappedValue)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    currentAvatar
                    photoSection

                    VStack(alignment: .leading, spacing: 12) {
                        Text("Choose a character")
                            .font(.headline)
                            .foregroundStyle(Color.careInk)
                        Text("Every character is available to every person—pick the one that feels most like them.")
                            .font(.caption)
                            .foregroundStyle(Color.careInkSoft)
                            .fixedSize(horizontal: false, vertical: true)

                        LazyVGrid(columns: columns, spacing: 14) {
                            ForEach(Array(CareAvatarPreset.all.enumerated()), id: \.element.id) { index, preset in
                                Button {
                                    withAnimation(.easeOut(duration: 0.18)) {
                                        workingPresetID = preset.id
                                        workingAvatarData = nil
                                    }
                                } label: {
                                    PatientAvatarPortrait(
                                        initials: initials,
                                        presetID: preset.id,
                                        customAvatarData: nil,
                                        size: 72
                                    )
                                    .padding(4)
                                    .background(
                                        Circle().fill(Color.careSurface)
                                    )
                                    .overlay {
                                        Circle().stroke(
                                            workingAvatarData == nil && workingPresetID == preset.id
                                                ? Color.careCoral
                                                : Color.clear,
                                            lineWidth: 3
                                        )
                                    }
                                }
                                .buttonStyle(.plain)
                                .accessibilityLabel("Character avatar option \(index + 1)")
                                .accessibilityAddTraits(
                                    workingAvatarData == nil && workingPresetID == preset.id
                                        ? .isSelected
                                        : []
                                )
                            }
                        }
                    }

                    Label(
                        "Built-in artwork is bundled under CC0 1.0. Photos are processed and stored locally, and the app doesn’t upload them.",
                        systemImage: "checkmark.shield.fill"
                    )
                    .font(.caption)
                    .foregroundStyle(Color.careInkSoft)
                    .padding(13)
                    .background(Color.careMintSoft.opacity(0.65))
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
                .padding(18)
            }
            .background(Color.careCream)
            .navigationTitle("Person avatar")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(Color.careSurface, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") {
                        selectedPresetID = workingPresetID
                        customAvatarData = workingAvatarData
                        onSave?(workingPresetID, workingAvatarData)
                        dismiss()
                    }
                    .fontWeight(.semibold)
                }
            }
            .alert("Couldn’t use that photo", isPresented: photoErrorBinding) {
                Button("OK", role: .cancel) { photoError = nil }
            } message: {
                Text(photoError ?? "Please try another image.")
            }
        }
    }

    private var currentAvatar: some View {
        HStack(spacing: 16) {
            PatientAvatarPortrait(
                initials: initials,
                presetID: workingPresetID,
                customAvatarData: workingAvatarData,
                size: 92
            )
            .overlay { Circle().stroke(Color.careCoral, lineWidth: 3) }

            VStack(alignment: .leading, spacing: 5) {
                Text("Their pillbox, their look")
                    .font(.title3.weight(.bold))
                    .foregroundStyle(Color.careInk)
                Text("This avatar appears throughout Circle Care and My Care.")
                    .font(.subheadline)
                    .foregroundStyle(Color.careInkSoft)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var photoSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Use a photo")
                .font(.headline)
                .foregroundStyle(Color.careInk)

            PhotosPicker(selection: $selectedPhotoItem, matching: .images) {
                HStack {
                    Label(
                        workingAvatarData == nil ? "Choose from Photos" : "Choose a different photo",
                        systemImage: "photo.on.rectangle.angled"
                    )
                    .font(.subheadline.weight(.semibold))
                    Spacer()
                    if isLoadingPhoto {
                        ProgressView()
                    } else {
                        Image(systemName: "chevron.right")
                            .font(.caption.weight(.bold))
                    }
                }
                .foregroundStyle(Color.careInk)
                .padding(14)
                .background(Color.careSurface)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
            .disabled(isLoadingPhoto)
            .onChange(of: selectedPhotoItem) { _, newItem in
                guard let newItem else { return }
                Task { await loadPhoto(newItem) }
            }
        }
    }

    private var photoErrorBinding: Binding<Bool> {
        Binding(
            get: { photoError != nil },
            set: { if !$0 { photoError = nil } }
        )
    }

    @MainActor
    private func loadPhoto(_ item: PhotosPickerItem) async {
        isLoadingPhoto = true
        defer { isLoadingPhoto = false }

        do {
            guard let sourceData = try await item.loadTransferable(type: Data.self),
                  let preparedData = AvatarPhotoProcessor.preparedData(from: sourceData) else {
                throw AvatarPhotoError.unreadable
            }
            workingAvatarData = preparedData
        } catch {
            photoError = "The selected image couldn’t be prepared. Please choose another photo."
        }
    }
}

private enum AvatarPhotoError: Error {
    case unreadable
}

private enum AvatarPhotoProcessor {
    static func preparedData(from sourceData: Data) -> Data? {
        guard let image = UIImage(data: sourceData),
              image.size.width > 0,
              image.size.height > 0 else {
            return nil
        }

        let outputSize = CGSize(width: 512, height: 512)
        let scale = max(
            outputSize.width / image.size.width,
            outputSize.height / image.size.height
        )
        let drawSize = CGSize(
            width: image.size.width * scale,
            height: image.size.height * scale
        )
        let drawRect = CGRect(
            x: (outputSize.width - drawSize.width) / 2,
            y: (outputSize.height - drawSize.height) / 2,
            width: drawSize.width,
            height: drawSize.height
        )

        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        format.opaque = true
        let preparedImage = UIGraphicsImageRenderer(size: outputSize, format: format).image { context in
            UIColor.white.setFill()
            context.fill(CGRect(origin: .zero, size: outputSize))
            image.draw(in: drawRect)
        }
        return preparedImage.jpegData(compressionQuality: 0.82)
    }
}

struct WellbeingPill: View {
    let wellbeing: PatientWellbeing

    var body: some View {
        Text(wellbeing.label)
            .font(.caption2.weight(.bold))
            .foregroundStyle(wellbeing.foreground)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(wellbeing.background)
            .clipShape(Capsule())
    }
}

struct DoseStatusPill: View {
    let kind: DoseStatusKind

    var body: some View {
        Label(kind.label, systemImage: kind.symbol)
            .font(.caption2.weight(.bold))
            .foregroundStyle(kind.foreground)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(kind.background)
            .clipShape(Capsule())
    }
}

struct SyncPill: View {
    let isSynced: Bool

    var body: some View {
        Label(isSynced ? "Synced" : "Waiting", systemImage: isSynced ? "wifi" : "wifi.slash")
            .font(.caption.weight(.semibold))
            .foregroundStyle(isSynced ? Color.careMintInk : Color.careInkSoft)
            .padding(.horizontal, 10)
            .padding(.vertical, 7)
            .background(isSynced ? Color.careMintSoft : Color.careCreamDeep)
            .clipShape(Capsule())
    }
}

struct PatientCarousel: View {
    @EnvironmentObject private var store: CareStore
    private let onAddPillbox: () -> Void

    init(onAddPillbox: @escaping () -> Void = {}) {
        self.onAddPillbox = onAddPillbox
    }

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 20) {
                ForEach(store.patients) { patient in
                    let wellbeing = store.wellbeing(for: patient)
                    Button {
                        withAnimation(.easeOut(duration: 0.2)) {
                            store.selectPatient(patient)
                        }
                    } label: {
                        VStack(spacing: 7) {
                            CareAvatar(
                                patient: patient,
                                wellbeing: wellbeing,
                                size: store.selectedPatientID == patient.id ? 58 : 54
                            )
                            Text(patient.firstName)
                                .font(.caption.weight(store.selectedPatientID == patient.id ? .bold : .medium))
                                .foregroundStyle(store.selectedPatientID == patient.id ? Color.careInk : Color.careInkSoft)
                        }
                        .frame(width: 66)
                    }
                    .buttonStyle(.plain)
                }

                Button(action: onAddPillbox) {
                    VStack(spacing: 7) {
                        ZStack(alignment: .bottomTrailing) {
                            Circle()
                                .fill(Color.careSurface)
                                .overlay {
                                    Circle()
                                        .stroke(
                                            Color.careInkFaint,
                                            style: StrokeStyle(lineWidth: 1.4, dash: [5, 4])
                                        )
                                }
                                .overlay {
                                    Image(systemName: "pills")
                                        .font(.system(size: 18, weight: .medium))
                                        .foregroundStyle(Color.careInkSoft)
                                }

                            Image(systemName: "plus")
                                .font(.system(size: 9, weight: .bold))
                                .foregroundStyle(Color.white)
                                .frame(width: 19, height: 19)
                                .background(Color.careCoral)
                                .clipShape(Circle())
                                .overlay { Circle().stroke(Color.careSurface, lineWidth: 2) }
                        }
                        .frame(width: 54, height: 54)

                        Text("Add")
                            .font(.caption.weight(.medium))
                            .foregroundStyle(Color.careInkSoft)
                    }
                    .frame(width: 66)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Add a pillbox")
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 4)
        }
    }
}

struct SegmentedDoseProgress: View {
    let completed: Int
    let total: Int

    var body: some View {
        HStack(spacing: 5) {
            ForEach(0..<max(total, 1), id: \.self) { index in
                Capsule()
                    .fill(index < completed ? Color.careMint : Color.careCreamDeep)
                    .frame(height: 5)
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(completed) of \(total) doses taken")
    }
}

struct CareSectionHeader: View {
    let title: String
    var trailing: String?

    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            Text(title)
                .font(.headline)
                .foregroundStyle(Color.careInk)
            Spacer()
            if let trailing {
                Text(trailing)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(Color.careInkFaint)
            }
        }
    }
}

struct CareActionButton: View {
    let title: String
    let symbol: String
    var isActive = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 6) {
                Image(systemName: symbol)
                    .font(.system(size: 18, weight: .medium))
                Text(title)
                    .font(.caption2.weight(.semibold))
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
            .foregroundStyle(isActive ? Color.careMintInk : Color.careInk)
            .frame(maxWidth: .infinity)
            .frame(height: 56)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

struct CareActionLink: View {
    let title: String
    let symbol: String
    let destination: URL?

    var body: some View {
        Group {
            if let destination {
                Link(destination: destination) {
                    content
                }
            } else {
                content.opacity(0.4)
            }
        }
    }

    private var content: some View {
        VStack(spacing: 6) {
            Image(systemName: symbol)
                .font(.system(size: 18, weight: .medium))
            Text(title)
                .font(.caption2.weight(.semibold))
        }
        .foregroundStyle(Color.careInk)
        .frame(maxWidth: .infinity)
        .frame(height: 56)
    }
}

struct NoteComposerView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var store: CareStore

    @State private var patientID: String
    @State private var text = ""

    init(initialPatientID: String) {
        _patientID = State(initialValue: initialPatientID)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Picker("Person", selection: $patientID) {
                        ForEach(store.patients) { patient in
                            Text(patient.name).tag(patient.id)
                        }
                    }
                } header: {
                    Text("Care journal")
                } footer: {
                    Text("Capture useful human context after a call, visit or handoff. Journal entries do not change medication instructions.")
                }

                Section("Quick start") {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            starterButton("Phone check-in", text: "Called \(selectedPatientName). ")
                            starterButton("Home visit", text: "Visited \(selectedPatientName). ")
                            starterButton("Family handoff", text: "Family handoff: ")
                        }
                    }
                    .listRowInsets(EdgeInsets(top: 10, leading: 16, bottom: 10, trailing: 0))
                }

                Section("What should the next caregiver know?") {
                    TextEditor(text: $text)
                        .frame(minHeight: 150)
                }
            }
            .navigationTitle("Add journal entry")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        store.addNote(text: text, patientID: patientID)
                        dismiss()
                    }
                    .fontWeight(.semibold)
                    .disabled(text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
    }

    private var selectedPatientName: String {
        store.patients.first(where: { $0.id == patientID })?.firstName ?? "them"
    }

    private func starterButton(_ title: String, text starterText: String) -> some View {
        Button {
            if text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                text = starterText
            }
        } label: {
            Text(title)
                .font(.caption.weight(.semibold))
                .foregroundStyle(Color.careInk)
                .padding(.horizontal, 12)
                .padding(.vertical, 9)
                .background(Color.careCreamDeep)
                .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }
}

struct ConnectPillboxView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var store: CareStore

    @State private var selectedMethod: PillboxConnectionMethod = .connectionCode
    @State private var connectionCode = ""
    @State private var isSearchingNearby = false
    @State private var showingSetupMessage = false
    @State private var setupMessage = ""
    @State private var connectionError: String?
    @State private var isConnected = false
    @State private var showingInitialisation = false

    private let demoDeviceID = "PILLBOX-IFF-2026"

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    VStack(alignment: .leading, spacing: 8) {
                        ZStack {
                            Circle().fill(Color.careCoralSoft)
                            Image(systemName: "pills.fill")
                                .font(.system(size: 24, weight: .semibold))
                                .foregroundStyle(Color.careCoralInk)
                        }
                        .frame(width: 52, height: 52)

                        Text("Connect a new pillbox")
                            .font(.title2.weight(.bold))
                            .foregroundStyle(Color.careInk)
                        Text("Choose the setup method that is easiest for you. Your current pillbox and medication plan will stay unchanged.")
                            .font(.subheadline)
                            .foregroundStyle(Color.careInkSoft)
                            .fixedSize(horizontal: false, vertical: true)
                    }

                    if isConnected {
                        connectedConfirmation
                    } else {
                        VStack(spacing: 10) {
                            ForEach(PillboxConnectionMethod.allCases) { method in
                                connectionMethodButton(method)
                            }
                        }

                        connectionMethodDetail
                    }
                }
                .padding(.horizontal, 18)
                .padding(.top, 18)
                .padding(.bottom, 32)
            }
            .background(Color.careCream)
            .navigationTitle("Add pillbox")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(Color.careSurface, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
            .alert("Connection setup", isPresented: $showingSetupMessage) {
                Button("Got it", role: .cancel) {}
            } message: {
                Text(setupMessage)
            }
            .fullScreenCover(isPresented: $showingInitialisation) {
                let linkedPatient = store.patient(linkedTo: demoDeviceID)
                PillboxSetupView(
                    patient: linkedPatient,
                    initialPlan: linkedPatient.map { store.setupPlan(for: $0.id) } ?? [],
                    deviceID: demoDeviceID,
                    isDemoConnected: true
                ) { _ in
                    showingInitialisation = false
                    dismiss()
                }
                .environmentObject(store)
            }
        }
    }

    private var connectedConfirmation: some View {
        VStack(spacing: 14) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 48, weight: .medium))
                .foregroundStyle(Color.careMint)
            VStack(spacing: 4) {
                Text("Pillbox connected")
                    .font(.headline)
                    .foregroundStyle(Color.careInk)
                Text("Opening initialization so you can add the person and medication routine…")
                    .font(.caption)
                    .foregroundStyle(Color.careInkSoft)
                    .multilineTextAlignment(.center)
            }
            Text(demoDeviceID)
                .font(.caption2.weight(.semibold).monospaced())
                .foregroundStyle(Color.careMintInk)
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(Color.careMintSoft)
                .clipShape(Capsule())
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 28)
        .padding(.horizontal, 18)
        .careCard()
        .accessibilityElement(children: .combine)
    }

    private func connectionMethodButton(_ method: PillboxConnectionMethod) -> some View {
        Button {
            withAnimation(.easeOut(duration: 0.2)) {
                selectedMethod = method
            }
        } label: {
            HStack(spacing: 13) {
                Image(systemName: method.symbol)
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(selectedMethod == method ? Color.careCoralInk : Color.careInkSoft)
                    .frame(width: 42, height: 42)
                    .background(selectedMethod == method ? Color.careCoralSoft : Color.careCreamDeep)
                    .clipShape(Circle())

                VStack(alignment: .leading, spacing: 3) {
                    Text(method.title)
                        .font(.subheadline.weight(.bold))
                        .foregroundStyle(Color.careInk)
                    Text(method.subtitle)
                        .font(.caption)
                        .foregroundStyle(Color.careInkSoft)
                }

                Spacer(minLength: 8)
                Image(systemName: selectedMethod == method ? "checkmark.circle.fill" : "circle")
                    .foregroundStyle(selectedMethod == method ? Color.careCoral : Color.careInkFaint)
            }
            .padding(14)
            .background(Color.careSurface)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(selectedMethod == method ? Color.careCoral : Color.careLine, lineWidth: 1)
            }
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private var connectionMethodDetail: some View {
        switch selectedMethod {
        case .qrCode:
            VStack(spacing: 16) {
                Image(systemName: "viewfinder")
                    .font(.system(size: 72, weight: .ultraLight))
                    .foregroundStyle(Color.careInk)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 26)
                    .background(Color.careCreamDeep)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))

                Text("Find the QR code on the bottom of the pillbox or inside its packaging.")
                    .font(.caption)
                    .foregroundStyle(Color.careInkSoft)
                    .multilineTextAlignment(.center)

                primaryButton(title: "Scan QR code", symbol: "camera.fill") {
                    showSetupMessage(
                        "QR setup is designed and ready. Camera pairing will be enabled with the device onboarding service."
                    )
                }
            }
            .padding(16)
            .careCard()

        case .connectionCode:
            VStack(alignment: .leading, spacing: 14) {
                Text("Enter the connection code")
                    .font(.headline)
                    .foregroundStyle(Color.careInk)
                Text("The code is printed next to the QR code and is not case-sensitive.")
                    .font(.caption)
                    .foregroundStyle(Color.careInkSoft)

                TextField("e.g. IFF 2026", text: $connectionCode)
                    .textInputAutocapitalization(.characters)
                    .autocorrectionDisabled()
                    .font(.title3.weight(.semibold).monospaced())
                    .padding(14)
                    .background(Color.careCreamDeep)
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                    .onChange(of: connectionCode) {
                        connectionError = nil
                    }

                Label("Demo connection code: IFF 2026", systemImage: "info.circle")
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(Color.careMintInk)

                if let connectionError {
                    Label(connectionError, systemImage: "exclamationmark.circle.fill")
                        .font(.caption)
                        .foregroundStyle(Color.careCoralInk)
                        .fixedSize(horizontal: false, vertical: true)
                }

                primaryButton(title: "Continue", symbol: "arrow.right") {
                    connectWithCode()
                }
                .disabled(connectionCode.trimmingCharacters(in: .whitespacesAndNewlines).count < 4)
                .opacity(connectionCode.trimmingCharacters(in: .whitespacesAndNewlines).count < 4 ? 0.45 : 1)
            }
            .padding(16)
            .careCard()

        case .bluetooth:
            VStack(alignment: .leading, spacing: 14) {
                Text("Find a nearby pillbox")
                    .font(.headline)
                    .foregroundStyle(Color.careInk)
                Text("Keep the pillbox powered on and within arm's reach while Smart Pillbox looks nearby.")
                    .font(.caption)
                    .foregroundStyle(Color.careInkSoft)

                if isSearchingNearby {
                    HStack(spacing: 12) {
                        ProgressView()
                            .tint(.careMint)
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Looking nearby…")
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(Color.careInk)
                            Text("This usually takes a few seconds.")
                                .font(.caption)
                                .foregroundStyle(Color.careInkSoft)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(14)
                    .background(Color.careMintSoft)
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                }

                primaryButton(
                    title: isSearchingNearby ? "Searching…" : "Search with Bluetooth",
                    symbol: "dot.radiowaves.left.and.right"
                ) {
                    searchNearby()
                }
                .disabled(isSearchingNearby)
            }
            .padding(16)
            .careCard()
        }
    }

    private func primaryButton(
        title: String,
        symbol: String,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            Label(title, systemImage: symbol)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Color.careOnAction)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 13)
                .background(Color.careAction)
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
        }
        .buttonStyle(.plain)
    }

    private func searchNearby() {
        isSearchingNearby = true
        Task {
            try? await Task.sleep(nanoseconds: 1_200_000_000)
            isSearchingNearby = false
            showSetupMessage(
                "Bluetooth setup is designed and ready. Nearby-device pairing will activate with the hardware onboarding service."
            )
        }
    }

    private func connectWithCode() {
        let normalizedCode = connectionCode
            .uppercased()
            .filter { $0.isLetter || $0.isNumber }

        guard normalizedCode == "IFF2026" else {
            connectionError = "That code wasn't recognised. For this demo, use IFF 2026."
            return
        }

        connectionError = nil
        withAnimation(.easeOut(duration: 0.25)) {
            isConnected = true
        }

        Task {
            try? await Task.sleep(nanoseconds: 700_000_000)
            showingInitialisation = true
        }
    }

    private func showSetupMessage(_ message: String) {
        setupMessage = message
        showingSetupMessage = true
    }
}

struct PillboxGuidebookView: View {
    @Environment(\.dismiss) private var dismiss

    let mode: CareExperienceMode
    let patient: CarePatient
    let onComplete: () -> Void

    @State private var stepIndex = 0

    private struct GuideStep: Identifiable {
        let id: Int
        let symbol: String
        let eyebrow: String
        let title: String
        let description: String
        let detail: String
        let tint: Color
        let background: Color
    }

    private var steps: [GuideStep] {
        if mode == .circleCare {
            return [
                GuideStep(
                    id: 0,
                    symbol: "square.grid.2x2.fill",
                    eyebrow: "STEP 1 · TODAY",
                    title: "See what needs your attention",
                    description: "Start with \(patient.firstName)'s dose status, pillbox connection and anything that may need a gentle check-in.",
                    detail: "You do not need to read every event. The care feed brings the important changes forward.",
                    tint: .careCoralInk,
                    background: .careCoralSoft
                ),
                GuideStep(
                    id: 1,
                    symbol: "heart.fill",
                    eyebrow: "STEP 2 · CAREGIVER AI",
                    title: "Read the caregiver briefing",
                    description: "AI turns recent pillbox activity into a warm summary of what changed and what you may want to do next.",
                    detail: "It supports your judgement. It never changes medication instructions or replaces clinical advice.",
                    tint: .careMintInk,
                    background: .careMintSoft
                ),
                GuideStep(
                    id: 2,
                    symbol: "square.and.pencil",
                    eyebrow: "STEP 3 · CARE JOURNAL",
                    title: "Leave context for the next caregiver",
                    description: "After a call, visit or family handoff, add a short journal entry so the care circle knows what happened.",
                    detail: "The medicine plan and pillbox data stay shared even if you later open My Care.",
                    tint: .careSkyInk,
                    background: .careSkySoft
                ),
            ]
        }

        return [
            GuideStep(
                id: 0,
                symbol: "sun.max.fill",
                eyebrow: "STEP 1 · MY DAY",
                title: "Begin with today's simple plan",
                description: "My Day keeps the next medicine, today's progress and the most important pillbox update easy to see.",
                detail: "The larger, calmer layout is designed for the person taking the medicine.",
                tint: .careCoralInk,
                background: .careCoralSoft
            ),
            GuideStep(
                id: 1,
                symbol: "bell.badge.fill",
                eyebrow: "STEP 2 · REMINDERS",
                title: "Follow the pillbox reminder",
                description: "When it is time, open the matching compartment and keep following the instructions from your clinician.",
                detail: "If something looks unfamiliar, pause and ask someone you trust before taking another dose.",
                tint: .careHoneyInk,
                background: .careHoneySoft
            ),
            GuideStep(
                id: 2,
                symbol: "sparkles",
                eyebrow: "STEP 3 · AI CHECK-IN",
                title: "Get one clear, reassuring thought",
                description: "AI Check-in explains today's pillbox pattern in plain language and gently points out anything worth checking.",
                detail: "Circle Care uses the same medicine plan and pillbox data when family support is needed.",
                tint: .careMintInk,
                background: .careMintSoft
            ),
        ]
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                HStack(spacing: 7) {
                    ForEach(steps.indices, id: \.self) { index in
                        Capsule()
                            .fill(index <= stepIndex ? Color.careCoral : Color.careCreamDeep)
                            .frame(height: 5)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 18)

                TabView(selection: $stepIndex) {
                    ForEach(steps) { step in
                        guidePage(step)
                            .tag(step.id)
                    }
                }
                .tabViewStyle(.page(indexDisplayMode: .never))

                VStack(spacing: 10) {
                    Button {
                        if stepIndex == steps.count - 1 {
                            finishGuide()
                        } else {
                            withAnimation(.easeInOut(duration: 0.25)) {
                                stepIndex += 1
                            }
                        }
                    } label: {
                        HStack {
                            Text(stepIndex == steps.count - 1 ? "Start \(mode.label)" : "Continue")
                            Spacer()
                            Image(systemName: stepIndex == steps.count - 1 ? "checkmark" : "arrow.right")
                        }
                        .font(.headline)
                        .foregroundStyle(Color.careOnAction)
                        .padding(.horizontal, 18)
                        .frame(height: 54)
                        .background(Color.careAction)
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    }
                    .buttonStyle(.plain)

                    Text("You can revisit setup from Medication Plan at any time.")
                        .font(.caption)
                        .foregroundStyle(Color.careInkFaint)
                }
                .padding(.horizontal, 20)
                .padding(.top, 10)
                .padding(.bottom, 14)
                .background(Color.careSurface)
            }
            .background(Color.careCream)
            .navigationTitle("Pillbox ready")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(Color.careSurface, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Skip") { finishGuide() }
                }
            }
        }
    }

    private func guidePage(_ step: GuideStep) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                HStack(spacing: 8) {
                    Image(systemName: mode.symbol)
                    Text(mode.label)
                }
                .font(.caption.weight(.bold))
                .foregroundStyle(Color.careInk)
                .padding(.horizontal, 11)
                .padding(.vertical, 7)
                .background(Color.careSurface)
                .clipShape(Capsule())
                .overlay {
                    Capsule().stroke(Color.careLine, lineWidth: 1)
                }

                VStack(alignment: .leading, spacing: 18) {
                    Image(systemName: step.symbol)
                        .font(.system(size: 32, weight: .semibold))
                        .foregroundStyle(step.tint)
                        .frame(width: 68, height: 68)
                        .background(Color.careSurface)
                        .clipShape(Circle())

                    VStack(alignment: .leading, spacing: 9) {
                        Text(step.eyebrow)
                            .font(.caption.weight(.bold))
                            .foregroundStyle(step.tint)
                        Text(step.title)
                            .font(.largeTitle.weight(.bold))
                            .foregroundStyle(Color.careInk)
                            .fixedSize(horizontal: false, vertical: true)
                        Text(step.description)
                            .font(mode == .myCare ? .title3 : .body)
                            .foregroundStyle(Color.careInkSoft)
                            .lineSpacing(5)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
                .padding(24)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(step.background)
                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))

                Label(step.detail, systemImage: "info.circle.fill")
                    .font(mode == .myCare ? .body : .subheadline)
                    .foregroundStyle(Color.careInkSoft)
                    .lineSpacing(4)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(17)
                    .careCard()
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 24)
        }
    }

    private func finishGuide() {
        dismiss()
        Task {
            try? await Task.sleep(nanoseconds: 250_000_000)
            onComplete()
        }
    }
}

private enum PillboxConnectionMethod: String, CaseIterable, Identifiable {
    case qrCode
    case connectionCode
    case bluetooth

    var id: String { rawValue }

    var title: String {
        switch self {
        case .qrCode: "Scan QR code"
        case .connectionCode: "Enter connection code"
        case .bluetooth: "Use Bluetooth"
        }
    }

    var subtitle: String {
        switch self {
        case .qrCode: "Fastest when the box is in front of you"
        case .connectionCode: "Use the code printed on the pillbox"
        case .bluetooth: "Look for a powered-on device nearby"
        }
    }

    var symbol: String {
        switch self {
        case .qrCode: "qrcode.viewfinder"
        case .connectionCode: "number.square"
        case .bluetooth: "dot.radiowaves.left.and.right"
        }
    }
}
