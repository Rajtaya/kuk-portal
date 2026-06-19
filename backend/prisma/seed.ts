import { PrismaClient, Role, Gender, Category, PostType, EmployeeClassification, EmploymentStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// Fail-safe: only seed when NODE_ENV is *explicitly* a local/test value. An unset
// or unexpected NODE_ENV (staging, preview, etc.) is treated as production and blocked,
// so seed credentials can never land in a deployed database by accident.
function assertSeedAllowed() {
  const env = process.env.NODE_ENV;
  if (env !== 'development' && env !== 'test') {
    console.error(`FATAL: Seed script only runs with NODE_ENV=development or test (got "${env ?? 'unset'}").`);
    process.exit(1);
  }
}

// Strong, complexity-compliant password: env-provided or a freshly generated random one.
// Never a hardcoded/predictable value.
function resolveSeedPassword(): string {
  const fromEnv = process.env.SEED_ADMIN_PASSWORD;
  if (fromEnv) {
    if (fromEnv.length < 12 || !/[a-z]/.test(fromEnv) || !/[A-Z]/.test(fromEnv) || !/\d/.test(fromEnv)) {
      console.error('FATAL: SEED_ADMIN_PASSWORD must be 12+ chars with upper, lower, and a digit.');
      process.exit(1);
    }
    return fromEnv;
  }
  // 18 random bytes -> base64url, guaranteed to contain the required character classes.
  return 'Aa1' + crypto.randomBytes(18).toString('base64url');
}

async function main() {
  assertSeedAllowed();
  const plainPassword = resolveSeedPassword();
  const password = await bcrypt.hash(plainPassword, 12);

  // ─── Universities ──────────────────────────────────────
  const kuk = await prisma.university.upsert({
    where: { code: 'KUK' }, update: {},
    create: { name: 'Kurukshetra University', code: 'KUK', city: 'Kurukshetra', state: 'Haryana' },
  });
  const mdu = await prisma.university.upsert({
    where: { code: 'MDU' }, update: {},
    create: { name: 'Maharshi Dayanand University', code: 'MDU', city: 'Rohtak', state: 'Haryana' },
  });
  const cdlu = await prisma.university.upsert({
    where: { code: 'CDLU' }, update: {},
    create: { name: 'Chaudhary Devi Lal University', code: 'CDLU', city: 'Sirsa', state: 'Haryana' },
  });

  // ─── Users ─────────────────────────────────────────────
  await prisma.user.upsert({
    where: { email: 'rajshtaya@gmail.com' }, update: {},
    create: { email: 'rajshtaya@gmail.com', password, name: 'Super Admin', role: Role.SUPER_ADMIN },
  });
  await prisma.user.upsert({
    where: { email: 'state@he.haryana.gov.in' }, update: {},
    create: { email: 'state@he.haryana.gov.in', password, name: 'State User', role: Role.STATE_USER },
  });
  for (const uni of [kuk, mdu, cdlu]) {
    await prisma.user.upsert({
      where: { email: `admin@${uni.code.toLowerCase()}.ac.in` }, update: {},
      create: { email: `admin@${uni.code.toLowerCase()}.ac.in`, password, name: `${uni.code} Admin`, role: Role.UNIVERSITY_ADMIN, universityId: uni.id },
    });
  }

  // ─── KUK Departments (real) ────────────────────────────
  const kukDeptNames = [
    'Department of Physics',
    'Department of Chemistry',
    'Department of Mathematics',
    'Department of Statistics',
    'Department of Computer Science & Applications',
    'Department of Electronics & Communication',
    'Department of Instrumentation',
    'Department of Botany',
    'Department of Zoology',
    'Department of Biotechnology',
    'Department of Microbiology',
    'Department of Biochemistry',
    'Department of Geophysics',
    'Department of Geography',
    'Department of Geology',
    'Department of English & Foreign Languages',
    'Department of Hindi',
    'Department of Sanskrit',
    'Department of Punjabi',
    'Department of History',
    'Department of Political Science',
    'Department of Philosophy',
    'Department of Psychology',
    'Department of Sociology',
    'Department of Economics',
    'Department of Commerce',
    'Department of Public Administration',
    'Department of Music & Dance',
    'Department of Fine Arts',
    'Department of Law',
    'Department of Education',
    'Department of Physical Education',
    'Department of Library & Information Science',
    'Department of Journalism & Mass Communication',
    'Department of Social Work',
    'Department of Tourism & Hotel Management',
    'Department of Pharmaceutical Sciences',
    'Department of Food Technology',
    'Department of Paper Technology',
    'Department of Mechanical Engineering',
    'Department of Electronic Science',
    'Institute of Integrated Himalayan Studies (IIHS)',
    'University Institute of Engineering & Technology (UIET)',
    'University School of Management',
    'Institute of Law',
    'Institute of Mass Communication & Media Technology',
  ];

  const kukDepts: Record<string, any> = {};
  for (const name of kukDeptNames) {
    const dept = await prisma.department.upsert({
      where: { name_universityId: { name, universityId: kuk.id } }, update: {},
      create: { name, universityId: kuk.id },
    });
    kukDepts[name] = dept;
  }

  // MDU & CDLU — basic departments
  const basicDeptNames = ['Physics', 'Chemistry', 'Mathematics', 'History', 'Computer Science', 'English', 'Commerce', 'Law', 'Education'];
  const otherDepts: Record<string, any> = {};
  for (const uni of [mdu, cdlu]) {
    for (const name of basicDeptNames) {
      const dept = await prisma.department.upsert({
        where: { name_universityId: { name, universityId: uni.id } }, update: {},
        create: { name, universityId: uni.id },
      });
      otherDepts[`${uni.code}-${name}`] = dept;
    }
  }

  // ─── Subjects (Master) ─────────────────────────────────
  const subjectNames = [
    'Physics', 'Chemistry', 'Mathematics', 'Statistics',
    'Computer Science', 'Electronics', 'Instrumentation',
    'Botany', 'Zoology', 'Biotechnology', 'Microbiology', 'Biochemistry',
    'Geophysics', 'Geography', 'Geology',
    'English', 'Hindi', 'Sanskrit', 'Punjabi',
    'History', 'Political Science', 'Philosophy', 'Psychology', 'Sociology',
    'Economics', 'Commerce', 'Public Administration',
    'Music', 'Fine Arts',
    'Law', 'Education', 'Physical Education',
    'Library & Information Science', 'Journalism & Mass Communication',
    'Social Work', 'Tourism & Hotel Management',
    'Pharmaceutical Sciences', 'Food Technology', 'Paper Technology',
    'Mechanical Engineering', 'Electronic Science',
    'Management', 'Information Technology',
  ];

  for (const name of subjectNames) {
    await prisma.subject.upsert({ where: { name }, update: {}, create: { name } });
  }

  // ─── Designations (Master) ─────────────────────────────
  const designationNames = [
    'Professor', 'Associate Professor', 'Assistant Professor',
    'Other Teaching Posts',
  ];
  for (const name of designationNames) {
    await prisma.designation.upsert({ where: { name }, update: {}, create: { name } });
  }

  // ─── Sample Employees ──────────────────────────────────
  // Retirement = last day of the birth month when the employee turns 60
  function retirementFromDob(dob: Date): Date {
    const y = dob.getUTCFullYear() + 60;
    const m = dob.getUTCMonth();
    return new Date(Date.UTC(y, m + 1, 0)); // last day of that month
  }

  const emp = (
    id: string, name: string, gender: Gender, uniId: string, deptId: string,
    subject: string, category: Category, catSel: Category, postType: PostType,
    desigAppointed: string, desigPresent: string, dob: Date, doj: Date,
    extras?: { mobileNumber?: string; email?: string },
  ) => ({
    employeeId: id, name, gender, universityId: uniId, departmentId: deptId,
    subject, category, categorySelection: catSel, postType,
    employeeClassification: EmployeeClassification.TEACHING,
    designationAppointed: desigAppointed, designationPresent: desigPresent,
    dateOfBirth: dob, dateOfJoining: doj,
    retirementDate: retirementFromDob(dob),
    employmentStatus: EmploymentStatus.ACTIVE,
    ...extras,
  });

  const employees = [
    // KUK — Physics
    emp('KUK-001', 'Dr. Rajesh Kumar', Gender.MALE, kuk.id, kukDepts['Department of Physics'].id,
      'Physics', Category.DSC, Category.UR, PostType.BUDGETED,
      'Assistant Professor', 'Professor',
      new Date('1967-01-15'), new Date('1998-08-10'),
      { mobileNumber: '9876543210', email: 'rajesh@kuk.ac.in' }),

    // KUK — Chemistry (retires June 2026 — will auto-retire on 1 July 2026)
    emp('KUK-002', 'Dr. Sunita Devi', Gender.FEMALE, kuk.id, kukDepts['Department of Chemistry'].id,
      'Chemistry', Category.BCA, Category.BCA, PostType.BUDGETED,
      'Associate Professor', 'Associate Professor',
      new Date('1966-06-22'), new Date('2002-07-01')),

    // KUK — Computer Science
    emp('KUK-003', 'Dr. Rampal Singh', Gender.MALE, kuk.id, kukDepts['Department of Computer Science & Applications'].id,
      'Computer Science', Category.UR, Category.UR, PostType.BUDGETED,
      'Assistant Professor', 'Assistant Professor',
      new Date('1978-12-05'), new Date('2012-06-01')),

    // KUK — Mathematics (retires Sep 2026)
    emp('KUK-004', 'Dr. Meena Rani', Gender.FEMALE, kuk.id, kukDepts['Department of Mathematics'].id,
      'Mathematics', Category.EWS, Category.UR, PostType.BUDGETED,
      'Assistant Professor', 'Assistant Professor',
      new Date('1966-09-10'), new Date('2000-02-01')),

    // KUK — English
    emp('KUK-005', 'Dr. Vikram Sharma', Gender.MALE, kuk.id, kukDepts['Department of English & Foreign Languages'].id,
      'English', Category.UR, Category.UR, PostType.BUDGETED,
      'Associate Professor', 'Professor',
      new Date('1968-03-25'), new Date('1999-11-01')),

    // KUK — History
    emp('KUK-006', 'Dr. Poonam Sangwan', Gender.FEMALE, kuk.id, kukDepts['Department of History'].id,
      'History', Category.BCB, Category.BCB, PostType.BUDGETED,
      'Assistant Professor', 'Associate Professor',
      new Date('1972-11-08'), new Date('2005-04-15')),

    // KUK — Economics (SFS)
    emp('KUK-007', 'Dr. Naresh Tanwar', Gender.MALE, kuk.id, kukDepts['Department of Economics'].id,
      'Economics', Category.UR, Category.UR, PostType.SFS,
      'Assistant Professor', 'Assistant Professor',
      new Date('1980-07-19'), new Date('2015-08-01')),

    // MDU — Physics
    emp('MDU-001', 'Dr. Sohan Lal', Gender.MALE, mdu.id, otherDepts['MDU-Physics'].id,
      'Physics', Category.BCB, Category.UR, PostType.BUDGETED,
      'Assistant Professor', 'Assistant Professor',
      new Date('1975-05-12'), new Date('2010-01-10')),

    // MDU — Chemistry (retires Aug 2026)
    emp('MDU-002', 'Dr. Kavita Hooda', Gender.FEMALE, mdu.id, otherDepts['MDU-Chemistry'].id,
      'Chemistry', Category.DSC, Category.DSC, PostType.BUDGETED,
      'Assistant Professor', 'Professor',
      new Date('1966-08-30'), new Date('1997-09-15')),

    // CDLU — History
    emp('CDLU-001', 'Dr. Anand Kumari', Gender.FEMALE, cdlu.id, otherDepts['CDLU-History'].id,
      'History', Category.EWS, Category.UR, PostType.BUDGETED,
      'Assistant Professor', 'Assistant Professor',
      new Date('1974-04-02'), new Date('2008-03-20')),

    // CDLU — Mathematics (contractual, young)
    emp('CDLU-002', 'Dr. Deepak Malik', Gender.MALE, cdlu.id, otherDepts['CDLU-Mathematics'].id,
      'Mathematics', Category.OSC, Category.OSC, PostType.CONTRACTUAL,
      'Assistant Professor', 'Assistant Professor',
      new Date('1988-02-14'), new Date('2020-11-01')),
  ];

  for (const emp of employees) {
    await prisma.employee.upsert({ where: { employeeId: emp.employeeId }, update: {}, create: emp });
  }

  // ─── Sample Sanctioned Posts (KUK) ─────────────────────
  const sanctionedPosts = [
    { universityId: kuk.id, departmentId: kukDepts['Department of Physics'].id, designation: 'Professor', sanctionedCount: 3 },
    { universityId: kuk.id, departmentId: kukDepts['Department of Physics'].id, designation: 'Associate Professor', sanctionedCount: 5 },
    { universityId: kuk.id, departmentId: kukDepts['Department of Physics'].id, designation: 'Assistant Professor', sanctionedCount: 2 },
    { universityId: kuk.id, departmentId: kukDepts['Department of Chemistry'].id, designation: 'Professor', sanctionedCount: 3 },
    { universityId: kuk.id, departmentId: kukDepts['Department of Chemistry'].id, designation: 'Associate Professor', sanctionedCount: 4 },
    { universityId: kuk.id, departmentId: kukDepts['Department of Mathematics'].id, designation: 'Professor', sanctionedCount: 2 },
    { universityId: kuk.id, departmentId: kukDepts['Department of Mathematics'].id, designation: 'Assistant Professor', sanctionedCount: 3 },
    { universityId: kuk.id, departmentId: kukDepts['Department of Computer Science & Applications'].id, designation: 'Professor', sanctionedCount: 2 },
    { universityId: kuk.id, departmentId: kukDepts['Department of Computer Science & Applications'].id, designation: 'Associate Professor', sanctionedCount: 4 },
    { universityId: kuk.id, departmentId: kukDepts['Department of Computer Science & Applications'].id, designation: 'Assistant Professor', sanctionedCount: 6 },
    { universityId: mdu.id, departmentId: otherDepts['MDU-Physics'].id, designation: 'Professor', sanctionedCount: 4 },
    { universityId: mdu.id, departmentId: otherDepts['MDU-Physics'].id, designation: 'Assistant Professor', sanctionedCount: 6 },
    { universityId: cdlu.id, departmentId: otherDepts['CDLU-History'].id, designation: 'Assistant Professor', sanctionedCount: 3 },
  ];

  for (const sp of sanctionedPosts) {
    await prisma.sanctionedPost.create({ data: sp });
  }

  console.log('Seed completed successfully');
  console.log('---');
  console.log(`Logins (password: ${plainPassword}):`);
  console.log('  (set SEED_ADMIN_PASSWORD to choose your own; otherwise this is a one-time random value)');
  console.log('  Super Admin:  rajshtaya@gmail.com');
  console.log('  State User:   state@he.haryana.gov.in');
  console.log('  KUK Admin:    admin@kuk.ac.in');
  console.log('  MDU Admin:    admin@mdu.ac.in');
  console.log('  CDLU Admin:   admin@cdlu.ac.in');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
