import SwiftUI

struct MedicationsView: View {
    @EnvironmentObject private var store: CareStore
    @State private var showingConnectPillbox = false
    @State private var showingPillboxSetup = false

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: 16) {
                    if store.appMode == .circleCare {
                        PatientCarousel {
                            showingConnectPillbox = true
                        }
                        .environmentObject(store)
                        pillboxSetupButton
                        livePlan
                    } else {
                        myCarePlan
                    }
                }
                .padding(.top, 20)
                .padding(.bottom, 28)
            }
            .background(Color.careCream)
            .refreshable {
                await store.refresh()
            }
            .navigationTitle(store.appMode == .myCare ? "My Medicines" : "Medication plan")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(Color.careSurface, for: .navigationBar)
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

    private var myCarePlan: some View {
        VStack(spacing: 16) {
            VStack(alignment: .leading, spacing: 10) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 5) {
                        Text("Your daily plan")
                            .font(.title2.weight(.bold))
                            .foregroundStyle(Color.careInk)
                        Text("Everything is listed in the order you will need it.")
                            .font(.body)
                            .foregroundStyle(Color.careInkSoft)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    Spacer(minLength: 8)
                    SyncPill(isSynced: store.isDeviceSynced)
                }

                Text("\(store.medicationPlan.count) medicine\(store.medicationPlan.count == 1 ? "" : "s") in your plan")
                    .font(.headline)
                    .foregroundStyle(Color.careInkSoft)
                SegmentedDoseProgress(
                    completed: store.takenCount,
                    total: store.doseStatuses.count
                )
            }
            .padding(20)
            .careCard()

            if store.doseStatuses.isEmpty {
                VStack(spacing: 10) {
                    Image(systemName: "pills")
                        .font(.system(size: 28, weight: .medium))
                        .foregroundStyle(Color.careCoral)
                    Text("No medicines are listed yet")
                        .font(.title3.weight(.bold))
                        .foregroundStyle(Color.careInk)
                    Text("Ask someone you trust or your clinician to help set up your plan.")
                        .font(.body)
                        .foregroundStyle(Color.careInkSoft)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .padding(24)
                .careCard()
            } else {
                ForEach(store.doseStatuses) { status in
                    MyCareMedicationRow(status: status)
                }
            }

            HStack(alignment: .top, spacing: 14) {
                Image(systemName: "heart.fill")
                    .font(.system(size: 21, weight: .semibold))
                    .foregroundStyle(Color.careCoral)
                    .frame(width: 38, height: 38)

                VStack(alignment: .leading, spacing: 5) {
                    Text("Need to change your plan?")
                        .font(.title3.weight(.bold))
                        .foregroundStyle(Color.careInk)
                    Text("Ask a family member or clinician to help update medicine names and times safely.")
                        .font(.body)
                        .foregroundStyle(Color.careInkSoft)
                        .lineSpacing(3)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            .padding(20)
            .careCard()
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

private struct MyCareMedicationRow: View {
    let status: DoseStatus

    private var symbol: String {
        status.kind.countsAsTaken ? "checkmark" : "pills.fill"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 15) {
                Image(systemName: symbol)
                    .font(.system(size: 23, weight: .bold))
                    .foregroundStyle(status.kind.foreground)
                    .frame(width: 54, height: 54)
                    .background(status.kind.background)
                    .clipShape(Circle())

                VStack(alignment: .leading, spacing: 5) {
                    Text(status.slot.medication)
                        .font(.title3.weight(.bold))
                        .foregroundStyle(Color.careInk)
                        .fixedSize(horizontal: false, vertical: true)
                    Text("Take at \(status.slot.scheduledTime) · compartment \(status.slot.slotId)")
                        .font(.body)
                        .foregroundStyle(Color.careInkSoft)
                        .fixedSize(horizontal: false, vertical: true)
                }

                Spacer(minLength: 0)
            }

            Label(status.kind.label, systemImage: status.kind.symbol)
                .font(.subheadline.weight(.bold))
                .foregroundStyle(status.kind.foreground)
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(status.kind.background)
                .clipShape(Capsule())
        }
        .padding(18)
        .careCard()
    }
}
