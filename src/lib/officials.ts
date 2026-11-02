/**
 * SVM officials shown on the "SVM Team" page.
 *
 * Edit the details below. Tips:
 * - Leave a contact field as "" to hide that button.
 * - phone / whatsapp: 10-digit Indian mobile, e.g. "9876543210".
 * - photo: put the image in /public/team/ and write "/team/filename.jpg" (or leave "" to show initials).
 * - Names in [square brackets] are placeholders; the page shows a reminder until they are replaced.
 */
import type { DisciplineId } from "./types";

export interface Official {
  name: string;
  role: string;
  dept?: string; // e.g. "Dept. of Computer Science" or "CSE"
  year?: number; // students only
  phone?: string;
  whatsapp?: string;
  email?: string;
  instagram?: string; // handle without @
  photo?: string;
  note?: string; // one line, e.g. "Ask me about auditions"
}

export interface WingHead extends Official {
  discipline: DisciplineId;
}

export const SVM_INFO = {
  name: "Sangeet Vrinda x Madhyam (SVM)",
  about:
    "SVM is the cultural club of KLE Institute of Technology, home to music, dance, photography, videography, art, literature, anchoring and theatre. Everyone is welcome, no experience needed.",
  email: "", // club email
  instagram: "", // club Instagram handle
  whatsappGroup: "", // full invite link, e.g. "https://chat.whatsapp.com/…"
  room: "[SVM Room / meeting place]",
  meets: "[e.g. Every Friday, 4:30 pm]",
};

// Add department, phone, email and photo for each person when available.
export const FACULTY_COORDINATORS: Official[] = [
  { name: "Balachandra", role: "Faculty Coordinator", dept: "", phone: "", email: "", photo: "" },
  { name: "Girish", role: "Faculty Coordinator", dept: "", phone: "", email: "", photo: "" },
];

export const STUDENT_COORDINATORS: Official[] = [
  { name: "Vineet", role: "Student Coordinator", dept: "", phone: "", whatsapp: "", email: "", instagram: "", photo: "" },
  { name: "Gautami", role: "Student Coordinator", dept: "", phone: "", whatsapp: "", email: "", instagram: "", photo: "" },
  { name: "Syed Usman", role: "Student Coordinator", dept: "", phone: "", whatsapp: "", email: "", instagram: "", photo: "" },
  { name: "Madhu H", role: "Student Coordinator", dept: "", phone: "", whatsapp: "", email: "", instagram: "", photo: "" },
];

export const WING_HEADS: WingHead[] = [
  { discipline: "vocal", name: "[Name]", role: "Vocal Music Head", year: 3, whatsapp: "", instagram: "" },
  { discipline: "instrument", name: "[Name]", role: "Instruments Head", year: 3, whatsapp: "", instagram: "" },
  { discipline: "dance", name: "[Name]", role: "Dance Head", year: 3, whatsapp: "", instagram: "" },
  { discipline: "photo", name: "[Name]", role: "Photography Head", year: 3, whatsapp: "", instagram: "" },
  { discipline: "video", name: "[Name]", role: "Videography Head", year: 3, whatsapp: "", instagram: "" },
  { discipline: "art", name: "[Name]", role: "Art & Design Head", year: 3, whatsapp: "", instagram: "" },
  { discipline: "writing", name: "[Name]", role: "Literature Head", year: 3, whatsapp: "", instagram: "" },
  { discipline: "anchoring", name: "[Name]", role: "Anchoring Head", year: 3, whatsapp: "", instagram: "" },
  { discipline: "theatre", name: "[Name]", role: "Theatre Head", year: 3, whatsapp: "", instagram: "" },
];
