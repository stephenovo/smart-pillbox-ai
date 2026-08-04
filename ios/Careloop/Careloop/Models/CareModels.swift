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

    var hasConnectedPillbox: Bool { !deviceID.isEmpty }

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
            isDemoConnected: false
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
