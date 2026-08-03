import SwiftUI

extension Color {
    static let careCream = Color(red: 0.980, green: 0.969, blue: 0.949)
    static let careCreamDeep = Color(red: 0.957, green: 0.937, blue: 0.906)
    static let careInk = Color(red: 0.133, green: 0.125, blue: 0.110)
    static let careInkSoft = Color(red: 0.431, green: 0.404, blue: 0.361)
    static let careInkFaint = Color(red: 0.639, green: 0.612, blue: 0.565)
    static let careLine = Color(red: 0.925, green: 0.898, blue: 0.855)

    static let careCoral = Color(red: 1.000, green: 0.353, blue: 0.373)
    static let careCoralInk = Color(red: 0.690, green: 0.290, blue: 0.235)
    static let careCoralSoft = Color(red: 1.000, green: 0.941, blue: 0.933)

    static let careMint = Color(red: 0.000, green: 0.651, blue: 0.600)
    static let careMintInk = Color(red: 0.000, green: 0.408, blue: 0.373)
    static let careMintSoft = Color(red: 0.906, green: 0.965, blue: 0.949)

    static let careHoney = Color(red: 0.910, green: 0.631, blue: 0.239)
    static let careHoneyInk = Color(red: 0.541, green: 0.353, blue: 0.071)
    static let careHoneySoft = Color(red: 0.992, green: 0.953, blue: 0.886)

    static let careSkySoft = Color(red: 0.914, green: 0.953, blue: 0.984)
    static let careSkyInk = Color(red: 0.184, green: 0.384, blue: 0.569)
}

struct CareCardModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(Color.white)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(Color.careLine, lineWidth: 1)
            }
            .shadow(color: Color.careInk.opacity(0.05), radius: 2, y: 1)
    }
}

extension View {
    func careCard() -> some View {
        modifier(CareCardModifier())
    }
}

extension PatientWellbeing {
    var tint: Color {
        switch self {
        case .attention: .careCoral
        case .watch: .careHoney
        case .good: .careMint
        }
    }

    var foreground: Color {
        switch self {
        case .attention: .careCoralInk
        case .watch: .careHoneyInk
        case .good: .careMintInk
        }
    }

    var background: Color {
        switch self {
        case .attention: .careCoralSoft
        case .watch: .careHoneySoft
        case .good: .careMintSoft
        }
    }
}

extension DoseStatusKind {
    var tint: Color {
        switch self {
        case .takenOnTime: .careMint
        case .takenLate, .dueSoon: .careHoney
        case .openedTwice, .openedEarly, .wrongCompartment, .missed: .careCoral
        case .upcoming, .waitingForDevice: .careInkFaint
        }
    }

    var foreground: Color {
        switch self {
        case .takenOnTime: .careMintInk
        case .takenLate, .dueSoon: .careHoneyInk
        case .openedTwice, .openedEarly, .wrongCompartment, .missed: .careCoralInk
        case .upcoming, .waitingForDevice: .careInkSoft
        }
    }

    var background: Color {
        switch self {
        case .takenOnTime: .careMintSoft
        case .takenLate, .dueSoon: .careHoneySoft
        case .openedTwice, .openedEarly, .wrongCompartment, .missed: .careCoralSoft
        case .upcoming, .waitingForDevice: .careCreamDeep
        }
    }

    var symbol: String {
        switch self {
        case .takenOnTime: "checkmark"
        case .takenLate, .dueSoon: "clock"
        case .openedTwice: "exclamationmark.2"
        case .openedEarly, .wrongCompartment, .missed: "exclamationmark"
        case .upcoming: "calendar"
        case .waitingForDevice: "wifi.slash"
        }
    }
}
