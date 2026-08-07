import Foundation

enum CareExperienceMode: String, CaseIterable, Codable, Identifiable {
    case circleCare = "circle-care"
    case myCare = "my-care"

    var id: String { rawValue }

    var label: String {
        switch self {
        case .circleCare: "Circle Care"
        case .myCare: "My Care"
        }
    }

    var shortDescription: String {
        switch self {
        case .circleCare: "Care for family"
        case .myCare: "Care for myself"
        }
    }

    var description: String {
        switch self {
        case .circleCare:
            "A complete view for family members and caregivers looking after others."
        case .myCare:
            "A calmer, larger and simpler view for managing your own medicines."
        }
    }

    var symbol: String {
        switch self {
        case .circleCare: "person.2.fill"
        case .myCare: "person.fill"
        }
    }
}

struct CaregiverProfile: Codable, Hashable {
    let id: String
    let fullName: String
    let email: String
    let phone: String
    let role: String
    let updatedAt: String

    var firstName: String {
        fullName.split(whereSeparator: \.isWhitespace).first.map(String.init)
            ?? fullName
    }

    var initials: String {
        let words = fullName.split(whereSeparator: \.isWhitespace)
        if words.count >= 2 {
            return words.prefix(2).compactMap(\.first).map(String.init).joined().uppercased()
        }
        return String(fullName.prefix(2)).uppercased()
    }

    static let defaultProfile = CaregiverProfile(
        id: "primary-caregiver",
        fullName: "Sarah Chen",
        email: "sarah.chen@example.com",
        phone: "+852 5555 0108",
        role: "Family caregiver",
        updatedAt: "2026-01-01T00:00:00.000Z"
    )
}

enum PatientWellbeing: String, Codable, CaseIterable {
    case attention
    case watch
    case good

    var label: String {
        switch self {
        case .attention: "Needs a check-in"
        case .watch: "Keep an eye on"
        case .good: "Doing well"
        }
    }
}

struct PatientSnapshot: Codable, Hashable {
    let dosesTaken: Int
    let dosesTotal: Int
    let lastEventLabel: String
    let lastEventTime: String
}

struct CareAvatarPreset: Identifiable, Hashable {
    let id: String
    let assetName: String

    static let all: [CareAvatarPreset] = [
        CareAvatarPreset(id: "family-morning", assetName: "avatar_family_senior_east_asian_woman"),
        CareAvatarPreset(id: "family-garden", assetName: "avatar_family_senior_black_woman"),
        CareAvatarPreset(id: "family-sunrise", assetName: "avatar_family_senior_south_asian_man"),
        CareAvatarPreset(id: "family-sky", assetName: "avatar_family_senior_east_asian_man"),
        CareAvatarPreset(id: "family-lavender", assetName: "avatar_family_senior_white_woman"),
        CareAvatarPreset(id: "family-mint", assetName: "avatar_family_senior_middle_eastern_woman"),
        CareAvatarPreset(id: "family-coral", assetName: "avatar_family_adult_east_asian_woman"),
        CareAvatarPreset(id: "family-sage", assetName: "avatar_family_adult_black_man"),
        CareAvatarPreset(id: "family-heather", assetName: "avatar_family_adult_south_asian_woman"),
        CareAvatarPreset(id: "family-blue", assetName: "avatar_family_adult_latino_man"),
        CareAvatarPreset(id: "family-gold", assetName: "avatar_family_child_east_asian_girl"),
        CareAvatarPreset(id: "family-teal", assetName: "avatar_family_child_black_boy"),
    ]

    private static let legacyAliases: [String: String] = [
        "lorelei-ari": "family-sky",
        "lorelei-eli": "family-coral",
        "lorelei-luna": "family-sunrise",
        "lorelei-noa": "family-gold",
        "lorelei-river": "family-morning",
        "notionists-iman": "family-mint",
        "notionists-kai": "family-sage",
        "notionists-leo": "family-blue",
        "notionists-mei": "family-heather",
        "notionists-sam": "family-garden",
        "peeps-june": "family-lavender",
        "peeps-nana": "family-morning",
        "peeps-remy": "family-sunrise",
        "peeps-theo": "family-teal",
        "peeps-zuri": "family-gold",
    ]

    static func preset(for id: String?) -> CareAvatarPreset? {
        let resolvedID = id.flatMap { legacyAliases[$0] } ?? id
        return all.first(where: { $0.id == resolvedID })
    }

    static func defaultID(for patientID: String) -> String {
        let seed = patientID.unicodeScalars.reduce(0) { partialResult, scalar in
            partialResult &+ Int(scalar.value)
        }
        return all[abs(seed) % all.count].id
    }
}

struct CarePatient: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let firstName: String
    let initials: String
    let age: Int
    let city: String
    let relation: String
    let livingSituation: String
    let phone: String
    let wellbeing: PatientWellbeing
    let wellbeingNote: String
    let snapshot: PatientSnapshot
    let deviceName: String
    let batteryPercent: Int
    let weeklyRhythm: [Int]
    let deviceID: String
    let isDemoConnected: Bool
    let avatarPresetID: String?
    let customAvatarData: Data?

    var hasConnectedPillbox: Bool { !deviceID.isEmpty }
    var resolvedAvatarPresetID: String {
        avatarPresetID ?? CareAvatarPreset.defaultID(for: id)
    }

    static let careCircle: [CarePatient] = [
        CarePatient(
            id: "margaret",
            name: "Margaret Lin",
            firstName: "Margaret",
            initials: "ML",
            age: 79,
            city: "Hong Kong",
            relation: "Mum",
            livingSituation: "Lives independently",
            phone: "+85255550118",
            wellbeing: .attention,
            wellbeingNote: "Evening heart medication may need a check-in.",
            snapshot: PatientSnapshot(
                dosesTaken: 0,
                dosesTotal: 4,
                lastEventLabel: "Waiting for the pillbox",
                lastEventTime: "--:--"
            ),
            deviceName: "Kitchen pillbox",
            batteryPercent: 82,
            weeklyRhythm: [100, 100, 75, 100, 50, 75, 50],
            deviceID: "PILLBOX-DEMO-001",
            isDemoConnected: false,
            avatarPresetID: "family-morning",
            customAvatarData: nil
        ),
    ]
}

struct HardwareEvent: Codable, Identifiable, Hashable {
    let id: String
    let eventTime: String
    let receivedAt: String
    let compartment: Int
    let medication: String
    let eventType: String
    let source: String
    let deviceId: String
    let activeSlotAtEvent: Int?
}

struct HardwareEventsResponse: Codable {
    let deviceId: String
    let events: [HardwareEvent]
    let count: Int
    let serverTime: String
}

struct HardwareDeviceState: Codable {
    let deviceId: String
    let status: String
    let activeSlot: Int?
    let scheduledAt: String?
    let message: String
    let trigger: String?
    let updatedAt: String
    let lastSeenAt: String?
    let lastEventAt: String?
    let connectionStatus: String
    let serverTime: String
}

struct MedicationSlot: Codable, Identifiable, Hashable {
    let slotId: Int
    var medication: String
    var scheduledTime: String
    var highRisk: Bool
    var bufferTimeMinutes: Int

    var id: Int { slotId }
}

struct HardwarePlanResponse: Codable {
    let deviceId: String
    let slots: [MedicationSlot]
    let serverTime: String
}

enum DoseStatusKind: String, Codable {
    case takenOnTime
    case takenLate
    case openedTwice
    case openedEarly
    case wrongCompartment
    case missed
    case dueSoon
    case upcoming
    case waitingForDevice

    var label: String {
        switch self {
        case .takenOnTime: "Taken on time"
        case .takenLate: "Taken late"
        case .openedTwice: "Opened twice"
        case .openedEarly: "Opened early"
        case .wrongCompartment: "Check compartment"
        case .missed: "Still unopened"
        case .dueSoon: "Due soon"
        case .upcoming: "Upcoming"
        case .waitingForDevice: "Waiting for device"
        }
    }

    var isAttention: Bool {
        self == .openedTwice || self == .openedEarly || self == .wrongCompartment || self == .missed
    }

    var countsAsTaken: Bool {
        self == .takenOnTime || self == .takenLate || self == .openedTwice || self == .openedEarly
    }
}

struct DoseStatus: Identifiable, Hashable {
    let slot: MedicationSlot
    let kind: DoseStatusKind
    let firstOpenTime: String?
    let openingCount: Int
    let delayMinutes: Int?

    var id: Int { slot.id }

    var detail: String {
        switch kind {
        case .takenOnTime:
            return firstOpenTime.map { "Opened at \($0)." } ?? "Opened on schedule."
        case .takenLate:
            return delayMinutes.map { "Opened \($0) min after the reminder." } ?? "Opened later than planned."
        case .openedTwice:
            return "The compartment was opened \(openingCount) times. Please check before the next dose."
        case .openedEarly:
            return firstOpenTime.map { "Opened early at \($0)." } ?? "Opened before the reminder."
        case .wrongCompartment:
            return "This compartment opened during another reminder. Please check the pillbox."
        case .missed:
            return "Due at \(slot.scheduledTime) and still unopened."
        case .dueSoon:
            return "The reminder window is active or coming up."
        case .upcoming:
            return "Nothing needed yet."
        case .waitingForDevice:
            return "Smart Pillbox has not received today's pillbox history yet."
        }
    }
}

struct CareNote: Codable, Identifiable, Hashable {
    let id: UUID
    let patientID: String
    let text: String
    let createdAt: Date
}

enum CaregiverConcernLevel: String, Codable, Hashable {
    case low
    case medium
    case high
}

enum InsightTrendDirection: String, Codable, Hashable {
    case improving
    case stable
    case worsening
    case insufficientData = "insufficient_data"
}

struct MedicationInsight: Codable, Identifiable, Hashable {
    let compartmentId: Int
    let medicationName: String
    let highRisk: Bool
    let totalRecords: Int
    let takenOnTimeCount: Int
    let delayedCount: Int
    let missedCount: Int
    let duplicateOpeningCount: Int
    let longTermMedianDelayMinutes: Double?
    let recentMedianDelayMinutes: Double?
    let trendDirection: InsightTrendDirection
    let concernLevel: CaregiverConcernLevel
    let concernScore: Int
    let insight: String

    var id: Int { compartmentId }
}

struct CaregiverInsightReport: Codable, Hashable {
    let patientId: String
    let generatedAt: String
    let totalRecordsAnalysed: Int
    let totalMissedCount: Int
    let totalDelayedCount: Int
    let totalDuplicateOpeningCount: Int
    let highRiskConcernCount: Int
    let overallConcernLevel: CaregiverConcernLevel
    let mostConcerningMedication: MedicationInsight?
    let medicationInsights: [MedicationInsight]
    let caregiverSummary: String
    let clinicVisitSummary: String
}

struct CaregiverInsightReportResponse: Codable {
    let report: CaregiverInsightReport
}

struct GeneratedCaregiverInsightResponse: Codable {
    let aiSummary: String
    let model: String?
    let provider: String?
    let section: String?
    let report: CaregiverInsightReport?
}
