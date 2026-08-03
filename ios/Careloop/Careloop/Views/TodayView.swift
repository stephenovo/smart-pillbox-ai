import SwiftUI

struct TodayView: View {
    @EnvironmentObject private var store: CareStore
    @State private var showingNoteComposer = false
    @State private var showingConnectPillbox = false

    private var greeting: String {
        let hour = Calendar.current.component(.hour, from: .now)
        if hour < 12 { return "Good morning" }
        if hour < 18 { return "Good afternoon" }
        return "Good evening"
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: 18) {
                    caregiverHeader
                    PatientCarousel {
                        showingConnectPillbox = true
                    }
                        .environmentObject(store)
                    patientStatusCard
                }
                .padding(.bottom, 28)
            }
            .background(Color.careCream)
            .refreshable {
                await store.refresh()
            }
            .navigationTitle("Smart Pillbox")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(Color.careSurface, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .sheet(isPresented: $showingNoteComposer) {
                NoteComposerView(initialPatientID: store.selectedPatientID)
                    .environmentObject(store)
                    .presentationDetents([.medium, .large])
            }
            .fullScreenCover(isPresented: $showingConnectPillbox) {
                ConnectPillboxView()
            }
        }
    }

    private var caregiverHeader: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle().fill(Color.careMintSoft)
                Text("SC")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(Color.careMintInk)
            }
            .frame(width: 44, height: 44)

            VStack(alignment: .leading, spacing: 2) {
                Text("\(greeting), Sarah")
                    .font(.title3.weight(.bold))
                    .foregroundStyle(Color.careInk)
                Text(headerSummary)
                    .font(.caption)
                    .foregroundStyle(Color.careInkSoft)
            }

            Spacer(minLength: 8)
            SyncPill(isSynced: store.isDeviceSynced)
        }
        .padding(.horizontal, 20)
        .padding(.top, 10)
    }

    private var headerSummary: String {
        guard store.hasLoadedLiveData else { return "Waiting for today's pillbox update" }
        let count = store.attentionStatuses.count
        return count == 0 ? "Everyone is doing well today" : "\(count) thing\(count == 1 ? "" : "s") to check on today"
    }

    private var patientStatusCard: some View {
        let patient = store.selectedPatient
        let wellbeing = store.selectedWellbeing
        let completed = store.takenCount
        let total = store.doseStatuses.count

        return VStack(spacing: 0) {
            VStack(alignment: .leading, spacing: 16) {
                HStack(spacing: 12) {
                    CareAvatar(patient: patient, wellbeing: wellbeing, size: 50)
                    VStack(alignment: .leading, spacing: 3) {
                        Text(patient.name)
                            .font(.headline)
                            .foregroundStyle(Color.careInk)
                        Text("\(patient.age) · \(patient.livingSituation)")
                            .font(.caption)
                            .foregroundStyle(Color.careInkSoft)
                            .lineLimit(1)
                    }
                    Spacer(minLength: 4)
                    WellbeingPill(wellbeing: wellbeing)
                }

                VStack(alignment: .leading, spacing: 8) {
                    Text("TODAY'S DOSES")
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(Color.careInkFaint)
                    HStack(alignment: .firstTextBaseline, spacing: 5) {
                        Text("\(completed) of \(total)")
                            .font(.title2.weight(.bold))
                            .foregroundStyle(Color.careInk)
                        Text("taken")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(Color.careInkSoft)
                    }
                    SegmentedDoseProgress(completed: completed, total: total)
                }

                livePatientMessage
            }
            .padding(16)

            Divider().overlay(Color.careLine)

            HStack(spacing: 0) {
                CareActionLink(
                    title: "Call",
                    symbol: "phone",
                    destination: URL(string: "tel:\(patient.phone)")
                )
                CareActionLink(
                    title: "Message",
                    symbol: "message",
                    destination: URL(string: "sms:\(patient.phone)")
                )
                CareActionButton(title: "Note", symbol: "square.and.pencil") {
                    showingNoteComposer = true
                }
                CareActionButton(
                    title: store.selectedPatientIsReviewed ? "Reviewed" : "Review",
                    symbol: "checkmark.circle",
                    isActive: store.selectedPatientIsReviewed
                ) {
                    store.toggleSelectedPatientReviewed()
                }
            }
            .padding(.horizontal, 6)
        }
        .careCard()
        .padding(.horizontal, 16)
    }

    @ViewBuilder
    private var livePatientMessage: some View {
        if let attention = store.attentionStatuses.first,
           !store.selectedPatientIsReviewed {
            VStack(alignment: .leading, spacing: 5) {
                Text("\(attention.slot.medication) - \(attention.kind.label.lowercased())")
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(Color.careCoralInk)
                Text(attention.detail)
                    .font(.caption)
                    .foregroundStyle(Color.careCoralInk.opacity(0.85))
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(13)
            .background(Color.careCoralSoft)
            .clipShape(RoundedRectangle(cornerRadius: 9, style: .continuous))
        } else if store.hasLoadedLiveData {
            Label("\(store.selectedPatient.firstName)'s routine looks settled right now.", systemImage: "checkmark.circle.fill")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Color.careMintInk)
        } else {
            Label("Waiting for the pillbox to report today's activity.", systemImage: "wifi.slash")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Color.careInkSoft)
        }
    }

}
