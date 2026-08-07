import SwiftUI

struct PillboxSetupView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var store: CareStore

    private let existingPatientID: String?
    private let deviceID: String
    private let isDemoConnected: Bool
    private let onComplete: (CarePatient) -> Void

    @State private var fullName: String
    @State private var relation: String
    @State private var ageText: String
    @State private var livingSituation: String
    @State private var phone: String
    @State private var deviceName: String
    @State private var draftPlan: [MedicationSlot]
    @State private var isSaving = false
    @State private var guidebookPatient: CarePatient?

    init(
        patient: CarePatient?,
        initialPlan: [MedicationSlot],
        deviceID: String,
        isDemoConnected: Bool,
        onComplete: @escaping (CarePatient) -> Void
    ) {
        existingPatientID = patient?.id
        self.deviceID = deviceID
        self.isDemoConnected = isDemoConnected
        self.onComplete = onComplete

        _fullName = State(initialValue: patient?.name ?? "")
        _relation = State(initialValue: patient?.relation ?? "Family member")
        _ageText = State(initialValue: patient.map { String($0.age) } ?? "")
        _livingSituation = State(
            initialValue: patient?.livingSituation ?? "Lives independently"
        )
        _phone = State(initialValue: patient?.phone ?? "")
        _deviceName = State(initialValue: patient?.deviceName ?? "Home pillbox")
        _draftPlan = State(
            initialValue: initialPlan.isEmpty ? Self.emptyPlan : initialPlan
        )
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    setupHeader
                    personDetailsCard
                    deviceCard
                    medicationPlanSection
                    safetyNote
                }
                .padding(.horizontal, 16)
                .padding(.top, 16)
                .padding(.bottom, 110)
            }
            .background(Color.careCream)
            .navigationTitle("Pillbox setup")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(Color.careSurface, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
            .fullScreenCover(item: $guidebookPatient) { patient in
                PillboxGuidebookView(
                    mode: store.appMode,
                    patient: patient
                ) {
                    guidebookPatient = nil
                    onComplete(patient)
                }
            }
            .safeAreaInset(edge: .bottom) {
                saveBar
            }
        }
    }

    private var setupHeader: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                ForEach(0..<3, id: \.self) { index in
                    Capsule()
                        .fill(index < 3 ? Color.careCoral : Color.careCreamDeep)
                        .frame(height: 5)
                }
            }

            Text(existingPatientID == nil ? "Finish the new pillbox" : "Update this pillbox")
                .font(.title2.weight(.bold))
                .foregroundStyle(Color.careInk)
            Text("Add who this pillbox belongs to, then confirm each medication compartment. You can return here from Medication Plan whenever something changes.")
                .font(.subheadline)
                .foregroundStyle(Color.careInkSoft)
                .lineSpacing(3)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var personDetailsCard: some View {
        VStack(alignment: .leading, spacing: 15) {
            setupSectionTitle(
                title: "Who is this for?",
                subtitle: "This name will appear beside Margaret in your care circle.",
                symbol: "person.fill"
            )

            setupField(title: "Full name", placeholder: "e.g. Helen Wong", text: $fullName)

            HStack(alignment: .top, spacing: 10) {
                setupField(title: "Relationship", placeholder: "e.g. Mum", text: $relation)
                setupField(title: "Age", placeholder: "78", text: $ageText, keyboard: .numberPad)
                    .frame(width: 92)
            }

            setupField(
                title: "Living situation",
                placeholder: "e.g. Lives independently",
                text: $livingSituation
            )
            setupField(
                title: "Phone (optional)",
                placeholder: "+852…",
                text: $phone,
                keyboard: .phonePad
            )
        }
        .padding(16)
        .careCard()
    }

    private var deviceCard: some View {
        VStack(alignment: .leading, spacing: 15) {
            HStack(alignment: .top) {
                setupSectionTitle(
                    title: "Pillbox",
                    subtitle: "Give it a familiar name for everyday use.",
                    symbol: "pills.fill"
                )
                Spacer(minLength: 8)
                Label("Connected", systemImage: "checkmark.circle.fill")
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(Color.careMintInk)
                    .padding(.horizontal, 9)
                    .padding(.vertical, 6)
                    .background(Color.careMintSoft)
                    .clipShape(Capsule())
            }

            setupField(
                title: "Pillbox name",
                placeholder: "e.g. Kitchen pillbox",
                text: $deviceName
            )

            HStack {
                Text("Connection")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(Color.careInkSoft)
                Spacer()
                Text(deviceID)
                    .font(.caption2.weight(.semibold).monospaced())
                    .foregroundStyle(Color.careInkFaint)
            }
        }
        .padding(16)
        .careCard()
    }

    private var medicationPlanSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            CareSectionHeader(
                title: "Medication routine",
                trailing: "\(activeMedicationCount) active"
            )

            ForEach(draftPlan.indices, id: \.self) { index in
                medicationCard(index: index)
            }
        }
    }

    private func medicationCard(index: Int) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("COMPARTMENT \(draftPlan[index].slotId)")
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(Color.careInkFaint)
                    Text(
                        draftPlan[index].medication.isEmpty
                            ? "Add medication"
                            : draftPlan[index].medication
                    )
                    .font(.headline)
                    .foregroundStyle(Color.careInk)
                    .lineLimit(1)
                }
                Spacer()
                if draftPlan[index].highRisk {
                    Text("High attention")
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(Color.careCoralInk)
                        .padding(.horizontal, 9)
                        .padding(.vertical, 6)
                        .background(Color.careCoralSoft)
                        .clipShape(Capsule())
                }
            }

            setupField(
                title: "Medication name",
                placeholder: "Leave blank if unused",
                text: $draftPlan[index].medication
            )

            HStack(alignment: .top, spacing: 10) {
                setupField(
                    title: "Reminder time",
                    placeholder: "08:00",
                    text: $draftPlan[index].scheduledTime,
                    keyboard: .numbersAndPunctuation
                )

                VStack(alignment: .leading, spacing: 7) {
                    Text("Buffer")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(Color.careInkSoft)
                    Picker("Buffer", selection: $draftPlan[index].bufferTimeMinutes) {
                        ForEach([15, 30, 60, 90], id: \.self) { minutes in
                            Text("\(minutes) min").tag(minutes)
                        }
                    }
                    .labelsHidden()
                    .pickerStyle(.menu)
                    .tint(.careInk)
                    .frame(maxWidth: .infinity, minHeight: 44)
                    .background(Color.careCreamDeep)
                    .clipShape(RoundedRectangle(cornerRadius: 9, style: .continuous))
                }
                .frame(width: 110)
            }

            Toggle("Needs extra caregiver attention", isOn: $draftPlan[index].highRisk)
                .font(.caption.weight(.semibold))
                .foregroundStyle(Color.careInkSoft)
                .tint(.careCoral)
        }
        .padding(15)
        .careCard()
    }

    private var safetyNote: some View {
        Label(
            "Smart Pillbox stores reminder times and caregiver attention settings. Medication and dosage decisions should still come from a healthcare professional.",
            systemImage: "shield.checkered"
        )
        .font(.caption)
        .foregroundStyle(Color.careInkSoft)
        .fixedSize(horizontal: false, vertical: true)
        .padding(14)
        .background(Color.careCreamDeep)
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }

    private var saveBar: some View {
        VStack(spacing: 8) {
            if !hasMedication {
                Text("Add at least one medication before finishing setup.")
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(Color.careCoralInk)
            }

            Button {
                saveSetup()
            } label: {
                HStack(spacing: 8) {
                    if isSaving {
                        ProgressView()
                            .tint(.careOnAction)
                    } else {
                        Image(systemName: "checkmark")
                    }
                    Text(isSaving ? "Saving setup…" : "Save pillbox setup")
                }
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Color.careOnAction)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 13)
                .background(Color.careAction)
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            }
            .buttonStyle(.plain)
            .disabled(!canSave || isSaving)
            .opacity(!canSave || isSaving ? 0.45 : 1)
        }
        .padding(.horizontal, 16)
        .padding(.top, 10)
        .padding(.bottom, 8)
        .background(.ultraThinMaterial)
    }

    private func setupSectionTitle(
        title: String,
        subtitle: String,
        symbol: String
    ) -> some View {
        HStack(alignment: .top, spacing: 11) {
            Image(systemName: symbol)
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(Color.careCoralInk)
                .frame(width: 36, height: 36)
                .background(Color.careCoralSoft)
                .clipShape(Circle())
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.headline)
                    .foregroundStyle(Color.careInk)
                Text(subtitle)
                    .font(.caption)
                    .foregroundStyle(Color.careInkSoft)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    private func setupField(
        title: String,
        placeholder: String,
        text: Binding<String>,
        keyboard: UIKeyboardType = .default
    ) -> some View {
        VStack(alignment: .leading, spacing: 7) {
            Text(title)
                .font(.caption.weight(.semibold))
                .foregroundStyle(Color.careInkSoft)
            TextField(placeholder, text: text)
                .keyboardType(keyboard)
                .textInputAutocapitalization(.words)
                .autocorrectionDisabled()
                .font(.subheadline)
                .foregroundStyle(Color.careInk)
                .padding(.horizontal, 12)
                .frame(height: 44)
                .background(Color.careCreamDeep)
                .clipShape(RoundedRectangle(cornerRadius: 9, style: .continuous))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var activeMedicationCount: Int {
        draftPlan.filter {
            !$0.medication.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        }.count
    }

    private var hasMedication: Bool { activeMedicationCount > 0 }

    private var canSave: Bool {
        !fullName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && !deviceName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && hasMedication
    }

    private func saveSetup() {
        isSaving = true
        Task {
            let patient = await store.savePillboxSetup(
                existingPatientID: existingPatientID,
                fullName: fullName,
                relation: relation,
                age: Int(ageText) ?? 0,
                livingSituation: livingSituation,
                phone: phone,
                deviceName: deviceName,
                deviceID: deviceID,
                isDemoConnected: isDemoConnected,
                plan: draftPlan
            )
            isSaving = false
            if existingPatientID == nil {
                guidebookPatient = patient
            } else {
                onComplete(patient)
            }
        }
    }

    private static let emptyPlan: [MedicationSlot] = [
        MedicationSlot(slotId: 1, medication: "", scheduledTime: "08:00", highRisk: false, bufferTimeMinutes: 30),
        MedicationSlot(slotId: 2, medication: "", scheduledTime: "12:00", highRisk: false, bufferTimeMinutes: 60),
        MedicationSlot(slotId: 3, medication: "", scheduledTime: "18:00", highRisk: false, bufferTimeMinutes: 60),
        MedicationSlot(slotId: 4, medication: "", scheduledTime: "20:00", highRisk: false, bufferTimeMinutes: 30),
    ]
}
