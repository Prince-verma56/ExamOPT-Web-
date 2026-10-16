/**
 * The reference subjects files (`hackvision/backend/sample_datasets`), verbatim.
 * Plain strings with no imports, so the Import page can offer them as samples.
 */

const SUBJECTS_HEADER = "subject_id,name,program,semester,duration_hours,requires_lab,fixed_slot,unavailable_slots,enrolled_students";

const SUBJECTS_CSV = `${SUBJECTS_HEADER}
BCA-101,Mathematical Foundation of Computer Science,BCA,1,3,0,,,80
BCA-102,Problem Solving with C Programming,BCA,1,3,0,,D3-M,85
BCA-103,Digital Logic and Computer Organization,BCA,1,3,0,,,60
BCA-104P,C Programming Laboratory,BCA,1,2,1,,D1-M,85
BCADS-301,Data Structures using Python,BCA-DS,3,3,0,D1-M,,80
BCADS-302,Statistical Foundations for Data Science,BCA-DS,3,3,0,,,55
BCADS-303,Database Management Systems,BCA-DS,3,3,0,,D4-M,80
BCADS-304P,Data Structures & Python Lab,BCA-DS,3,2,1,,,55
BCADS-305P,R Programming & Statistics Lab,BCA-DS,3,2,1,,,55
BCA-301,Object-Oriented Programming with Java,BCA,3,3,0,,,75
BCA-302,Operating Systems & Shell Scripting,BCA,3,3,0,,D2-E,75
BCA-303,Web Technologies & UI Design,BCA,3,3,0,,,75
BCA-304P,Java Programming Laboratory,BCA,3,2,1,,,50
BCADS-501,Machine Learning & Pattern Recognition,BCA-DS,5,3,0,,,80
BCADS-502,Big Data Analytics with Apache Spark,BCA-DS,5,3,0,D2-M,,80
BCADS-503,Data Visualization & Business Intelligence,BCA-DS,5,3,0,,D3-E,80
BCADS-504P,Machine Learning Hands-on Lab,BCA-DS,5,2,1,,,80
BCADS-505P,Big Data & Hadoop Lab,BCA-DS,5,2,1,,,55
MCA-101,Advanced Data Structures & Algorithms,MCA,1,3,0,,,85
MCA-102,Advanced Operating Systems & Virtualization,MCA,1,3,0,,,85
MCA-103,Relational & NoSQL Database Architecture,MCA,1,3,0,D3-M,,85
MCA-104,Discrete Mathematics & Graph Theory,MCA,1,3,0,,D5-M,65
MCA-105P,Advanced DSA Laboratory,MCA,1,2,1,,,65
MCA-106P,Enterprise DBMS Laboratory,MCA,1,2,1,,,65`;

/** `edge_case_capacity_overflow.csv`: BCA-101 declares 650 students; the largest room seats 150. */
const CAPACITY_OVERFLOW_CSV = SUBJECTS_CSV.replace(
  "BCA-101,Mathematical Foundation of Computer Science,BCA,1,3,0,,,80",
  "BCA-101,Mega University Core: Mathematical Foundations,BCA,1,3,0,,,650",
);

/** `edge_case_lab_bottleneck.csv`: six laboratory exams fixed to D1-M, but the campus has five laboratories. */
const LAB_BOTTLENECK_CSV = `${SUBJECTS_HEADER}
BCA-101,Mathematical Foundation of Computer Science,BCA,1,3,0,,,80
BCA-102,Problem Solving with C Programming,BCA,1,3,0,,D3-M,85
BCA-103,Digital Logic and Computer Organization,BCA,1,3,0,,,60
BCA-104P,C Programming Laboratory,BCA,1,2,1,D1-M,,85
BCADS-301,Data Structures using Python,BCA-DS,3,3,0,D1-M,,80
BCADS-302,Statistical Foundations for Data Science,BCA-DS,3,3,0,,,55
BCADS-303,Database Management Systems,BCA-DS,3,3,0,,D4-M,80
BCADS-304P,Data Structures & Python Lab,BCA-DS,3,2,1,D1-M,,55
BCADS-305P,R Programming & Statistics Lab,BCA-DS,3,2,1,D1-M,,55
BCA-301,Object-Oriented Programming with Java,BCA,3,3,0,,,75
BCA-302,Operating Systems & Shell Scripting,BCA,3,3,0,,D2-E,75
BCA-303,Web Technologies & UI Design,BCA,3,3,0,,,75
BCA-304P,Java Programming Laboratory,BCA,3,2,1,,,50
BCADS-501,Machine Learning & Pattern Recognition,BCA-DS,5,3,0,,,80
BCADS-502,Big Data Analytics with Apache Spark,BCA-DS,5,3,0,D2-M,,80
BCADS-503,Data Visualization & Business Intelligence,BCA-DS,5,3,0,,D3-E,80
BCADS-504P,Machine Learning Hands-on Lab,BCA-DS,5,2,1,D1-M,,80
BCADS-505P,Big Data & Hadoop Lab,BCA-DS,5,2,1,D1-M,,55
MCA-101,Advanced Data Structures & Algorithms,MCA,1,3,0,,,85
MCA-102,Advanced Operating Systems & Virtualization,MCA,1,3,0,,,85
MCA-103,Relational & NoSQL Database Architecture,MCA,1,3,0,D3-M,,85
MCA-104,Discrete Mathematics & Graph Theory,MCA,1,3,0,,D5-M,65
MCA-105P,Advanced DSA Laboratory,MCA,1,2,1,D1-M,,65
MCA-106P,Enterprise DBMS Laboratory,MCA,1,2,1,,,65`;

/** `invalid_corrupted_input.csv`: duplicate id, negative count, contradictory and dangling slots, blank name, bad program. */
const CORRUPTED_CSV = `${SUBJECTS_HEADER}
BCA-101,Math Foundation,BCA,1,3,0,D1-M,,60
BCA-101,Duplicate Math Entry,BCA,1,3,0,D1-E,,50
ERR-NEG-01,Corrupted Quantum Computing,MCA,1,3,0,,,-40
ERR-CONTRA-02,Contradictory Logic Systems,BCA,3,3,0,D2-M,D2-M|D3-E,45
ERR-SLOT-03,Invalid Slot Reference Subject,BCA-DS,5,3,0,D99-M,D88-E,55
ERR-MISSING-04,,INVALID_PROG,12,10,5,,,30`;

export type ReferenceVariant = "normal" | "capacity_overflow" | "lab_bottleneck" | "invalid_corrupted";

export const REFERENCE_VARIANTS: Record<ReferenceVariant, { label: string; file: string; csv: string }> = {
  normal: { label: "GLA normal dataset", file: "normal_gla_dataset/subjects.csv", csv: SUBJECTS_CSV },
  capacity_overflow: { label: "Capacity overflow", file: "edge_case_capacity_overflow.csv", csv: CAPACITY_OVERFLOW_CSV },
  lab_bottleneck: { label: "Laboratory bottleneck", file: "edge_case_lab_bottleneck.csv", csv: LAB_BOTTLENECK_CSV },
  invalid_corrupted: { label: "Corrupted input", file: "invalid_corrupted_input.csv", csv: CORRUPTED_CSV },
};
