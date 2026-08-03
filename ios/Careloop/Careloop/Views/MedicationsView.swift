import SwiftUI

struct MedicationsView: View {
    @EnvironmentObject private var store: CareStore
    @State private var showingConnectPillbox = false
    @State private var showingPillboxSetup = false

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: 16) {
                    PatientCarousel {
                        showingConnectPillbox = true
                    }
                    .environmentObject(store)
                    pillboxSetupButton
                    livePlan
                }
                .padding(.bottom, 28)
            }
            .background(Color.careCream)
            .refreshable {
                await store.refresh()
            }
            .navigationTitle("Medication plan")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(Color.white, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .fullScreenCover(isPresented: $showingConnectPillbox) {
                ConnectPillboxView()
                    .environmentObject(store)
            }
            .fullScreenCover(isPresented: $showingPillboxSetup) {
                PillboxSetupView(
                    patient: store.selectedPatient,
                    initialPlan: store.setupPlan(for: store.selectedPatientID),
                    deviceID: store.selectedPatient.deviceID,
                    isDemoConnected: store.selectedPatient.isDemoConnected
                ) { _ in
                    showingPillboxSetup = false
                }
                .environmentObject(store)
            }
        }
    }

    private var pillboxSetupButton: some View {
        Button {
            showingPillboxSetup = true
        } label: {
            HStack(spacing: 13) {
                Image(systemName: "slider.horizontal.3")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(Color.careCoralInk)
                    .frame(width: 42, height: 42)
                    .background(Color.careCoralSoft)
                    .clipShape(Circle())

                VStack(alignment: .leading, spacing: 3) {
                    Text("Pillbox setup")
                        .font(.subheadline.weight(.bold))
                        .foregroundStyle(Color.careInk)
                    Text("Update person, pillbox and medication routine")
                        .font(.caption)
                        .foregroundStyle(Color.careInkSoft)
                }

                Spacer(minLength: 8)
                Image(systemName: "chevron.right")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(Color.careInkFaint)
            }
            .padding(15)
            .careCard()
        }
        .buttonStyle(.plain)
        .padding(.horizontal, 16)
        .accessibilityHint("Opens the initialization page for the selected pillbox")
    }

    private var livePlan: some View {
        VStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    VStack(alignment: .leading, spacing: 3) {
                        Text("\(store.selectedPatient.firstName)'s daily routine")
                            .font(.headline)
                            .foregroundStyle(Color.careInk)
                        Text("\(store.medicationPlan.count) active compartments")
                            .font(.caption)
                            .foregroundStyle(Color.careInkSoft)
                    }
                    Spacer()
                    SyncPill(isSynced: store.isDeviceSynced)
                }

                SegmentedDoseProgress(
                    completed: store.takenCount,
                    total: store.doseStatuses.count
                )
            }
            .padding(16)
            .careCard()

            ForEach(store.doseStatuses) { status in
                MedicationPlanRow(status: status)
            }
        }
        .padding(.horizontal, 16)
    }

}

private struct MedicationPlanRow: View {
    let status: DoseStatus

    var body: some View {
        HStack(spacing: 13) {
            ZStack {
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .fill(status.kind.background)
                VStack(spacing: 1) {
                    Text("\(status.slot.slotId)")
                        .font(.headline.weight(.bold))
                    Text("COMP")
                        .font(.system(size: 7, weight: .bold))
                }
                .foregroundStyle(status.kind.foreground)
            }
            .frame(width: 48, height: 48)

            VStack(alignment: .leading, spacing: 4) {
                Text(status.slot.medication)
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(Color.careInk)
                    .lineLimit(1)
                HStack(spacing: 5) {
                    Label(status.slot.scheduledTime, systemImage: "clock")
                    if status.slot.highRisk {
                        Text("High attention")
                    }
                }
                .font(.caption2.weight(.medium))
                .foregroundStyle(Color.careInkSoft)
            }

            Spacer(minLength: 6)
            DoseStatusPill(kind: status.kind)
        }
        .padding(14)
        .careCard()
    }
}
