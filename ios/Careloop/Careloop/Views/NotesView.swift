import SwiftUI

struct NotesView: View {
    @EnvironmentObject private var store: CareStore

    @State private var showingComposer = false
    @State private var showingConnectPillbox = false

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: 18) {
                    if store.appMode == .circleCare {
                        PatientCarousel {
                            showingConnectPillbox = true
                        }
                        .environmentObject(store)

                        aiInsightCard
                        medicationRiskSection
                        clinicNoteCard
                        careNotesSection
                    } else {
                        myCareInsightView
                    }
                }
                .padding(.top, 20)
                .padding(.bottom, 30)
            }
            .background(Color.careCream)
            .navigationTitle(store.appMode == .myCare ? "AI Insight" : "Insights")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(Color.careSurface, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbar {
                if store.appMode == .circleCare {
                    ToolbarItem(placement: .primaryAction) {
                        Button {
                            showingComposer = true
                        } label: {
                            Image(systemName: "square.and.pencil")
                        }
                        .accessibilityLabel("Add note")
                    }
                }
            }
            .refreshable {
                if store.appMode == .circleCare {
                    await store.loadInsightReport(force: true)
                } else {
                    await store.refresh()
                }
            }
            .task(id: store.appMode) {
                if store.appMode == .circleCare {
                    await store.loadInsightReport()
                }
            }
            .sheet(isPresented: $showingComposer) {
                NoteComposerView(initialPatientID: store.selectedPatientID)
                    .environmentObject(store)
                    .presentationDetents([.medium, .large])
            }
            .fullScreenCover(isPresented: $showingConnectPillbox) {
                ConnectPillboxView()
            }
        }
    }

    private var myCareInsightView: some View {
        VStack(spacing: 18) {
            VStack(alignment: .leading, spacing: 6) {
                Text("A simple check-in")
                    .font(.title2.weight(.bold))
                    .foregroundStyle(Color.careInk)
                Text("One clear thought based on your pillbox activity today.")
                    .font(.body)
                    .foregroundStyle(Color.careInkSoft)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            VStack(alignment: .leading, spacing: 18) {
                Image(systemName: "sparkles")
                    .font(.system(size: 26, weight: .semibold))
                    .foregroundStyle(Color.careCoralInk)
                    .frame(width: 54, height: 54)
                    .background(Color.careSurface)
                    .clipShape(Circle())

                Text(myCareInsight)
                    .font(.title2.weight(.semibold))
                    .foregroundStyle(Color.careInk)
                    .lineSpacing(7)
                    .fixedSize(horizontal: false, vertical: true)

                Label("Based on today's pillbox activity", systemImage: "lock.shield.fill")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Color.careMintInk)

                Button {
                    Task { await store.refresh() }
                } label: {
                    HStack {
                        Label("Refresh check-in", systemImage: "arrow.clockwise")
                        Spacer()
                        if store.isRefreshing {
                            ProgressView()
                                .tint(.careOnAction)
                        }
                    }
                    .font(.headline)
                    .foregroundStyle(Color.careOnAction)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .padding(.horizontal, 16)
                    .background(Color.careAction)
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                }
                .buttonStyle(.plain)
                .disabled(store.isRefreshing)
            }
            .padding(22)
            .background(Color.careMintSoft)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(Color.careMint.opacity(0.24), lineWidth: 1)
            }

            HStack(alignment: .top, spacing: 14) {
                Image(systemName: "cross.case.fill")
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundStyle(Color.careSkyInk)
                    .frame(width: 40, height: 40)
                Text("This check-in helps you notice your routine. Keep following the medicine instructions from your clinician.")
                    .font(.body)
                    .foregroundStyle(Color.careInkSoft)
                    .lineSpacing(4)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(18)
            .careCard()
        }
        .padding(.horizontal, 16)
    }

    private var myCareInsight: String {
        if let status = store.doseStatuses.first(where: { $0.kind == .openedTwice }) {
            return "The \(status.slot.medication) compartment opened twice. Before taking another dose, check your instructions or ask someone you trust."
        }
        if store.doseStatuses.contains(where: { $0.kind == .wrongCompartment }) {
            return "Your pillbox noticed a different compartment opening. Please check the medicine label before your next dose."
        }
        if let status = store.doseStatuses.first(where: { $0.kind == .missed }) {
            return "Your \(status.slot.medication) has not been recorded yet. Take a look at compartment \(status.slot.slotId) when you are ready."
        }
        if let status = store.doseStatuses.first(where: { $0.kind == .takenLate }) {
            return "Your \(status.slot.medication) was taken a little late. Linking it to breakfast, lunch or dinner may make the routine easier."
        }
        if store.takenCount > 0 {
            return "Your routine looks steady today. \(store.takenCount) dose\(store.takenCount == 1 ? " has" : "s have") been recorded."
        }
        return "Your medicine plan is ready. Your first update will appear after the pillbox records an opening."
    }

    private var aiInsightCard: some View {
        VStack(alignment: .leading, spacing: 15) {
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: "sparkles")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(Color.careCoralInk)
                    .frame(width: 40, height: 40)
                    .background(Color.careCoralSoft)
                    .clipShape(Circle())

                VStack(alignment: .leading, spacing: 3) {
                    Text("AI insight")
                        .font(.headline)
                        .foregroundStyle(Color.careInk)
                    Text("A warm, plain-language read of \(store.selectedPatient.firstName)'s recent pillbox pattern.")
                        .font(.caption)
                        .foregroundStyle(Color.careInkSoft)
                        .fixedSize(horizontal: false, vertical: true)
                }

                Spacer(minLength: 6)
            }

            if store.isGeneratingInsight {
                HStack(spacing: 11) {
                    ProgressView()
                        .tint(.careCoral)
                    Text("Writing a fresh insight…")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Color.careInkSoft)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(14)
                .background(Color.careCreamDeep)
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            } else if let generatedInsight = store.generatedInsight {
                VStack(alignment: .leading, spacing: 9) {
                    Text(generatedInsight)
                        .font(.subheadline)
                        .foregroundStyle(Color.careInk)
                        .lineSpacing(4)
                        .fixedSize(horizontal: false, vertical: true)

                    if let provider = store.generatedInsightProvider {
                        Label(provider, systemImage: "checkmark.seal.fill")
                            .font(.caption2.weight(.semibold))
                            .foregroundStyle(Color.careMintInk)
                    }
                }
                .padding(14)
                .background(Color.careCreamDeep)
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            } else {
                Text("Generate an up-to-date insight when you want a quick summary of what matters most. Smart Pillbox will not change medication instructions or give medical advice.")
                    .font(.subheadline)
                    .foregroundStyle(Color.careInkSoft)
                    .lineSpacing(3)
                    .fixedSize(horizontal: false, vertical: true)
            }

            if let message = store.insightErrorMessage {
                Label(message, systemImage: "exclamationmark.circle")
                    .font(.caption)
                    .foregroundStyle(Color.careCoralInk)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Button {
                Task { await store.generateInsight() }
            } label: {
                Label(
                    store.generatedInsight == nil ? "Generate AI insight" : "Generate again",
                    systemImage: "sparkles"
                )
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Color.careOnAction)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 13)
                .background(Color.careAction)
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            }
            .buttonStyle(.plain)
            .disabled(store.isGeneratingInsight || store.isLoadingInsightReport)
            .opacity(store.isGeneratingInsight || store.isLoadingInsightReport ? 0.55 : 1)
        }
        .padding(16)
        .careCard()
        .padding(.horizontal, 16)
    }

    private var medicationRiskSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            CareSectionHeader(
                title: "Medication risk",
                trailing: store.insightReport.map { "\($0.totalRecordsAnalysed) records" }
            )

            if store.isLoadingInsightReport && store.insightReport == nil {
                HStack(spacing: 11) {
                    ProgressView()
                        .tint(.careMint)
                    Text("Reading \(store.selectedPatient.firstName)'s recent routines…")
                        .font(.subheadline)
                        .foregroundStyle(Color.careInkSoft)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(16)
                .careCard()
            } else if let insights = store.insightReport?.medicationInsights,
                      !insights.isEmpty {
                ForEach(insights) { insight in
                    MedicationInsightCard(insight: insight)
                }
            } else if store.insightReport?.totalRecordsAnalysed == 0 {
                Text("No pillbox history yet. Insights will begin to appear after the first few routines are recorded.")
                    .font(.subheadline)
                    .foregroundStyle(Color.careInkSoft)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(16)
                    .careCard()
            } else {
                Text("Medication patterns will appear when Smart Pillbox can reach the insight service.")
                    .font(.subheadline)
                    .foregroundStyle(Color.careInkSoft)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(16)
                    .careCard()
            }
        }
        .padding(.horizontal, 16)
    }

    private var clinicNoteCard: some View {
        VStack(alignment: .leading, spacing: 13) {
            HStack(spacing: 11) {
                Image(systemName: "cross.case.fill")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(Color.careSkyInk)
                    .frame(width: 38, height: 38)
                    .background(Color.careSkySoft)
                    .clipShape(Circle())

                VStack(alignment: .leading, spacing: 2) {
                    Text("For the next clinic visit")
                        .font(.headline)
                        .foregroundStyle(Color.careInk)
                    Text("A concise note to bring into the conversation")
                        .font(.caption)
                        .foregroundStyle(Color.careInkSoft)
                }
            }

            Text(
                store.insightReport?.clinicVisitSummary
                    ?? "A clinic note will appear after \(store.selectedPatient.firstName)'s recent pillbox history is available."
            )
            .font(.subheadline)
            .foregroundStyle(Color.careInkSoft)
            .lineSpacing(4)
            .fixedSize(horizontal: false, vertical: true)
        }
        .padding(16)
        .careCard()
        .padding(.horizontal, 16)
    }

    private var careNotesSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Care notes")
                    .font(.headline)
                    .foregroundStyle(Color.careInk)
                Spacer()
                Button {
                    showingComposer = true
                } label: {
                    Label("Add note", systemImage: "plus")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(Color.careInk)
                }
                .buttonStyle(.plain)
            }

            if store.selectedPatientNotes.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "note.text")
                        .font(.system(size: 22, weight: .medium))
                        .foregroundStyle(Color.careSkyInk)
                    Text("No care notes yet")
                        .font(.subheadline.weight(.bold))
                        .foregroundStyle(Color.careInk)
                    Text("Add a note after a call, visit or family handoff.")
                        .font(.caption)
                        .foregroundStyle(Color.careInkSoft)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 24)
                .careCard()
            } else {
                ForEach(store.selectedPatientNotes) { note in
                    CareNoteCard(note: note, patientName: store.selectedPatient.firstName) {
                        store.deleteNote(id: note.id)
                    }
                }
            }
        }
        .padding(.horizontal, 16)
    }
}

private struct MedicationInsightCard: View {
    let insight: MedicationInsight

    var body: some View {
        VStack(alignment: .leading, spacing: 13) {
            HStack(spacing: 12) {
                VStack(spacing: 1) {
                    Text("\(insight.compartmentId)")
                        .font(.headline.weight(.bold))
                    Text("COMP")
                        .font(.system(size: 7, weight: .bold))
                }
                .foregroundStyle(insight.concernLevel.foreground)
                .frame(width: 46, height: 46)
                .background(insight.concernLevel.background)
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))

                VStack(alignment: .leading, spacing: 3) {
                    Text(insight.medicationName)
                        .font(.subheadline.weight(.bold))
                        .foregroundStyle(Color.careInk)
                        .lineLimit(1)
                    Text(insightSummary)
                        .font(.caption)
                        .foregroundStyle(Color.careInkSoft)
                        .lineLimit(2)
                }

                Spacer(minLength: 6)
                Text(insight.concernLevel.label)
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(insight.concernLevel.foreground)
                    .padding(.horizontal, 9)
                    .padding(.vertical, 6)
                    .background(insight.concernLevel.background)
                    .clipShape(Capsule())
            }

            HStack(spacing: 5) {
                ForEach(0..<10, id: \.self) { index in
                    Capsule()
                        .fill(
                            index < min(10, max(0, insight.concernScore))
                                ? insight.concernLevel.tint
                                : Color.careCreamDeep
                        )
                        .frame(height: 6)
                }
            }
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("\(insight.concernLevel.label) for \(insight.medicationName)")

            HStack(spacing: 5) {
                Image(systemName: insight.trendDirection.symbol)
                Text(insight.trendDirection.label)
                if insight.highRisk {
                    Text("· High attention medication")
                }
            }
            .font(.caption2.weight(.semibold))
            .foregroundStyle(Color.careInkFaint)
        }
        .padding(15)
        .careCard()
    }

    private var insightSummary: String {
        var details: [String] = []
        if insight.missedCount > 0 {
            details.append("\(insight.missedCount) missed")
        }
        if insight.delayedCount > 0 {
            details.append("\(insight.delayedCount) late")
        }
        if insight.duplicateOpeningCount > 0 {
            details.append("\(insight.duplicateOpeningCount) opened twice")
        }
        return details.isEmpty ? "Recent routine looks steady" : details.joined(separator: " · ")
    }
}

private struct CareNoteCard: View {
    let note: CareNote
    let patientName: String
    let onDelete: () -> Void

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: "note.text")
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(Color.careSkyInk)
                .frame(width: 38, height: 38)
                .background(Color.careSkySoft)
                .clipShape(Circle())

            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text("Note for \(patientName)")
                        .font(.subheadline.weight(.bold))
                        .foregroundStyle(Color.careInk)
                    Spacer()
                    Text(note.createdAt, format: .dateTime.month(.abbreviated).day().hour().minute())
                        .font(.caption2.weight(.medium))
                        .foregroundStyle(Color.careInkFaint)
                }

                Text(note.text)
                    .font(.subheadline)
                    .foregroundStyle(Color.careInkSoft)
                    .fixedSize(horizontal: false, vertical: true)

                Button(role: .destructive, action: onDelete) {
                    Label("Delete", systemImage: "trash")
                        .font(.caption2.weight(.semibold))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(15)
        .careCard()
    }
}

private extension CaregiverConcernLevel {
    var label: String {
        switch self {
        case .low: "Steady"
        case .medium: "Keep an eye on"
        case .high: "Needs attention"
        }
    }

    var tint: Color {
        switch self {
        case .low: .careMint
        case .medium: .careHoney
        case .high: .careCoral
        }
    }

    var foreground: Color {
        switch self {
        case .low: .careMintInk
        case .medium: .careHoneyInk
        case .high: .careCoralInk
        }
    }

    var background: Color {
        switch self {
        case .low: .careMintSoft
        case .medium: .careHoneySoft
        case .high: .careCoralSoft
        }
    }
}

private extension InsightTrendDirection {
    var label: String {
        switch self {
        case .improving: "Getting steadier"
        case .stable: "Holding steady"
        case .worsening: "Needs more support lately"
        case .insufficientData: "More history needed"
        }
    }

    var symbol: String {
        switch self {
        case .improving: "arrow.down.right"
        case .stable: "arrow.right"
        case .worsening: "arrow.up.right"
        case .insufficientData: "minus"
        }
    }
}
