import Combine
import Foundation

@MainActor
final class CareStore: ObservableObject {
    private enum DefaultsKey {
        static let serverURL = "careloop.serverURL"
        static let deviceID = "careloop.deviceID"
        static let notes = "careloop.notes"
        static let patients = "smartpillbox.patients.v2"
        static let medicationPlans = "smartpillbox.medicationPlans.v2"
    }

    static let defaultServerURL = "http://127.0.0.1:3100"
    static let defaultDeviceID = "PILLBOX-DEMO-001"

    @Published var selectedPatientID = "margaret"
    @Published private(set) var events: [HardwareEvent] = []
    @Published private(set) var patients: [CarePatient] = CarePatient.careCircle
    @Published private(set) var medicationPlans: [String: [MedicationSlot]] = [:]
    @Published private(set) var deviceState: HardwareDeviceState?
    @Published private(set) var notes: [CareNote] = []
    @Published private(set) var reviewedPatientIDs: Set<String> = []
    @Published private(set) var isRefreshing = false
    @Published private(set) var hasLoadedLiveData = false
    @Published private(set) var connectionMessage: String?
    @Published private(set) var lastUpdated: Date?
    @Published private(set) var insightReport: CaregiverInsightReport?
    @Published private(set) var generatedInsight: String?
    @Published private(set) var generatedInsightProvider: String?
    @Published private(set) var insightErrorMessage: String?
    @Published private(set) var isLoadingInsightReport = false
    @Published private(set) var isGeneratingInsight = false
    @Published var serverURL: String
    @Published var deviceID: String

    var selectedPatient: CarePatient {
        patients.first(where: { $0.id == selectedPatientID })
            ?? patients.first
            ?? CarePatient.careCircle[0]
    }

    var medicationPlan: [MedicationSlot] {
        setupPlan(for: selectedPatientID).filter {
            !$0.medication.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        }
    }

    var selectedPatientIsReviewed: Bool {
        reviewedPatientIDs.contains(selectedPatientID)
    }

    var selectedPatientNotes: [CareNote] {
        notes.filter { $0.patientID == selectedPatientID }
    }

    var doseStatuses: [DoseStatus] {
        statuses(for: selectedPatient)
    }

    var takenCount: Int {
        doseStatuses.filter { $0.kind.countsAsTaken }.count
    }

    var attentionStatuses: [DoseStatus] {
        doseStatuses.filter { $0.kind.isAttention }
    }

    var liveWellbeing: PatientWellbeing {
        if !hasLoadedLiveData { return .watch }
        if !attentionStatuses.isEmpty { return .attention }
        if doseStatuses.contains(where: { $0.kind == .takenLate || $0.kind == .dueSoon }) {
            return .watch
        }
        return .good
    }

    var selectedWellbeing: PatientWellbeing {
        wellbeing(for: selectedPatient)
    }

    var isDeviceSynced: Bool {
        selectedPatient.isDemoConnected
            || deviceState?.connectionStatus == "connected"
    }

    init(defaults: UserDefaults = .standard) {
        serverURL = defaults.string(forKey: DefaultsKey.serverURL) ?? Self.defaultServerURL
        deviceID = defaults.string(forKey: DefaultsKey.deviceID) ?? Self.defaultDeviceID

        let restoredSavedPatients: Bool
        if let data = defaults.data(forKey: DefaultsKey.patients),
           let savedPatients = try? JSONDecoder().decode([CarePatient].self, from: data),
           !savedPatients.isEmpty {
            patients = savedPatients
            restoredSavedPatients = true
        } else {
            restoredSavedPatients = false
        }

        if let data = defaults.data(forKey: DefaultsKey.medicationPlans),
           let savedPlans = try? JSONDecoder().decode(
               [String: [MedicationSlot]].self,
               from: data
           ) {
            medicationPlans = savedPlans
        } else {
            medicationPlans = ["margaret": Self.fallbackPlan]
        }

        if !restoredSavedPatients,
           let margaretIndex = patients.firstIndex(where: { $0.id == "margaret" }),
           patients[margaretIndex].deviceID != deviceID {
            let margaret = patients[margaretIndex]
            patients[margaretIndex] = Self.patient(
                from: margaret,
                deviceID: deviceID
            )
        }

        if let data = defaults.data(forKey: DefaultsKey.notes),
           let savedNotes = try? JSONDecoder().decode([CareNote].self, from: data) {
            notes = savedNotes.sorted { $0.createdAt > $1.createdAt }
        }

        deviceID = patients.first(where: { $0.id == selectedPatientID })?.deviceID
            ?? patients.first?.deviceID
            ?? deviceID
    }

    func wellbeing(for patient: CarePatient) -> PatientWellbeing {
        patient.id == selectedPatientID ? liveWellbeing : patient.wellbeing
    }

    func setupPlan(for patientID: String) -> [MedicationSlot] {
        let stored = medicationPlans[patientID] ?? []
        let highestCompartment = max(stored.map(\.slotId).max() ?? 0, 4)

        return (1...highestCompartment).map { compartment in
            stored.first(where: { $0.slotId == compartment })
                ?? MedicationSlot(
                    slotId: compartment,
                    medication: "",
                    scheduledTime: Self.defaultTime(for: compartment),
                    highRisk: false,
                    bufferTimeMinutes: 60
                )
        }
    }

    func patient(linkedTo deviceID: String) -> CarePatient? {
        patients.first { $0.deviceID == deviceID }
    }

    func selectPatient(_ patient: CarePatient) {
        guard patient.id != selectedPatientID else { return }
        selectedPatientID = patient.id
        deviceID = patient.deviceID
        resetSelectedDeviceState()

        Task {
            while isRefreshing && selectedPatientID == patient.id {
                try? await Task.sleep(nanoseconds: 50_000_000)
            }
            guard selectedPatientID == patient.id else { return }
            await refresh()
            await loadInsightReport()
        }
    }

    @discardableResult
    func savePillboxSetup(
        existingPatientID: String?,
        fullName: String,
        relation: String,
        age: Int,
        livingSituation: String,
        phone: String,
        deviceName: String,
        deviceID: String,
        isDemoConnected: Bool,
        plan: [MedicationSlot]
    ) async -> CarePatient {
        let cleanName = fullName.trimmingCharacters(in: .whitespacesAndNewlines)
        let existingPatient = existingPatientID.flatMap { patientID in
            patients.first(where: { $0.id == patientID })
        }
        let patientID = existingPatient?.id ?? "care-\(UUID().uuidString.prefix(8).lowercased())"
        let activeMedicationCount = plan.filter {
            !$0.medication.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        }.count
        let newPatient = CarePatient(
            id: patientID,
            name: cleanName,
            firstName: Self.firstName(from: cleanName),
            initials: Self.initials(from: cleanName),
            age: max(0, age),
            city: existingPatient?.city ?? "Hong Kong",
            relation: relation.trimmingCharacters(in: .whitespacesAndNewlines),
            livingSituation: livingSituation.trimmingCharacters(in: .whitespacesAndNewlines),
            phone: phone.trimmingCharacters(in: .whitespacesAndNewlines),
            wellbeing: existingPatient?.wellbeing ?? .watch,
            wellbeingNote: existingPatient?.wellbeingNote ?? "The new pillbox is ready for its first routine.",
            snapshot: PatientSnapshot(
                dosesTaken: existingPatient?.snapshot.dosesTaken ?? 0,
                dosesTotal: activeMedicationCount,
                lastEventLabel: existingPatient?.snapshot.lastEventLabel ?? "Pillbox setup completed",
                lastEventTime: existingPatient?.snapshot.lastEventTime ?? "Just now"
            ),
            deviceName: deviceName.trimmingCharacters(in: .whitespacesAndNewlines),
            batteryPercent: existingPatient?.batteryPercent ?? 100,
            weeklyRhythm: existingPatient?.weeklyRhythm ?? [0, 0, 0, 0, 0, 0, 0],
            deviceID: deviceID,
            isDemoConnected: isDemoConnected || existingPatient?.isDemoConnected == true
        )

        if let index = patients.firstIndex(where: { $0.id == patientID }) {
            patients[index] = newPatient
        } else {
            patients.append(newPatient)
        }
        medicationPlans[patientID] = plan
        selectedPatientID = patientID
        self.deviceID = deviceID
        persistCareProfiles()
        resetSelectedDeviceState()

        do {
            let client = try CareAPIClient(serverURL: serverURL, deviceID: deviceID)
            let savedPlan = try await client.updateMedicationPlan(plan)
            medicationPlans[patientID] = savedPlan
            connectionMessage = nil
            persistCareProfiles()
            await refresh()
        } catch {
            connectionMessage = "Saved on this iPhone. Smart Pillbox will sync the plan when the server is available."
        }

        return newPatient
    }

    func toggleSelectedPatientReviewed() {
        if reviewedPatientIDs.contains(selectedPatientID) {
            reviewedPatientIDs.remove(selectedPatientID)
        } else {
            reviewedPatientIDs.insert(selectedPatientID)
        }
    }

    func addNote(text: String, patientID: String) {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }

        notes.insert(
            CareNote(id: UUID(), patientID: patientID, text: trimmed, createdAt: .now),
            at: 0
        )
        persistNotes()
    }

    func deleteNotes(at offsets: IndexSet) {
        for index in offsets.sorted(by: >) {
            notes.remove(at: index)
        }
        persistNotes()
    }

    func deleteNote(id: UUID) {
        notes.removeAll { $0.id == id }
        persistNotes()
    }

    func loadInsightReport(force: Bool = false) async {
        guard !isLoadingInsightReport else { return }
        let patient = selectedPatient
        guard force || insightReport?.patientId != patient.id else { return }

        isLoadingInsightReport = true
        insightErrorMessage = nil
        defer { isLoadingInsightReport = false }

        do {
            let client = try CareAPIClient(
                serverURL: serverURL,
                deviceID: patient.deviceID
            )
            let report = try await client.fetchInsightReport(patientID: patient.id)
            guard selectedPatientID == patient.id else { return }
            insightReport = report
        } catch {
            guard selectedPatientID == patient.id else { return }
            insightErrorMessage = error.localizedDescription
        }
    }

    func generateInsight() async {
        guard !isGeneratingInsight else { return }
        if insightReport == nil {
            await loadInsightReport()
        }
        guard let insightReport else { return }
        let patient = selectedPatient

        isGeneratingInsight = true
        insightErrorMessage = nil
        defer { isGeneratingInsight = false }

        do {
            let client = try CareAPIClient(
                serverURL: serverURL,
                deviceID: patient.deviceID
            )
            let response = try await client.generateInsight(
                report: insightReport,
                patientName: patient.firstName
            )
            guard selectedPatientID == patient.id else { return }
            generatedInsight = response.aiSummary
            if let model = response.model, let provider = response.provider {
                generatedInsightProvider = "\(provider.capitalized) · \(model)"
            } else {
                generatedInsightProvider = "DeepSeek"
            }
        } catch {
            insightErrorMessage = error.localizedDescription
        }
    }

    func applyConnectionSettings(serverURL: String, deviceID: String) async {
        let cleanURL = serverURL.trimmingCharacters(in: .whitespacesAndNewlines)
        let cleanDeviceID = deviceID.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanURL.isEmpty, !cleanDeviceID.isEmpty else {
            connectionMessage = "Enter both the server address and device ID."
            return
        }

        self.serverURL = cleanURL
        self.deviceID = cleanDeviceID
        UserDefaults.standard.set(cleanURL, forKey: DefaultsKey.serverURL)
        UserDefaults.standard.set(cleanDeviceID, forKey: DefaultsKey.deviceID)
        if let index = patients.firstIndex(where: { $0.id == selectedPatientID }) {
            patients[index] = Self.patient(
                from: patients[index],
                deviceID: cleanDeviceID
            )
            persistCareProfiles()
        }
        resetSelectedDeviceState()
        await refresh()
    }

    func refresh() async {
        guard !isRefreshing else { return }
        let patient = selectedPatient
        isRefreshing = true
        defer { isRefreshing = false }

        do {
            let client = try CareAPIClient(
                serverURL: serverURL,
                deviceID: patient.deviceID
            )
            async let incomingEvents = client.fetchEvents()
            async let incomingState = client.fetchDeviceState()
            async let incomingPlan = client.fetchMedicationPlan()

            let (newEvents, newState, newPlan) = try await (
                incomingEvents,
                incomingState,
                incomingPlan
            )

            guard selectedPatientID == patient.id else { return }

            events = newEvents.sorted { $0.eventTime > $1.eventTime }
            deviceState = newState
            if !newPlan.isEmpty {
                medicationPlans[patient.id] = newPlan
                persistCareProfiles()
            }
            hasLoadedLiveData = true
            connectionMessage = nil
            lastUpdated = .now
        } catch {
            guard selectedPatientID == patient.id else { return }
            deviceState = nil
            hasLoadedLiveData = false
            connectionMessage = error.localizedDescription
        }
    }

    func startPolling() async {
        await refresh()
        while !Task.isCancelled {
            try? await Task.sleep(nanoseconds: 10_000_000_000)
            guard !Task.isCancelled else { return }
            await refresh()
        }
    }

    func statuses(for patient: CarePatient, now: Date = .now) -> [DoseStatus] {
        let plan = setupPlan(for: patient.id).filter {
            !$0.medication.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        }

        return plan.map { slot in
            guard hasLoadedLiveData else {
                return DoseStatus(
                    slot: slot,
                    kind: .waitingForDevice,
                    firstOpenTime: nil,
                    openingCount: 0,
                    delayMinutes: nil
                )
            }

            let dateKey = Self.dateKeyFormatter.string(from: now)
            let matchingEvents = events
                .filter {
                    $0.compartment == slot.slotId && $0.eventTime.hasPrefix(dateKey)
                }
                .sorted { $0.eventTime < $1.eventTime }

            if let firstEvent = matchingEvents.first {
                let delayMinutes = Self.delayMinutes(
                    eventTime: firstEvent.eventTime,
                    scheduleTime: slot.scheduledTime,
                    dateKey: dateKey
                )
                let kind: DoseStatusKind
                if matchingEvents.contains(where: { $0.eventType == "wrong_slot_open" }) {
                    kind = .wrongCompartment
                } else if matchingEvents.count >= 2 {
                    kind = .openedTwice
                } else if let delayMinutes, delayMinutes < 0 {
                    kind = .openedEarly
                } else if let delayMinutes, delayMinutes <= 15 {
                    kind = .takenOnTime
                } else if let delayMinutes, delayMinutes <= slot.bufferTimeMinutes {
                    kind = .takenLate
                } else {
                    kind = .missed
                }

                return DoseStatus(
                    slot: slot,
                    kind: kind,
                    firstOpenTime: String(firstEvent.eventTime.suffix(5)),
                    openingCount: matchingEvents.count,
                    delayMinutes: delayMinutes
                )
            }

            let currentMinutes = Calendar.current.component(.hour, from: now) * 60
                + Calendar.current.component(.minute, from: now)
            let scheduledMinutes = Self.minutes(from: slot.scheduledTime)
            let kind: DoseStatusKind

            if currentMinutes > scheduledMinutes + slot.bufferTimeMinutes {
                kind = .missed
            } else if currentMinutes >= scheduledMinutes - 15 {
                kind = .dueSoon
            } else {
                kind = .upcoming
            }

            return DoseStatus(
                slot: slot,
                kind: kind,
                firstOpenTime: nil,
                openingCount: 0,
                delayMinutes: nil
            )
        }
    }

    private func persistCareProfiles() {
        if let patientData = try? JSONEncoder().encode(patients) {
            UserDefaults.standard.set(patientData, forKey: DefaultsKey.patients)
        }
        if let planData = try? JSONEncoder().encode(medicationPlans) {
            UserDefaults.standard.set(planData, forKey: DefaultsKey.medicationPlans)
        }
    }

    private func resetSelectedDeviceState() {
        events = []
        deviceState = nil
        hasLoadedLiveData = false
        connectionMessage = nil
        insightReport = nil
        generatedInsight = nil
        generatedInsightProvider = nil
        insightErrorMessage = nil
    }

    private func persistNotes() {
        guard let data = try? JSONEncoder().encode(notes) else { return }
        UserDefaults.standard.set(data, forKey: DefaultsKey.notes)
    }

    private static func minutes(from time: String) -> Int {
        let components = time.split(separator: ":").compactMap { Int($0) }
        guard components.count == 2 else { return 0 }
        return components[0] * 60 + components[1]
    }

    private static func firstName(from fullName: String) -> String {
        fullName.split(whereSeparator: \.isWhitespace).first.map(String.init)
            ?? fullName
    }

    private static func initials(from fullName: String) -> String {
        let words = fullName.split(whereSeparator: \.isWhitespace)
        if words.count >= 2 {
            return words.prefix(2).compactMap(\.first).map(String.init).joined().uppercased()
        }
        return String(fullName.prefix(2)).uppercased()
    }

    private static func defaultTime(for compartment: Int) -> String {
        switch compartment {
        case 1: "08:00"
        case 2: "12:00"
        case 3: "18:00"
        default: "20:00"
        }
    }

    private static func patient(
        from patient: CarePatient,
        deviceID: String
    ) -> CarePatient {
        CarePatient(
            id: patient.id,
            name: patient.name,
            firstName: patient.firstName,
            initials: patient.initials,
            age: patient.age,
            city: patient.city,
            relation: patient.relation,
            livingSituation: patient.livingSituation,
            phone: patient.phone,
            wellbeing: patient.wellbeing,
            wellbeingNote: patient.wellbeingNote,
            snapshot: patient.snapshot,
            deviceName: patient.deviceName,
            batteryPercent: patient.batteryPercent,
            weeklyRhythm: patient.weeklyRhythm,
            deviceID: deviceID,
            isDemoConnected: patient.isDemoConnected
        )
    }

    private static func delayMinutes(
        eventTime: String,
        scheduleTime: String,
        dateKey: String
    ) -> Int? {
        guard let eventDate = eventDateFormatter.date(from: eventTime),
              let scheduleDate = eventDateFormatter.date(from: "\(dateKey) \(scheduleTime)") else {
            return nil
        }
        return Int(eventDate.timeIntervalSince(scheduleDate) / 60)
    }

    private static let dateKeyFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()

    private static let eventDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd HH:mm"
        return formatter
    }()

    private static let fallbackPlan: [MedicationSlot] = [
        MedicationSlot(slotId: 1, medication: "Blood Pressure Pill", scheduledTime: "08:00", highRisk: true, bufferTimeMinutes: 30),
        MedicationSlot(slotId: 2, medication: "Diabetes Pill", scheduledTime: "08:00", highRisk: false, bufferTimeMinutes: 60),
        MedicationSlot(slotId: 3, medication: "Vitamin D", scheduledTime: "13:00", highRisk: false, bufferTimeMinutes: 60),
        MedicationSlot(slotId: 4, medication: "Heart Medicine", scheduledTime: "20:00", highRisk: true, bufferTimeMinutes: 30),
    ]
}
