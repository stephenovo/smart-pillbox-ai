export type PatientWellbeing = "attention" | "watch" | "good";

export type EmergencyContact = {
  name: string;
  relation: string;
  phone: string;
  isPrimary?: boolean;
};

export type CarePatient = {
  id: string;
  name: string;
  firstName: string;
  initials: string;
  age: number;
  city: string;
  relation: string;
  livingSituation: string;
  avatarTone: string;
  phone: string;
  emergencyContacts: EmergencyContact[];
  device: {
    name: string;
    batteryPercent: number;
    wifi: "strong" | "ok" | "weak";
  };
  /** Mon–Sun, 0–100 adherence for the last 7 days */
  weeklyRhythm: number[];
  wellbeing: PatientWellbeing;
  wellbeingNote: string;
  /** Static daily snapshot used for patients without a live device feed */
  snapshot: {
    dosesTaken: number;
    dosesTotal: number;
    lastEventLabel: string;
    lastEventTime: string;
  };
};

export const careCircle: CarePatient[] = [
  {
    id: "margaret",
    name: "Margaret Lin",
    firstName: "Margaret",
    initials: "ML",
    age: 79,
    city: "Hong Kong",
    relation: "Mum",
    livingSituation: "Lives independently",
    avatarTone: "bg-coral-soft text-coral-ink",
    phone: "+85255550118",
    emergencyContacts: [
      {
        name: "Amy Lin",
        relation: "Daughter",
        phone: "+85255550120",
        isPrimary: true,
      },
      { name: "Dr. Wong's clinic", relation: "GP", phone: "+85255550131" },
    ],
    device: {
      name: "Kitchen pillbox",
      batteryPercent: 82,
      wifi: "strong",
    },
    weeklyRhythm: [100, 100, 75, 100, 50, 75, 50],
    wellbeing: "attention",
    wellbeingNote: "Evening heart medication is still unopened.",
    snapshot: {
      dosesTaken: 3,
      dosesTotal: 4,
      lastEventLabel: "Blood Pressure Pill compartment opened twice",
      lastEventTime: "08:18",
    },
  },
];

export function wellbeingAppearance(wellbeing: PatientWellbeing) {
  if (wellbeing === "attention") {
    return {
      ring: "border-coral",
      badge: "bg-coral-soft text-coral-ink",
      dot: "bg-coral",
      label: "Needs a check-in",
    };
  }
  if (wellbeing === "watch") {
    return {
      ring: "border-honey",
      badge: "bg-honey-soft text-honey-ink",
      dot: "bg-honey",
      label: "Keep an eye on",
    };
  }
  return {
    ring: "border-mint",
    badge: "bg-mint-soft text-mint-ink",
    dot: "bg-mint",
    label: "Doing well",
  };
}
