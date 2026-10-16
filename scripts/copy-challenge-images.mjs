import fs from 'node:fs';
import path from 'node:path';

const sourceDir = 'C:\\Users\\VICTUS\\.gemini\\antigravity-ide\\brain\\1457c0eb-4a9f-45f1-88e1-792a420585c8';
const targetDir = path.resolve('public/Images/challenges');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const files = [
  { src: 'student_groups_studying_1792146839628.jpg', dest: 'student-groups.jpg' },
  { src: 'limited_classroom_desks_1792146865789.jpg', dest: 'limited-rooms.jpg' },
  { src: 'practical_examination_lab_1792146894015.jpg', dest: 'practical-exams.jpg' },
  { src: 'fixed_exam_calendar_1792146917955.jpg', dest: 'fixed-slots.jpg' },
  { src: 'room_unavailable_door_1792146950175.jpg', dest: 'room-unavailable.jpg' },
  { src: 'exam_hall_backlog_1792146976812.jpg', dest: 'exam-hall-backlog.jpg' },
];

for (const f of files) {
  const srcPath = path.join(sourceDir, f.src);
  const destPath = path.join(targetDir, f.dest);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied ${f.src} -> ${destPath}`);
  } else {
    console.warn(`Source not found: ${srcPath}`);
  }
}
