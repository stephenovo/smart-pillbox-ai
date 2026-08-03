import SwiftUI
import UIKit

extension Color {
    private static func careAdaptive(
        light: (CGFloat, CGFloat, CGFloat),
        dark: (CGFloat, CGFloat, CGFloat)
    ) -> Color {
        Color(uiColor: UIColor { traits in
            let components = traits.userInterfaceStyle == .dark ? dark : light
            return UIColor(
                red: components.0,
                green: components.1,
                blue: components.2,
                alpha: 1
            )
        })
    }

    static let careCream = careAdaptive(
        light: (0.980, 0.969, 0.949),
        dark: (0.090, 0.098, 0.094)
    )
    static let careCreamDeep = careAdaptive(
        light: (0.957, 0.937, 0.906),
        dark: (0.125, 0.137, 0.129)
    )
    static let careSurface = careAdaptive(
        light: (1.000, 1.000, 1.000),
        dark: (0.145, 0.157, 0.149)
    )
    static let careInk = careAdaptive(
        light: (0.133, 0.125, 0.110),
        dark: (0.949, 0.937, 0.914)
    )
    static let careInkSoft = careAdaptive(
        light: (0.431, 0.404, 0.361),
        dark: (0.737, 0.714, 0.671)
    )
    static let careInkFaint = careAdaptive(
        light: (0.639, 0.612, 0.565),
        dark: (0.557, 0.533, 0.494)
    )
    static let careLine = careAdaptive(
        light: (0.925, 0.898, 0.855),
        dark: (0.235, 0.251, 0.235)
    )

    static let careCoral = careAdaptive(
        light: (1.000, 0.353, 0.373),
        dark: (1.000, 0.467, 0.486)
    )
    static let careCoralInk = careAdaptive(
        light: (0.690, 0.290, 0.235),
        dark: (1.000, 0.635, 0.592)
    )
    static let careCoralSoft = careAdaptive(
        light: (1.000, 0.941, 0.933),
        dark: (0.235, 0.137, 0.137)
    )

    static let careMint = careAdaptive(
        light: (0.000, 0.651, 0.600),
        dark: (0.282, 0.804, 0.725)
    )
    static let careMintInk = careAdaptive(
        light: (0.000, 0.408, 0.373),
        dark: (0.475, 0.875, 0.816)
    )
    static let careMintSoft = careAdaptive(
        light: (0.906, 0.965, 0.949),
        dark: (0.118, 0.216, 0.196)
    )

    static let careHoney = careAdaptive(
        light: (0.910, 0.631, 0.239),
        dark: (0.945, 0.718, 0.365)
    )
    static let careHoneyInk = careAdaptive(
        light: (0.541, 0.353, 0.071),
        dark: (0.953, 0.780, 0.475)
    )
    static let careHoneySoft = careAdaptive(
        light: (0.992, 0.953, 0.886),
        dark: (0.224, 0.184, 0.118)
    )

    static let careSkySoft = careAdaptive(
        light: (0.914, 0.953, 0.984),
        dark: (0.118, 0.200, 0.267)
    )
    static let careSkyInk = careAdaptive(
        light: (0.184, 0.384, 0.569),
        dark: (0.545, 0.753, 0.902)
    )

    static let careAction = careAdaptive(
        light: (0.133, 0.125, 0.110),
        dark: (0.949, 0.937, 0.914)
    )
    static let careOnAction = careAdaptive(
        light: (1.000, 1.000, 1.000),
        dark: (0.090, 0.098, 0.094)
    )
}

struct CareCardModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(Color.careSurface)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(Color.careLine, lineWidth: 1)
            }
            .shadow(color: Color.black.opacity(0.08), radius: 2, y: 1)
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
