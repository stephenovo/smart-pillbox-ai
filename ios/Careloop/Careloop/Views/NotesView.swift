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
            .navigationTitle(store.appMode == .myCare ? "AI Check-in" : "Caregiver AI")
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
                        .accessibilityLabel("Add care journal entry")
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
                    if store.generatedInsight == nil,
                       store.insightReport != nil {
                        await store.generateInsight()
                    }
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
                    Text("AI insights")
                        .font(.headline)
                        .foregroundStyle(Color.careInk)
                    Text("Observations from \(store.selectedPatient.firstName)'s pillbox openings, timing and medication routine patterns.")
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
                    Text("ACTIVITY OBSERVATION")
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(Color.careCoralInk)
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
                VStack(alignment: .leading, spacing: 7) {
                    Text("ACTIVITY OBSERVATION")
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(Color.careCoralInk)
                    Text(aiInsightFallback)
                        .font(.subheadline)
                        .foregroundStyle(Color.careInk)
                        .lineSpacing(3)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .padding(14)
                .background(Color.careCreamDeep)
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            }

            HStack(alignment: .top, spacing: 11) {
                Image(systemName: "shield.checkered")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(Color.careMintInk)
                    .frame(width: 30, height: 30)
                    .background(Color.careMintSoft)
                    .clipShape(Circle())
                VStack(alignment: .leading, spacing: 3) {
                    Text("Observation, not medical advice")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(Color.careMintInk)
                    Text("AI describes recorded opening activity and timing. It cannot confirm that medicine was taken, diagnose a condition, or recommend dose or schedule changes.")
                        .font(.subheadline)
                        .foregroundStyle(Color.careInkSoft)
                        .fixedSize(horizontal: false, vertical: true)
                }
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
                    store.generatedInsight == nil ? "Generate AI insight" : "Refresh AI insight",
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
                title: "Medication activity patterns",
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
                    Text("Clinic handoff")
                        .font(.headline)
                        .foregroundStyle(Color.careInk)
                    Text("A concise summary to bring to the next appointment")
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
            VStack(alignment: .leading, spacing: 5) {
                HStack {
                    Text("Care journal")
                        .font(.headline)
                        .foregroundStyle(Color.careInk)
                    Spacer()
                    Button {
                        showingComposer = true
                    } label: {
                        Label("Add entry", systemImage: "plus")
                            .font(.caption.weight(.bold))
                            .foregroundStyle(Color.careInk)
                    }
                    .buttonStyle(.plain)
                }
                Text("Human context for your care circle — calls, visits and family handoffs. These entries do not change the medicine plan.")
                    .font(.caption)
                    .foregroundStyle(Color.careInkSoft)
                    .fixedSize(horizontal: false, vertical: true)
            }

            if store.selectedPatientNotes.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "note.text")
                        .font(.system(size: 22, weight: .medium))
                        .foregroundStyle(Color.careSkyInk)
                    Text("No journal entries yet")
                        .font(.subheadline.weight(.bold))
                        .foregroundStyle(Color.careInk)
                    Text("Add an entry after a call, visit or family handoff so the next caregiver has the full picture.")
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

    private var aiInsightFallback: String {
        if let status = store.attentionStatuses.first {
            return "\(status.slot.medication): \(activityObservation(for: status))"
        }
        if store.takenCount > 0 {
            return "\(store.selectedPatient.firstName)'s pillbox has recorded \(store.takenCount) scheduled compartment opening\(store.takenCount == 1 ? "" : "s") today, with no current exception pattern."
        }
        return "No pillbox opening activity has been received today. An AI observation will appear after the device reports activity."
    }

    private func activityObservation(for status: DoseStatus) -> String {
        switch status.kind {
        case .openedTwice:
            return "the compartment recorded \(status.openingCount) openings in the current schedule window."
        case .wrongCompartment:
            return "the compartment opened during a reminder assigned to a different compartment."
        case .missed:
            return "no opening was recorded by the end of the \(status.slot.scheduledTime) reminder window."
        case .openedEarly:
            return status.firstOpenTime.map { "the compartment opened before its reminder, at \($0)." }
                ?? "the compartment opened before its reminder."
        case .takenLate:
            return status.delayMinutes.map { "the first opening was recorded \($0) minutes after the reminder." }
                ?? "the first opening was recorded after the planned time."
        case .takenOnTime:
            return status.firstOpenTime.map { "an opening was recorded at \($0), within the reminder window." }
                ?? "an opening was recorded within the reminder window."
        case .dueSoon:
            return "the reminder window is active or approaching."
        case .upcoming:
            return "the scheduled reminder is still upcoming."
        case .waitingForDevice:
            return "the device has not reported today's opening history yet."
        }
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
            details.append("\(insight.missedCount) without an opening")
        }
        if insight.delayedCount > 0 {
            details.append("\(insight.delayedCount) later openings")
        }
        if insight.duplicateOpeningCount > 0 {
            details.append("\(insight.duplicateOpeningCount) repeat openings")
        }
        return details.isEmpty ? "No exception pattern in recent openings" : details.joined(separator: " · ")
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
                    Text("Journal · \(patientName)")
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
