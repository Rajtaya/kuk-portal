import { PrismaClient, Role, Gender, Category, PostType, EmployeeClassification, EmploymentStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL: Seed script must not run in production. Set NODE_ENV to development or test.');
    process.exit(1);
  }
  console.warn('Seeding with default password "admin123" -- change all passwords before any non-local deployment.');
  const password = await bcrypt.hash('admin123', 10);

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
    where: { email: 'admin@he.haryana.gov.in' }, update: {},
    create: { email: 'admin@he.haryana.gov.in', password, name: 'Super Admin', role: Role.SUPER_ADMIN },
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
  const employees = [
    {
      employeeId: 'KUK-001', name: 'Dr. Rajesh Kumar', gender: Gender.MALE,
      universityId: kuk.id, departmentId: kukDepts['Department of Physics'].id,
      subject: 'Physics', category: Category.SC, categorySelection: Category.GENERAL,
      postType: PostType.BUDGETED, employeeClassification: EmployeeClassification.TEACHING,
      designationAppointed: 'Assistant Professor', designationPresent: 'Professor',
      retirementDate: new Date('2027-01-02'), dateOfJoining: new Date('2005-08-15'),
      employmentStatus: EmploymentStatus.ACTIVE, mobileNumber: '9876543210', email: 'rajesh@kuk.ac.in',
    },
    {
      employeeId: 'KUK-002', name: 'Dr. Sunita Devi', gender: Gender.FEMALE,
      universityId: kuk.id, departmentId: kukDepts['Department of Chemistry'].id,
      subject: 'Chemistry', category: Category.BCA, categorySelection: Category.BCA,
      postType: PostType.SFS, employeeClassification: EmployeeClassification.TEACHING,
      designationAppointed: 'Associate Professor', designationPresent: 'Associate Professor',
      retirementDate: new Date('2028-02-03'), dateOfJoining: new Date('2010-07-01'),
      employmentStatus: EmploymentStatus.ACTIVE,
    },
    {
      employeeId: 'KUK-003', name: 'Dr. Rampal Singh', gender: Gender.MALE,
      universityId: kuk.id, departmentId: kukDepts['Department of Computer Science & Applications'].id,
      subject: 'Computer Science', category: Category.GENERAL, categorySelection: Category.GENERAL,
      postType: PostType.BUDGETED, employeeClassification: EmployeeClassification.TEACHING,
      designationAppointed: 'Assistant Professor', designationPresent: 'Assistant Professor',
      retirementDate: new Date('2035-12-31'), dateOfJoining: new Date('2012-06-01'),
      employmentStatus: EmploymentStatus.ACTIVE,
    },
    {
      employeeId: 'KUK-004', name: 'Dr. Meena Rani', gender: Gender.FEMALE,
      universityId: kuk.id, departmentId: kukDepts['Department of Mathematics'].id,
      subject: 'Mathematics', category: Category.EWS, categorySelection: Category.GENERAL,
      postType: PostType.BUDGETED, employeeClassification: EmployeeClassification.TEACHING,
      designationAppointed: 'Assistant Professor', designationPresent: 'Assistant Professor',
      retirementDate: new Date('2026-09-30'), dateOfJoining: new Date('2008-02-01'),
      employmentStatus: EmploymentStatus.ACTIVE,
    },
    {
      employeeId: 'KUK-005', name: 'Dr. Vikram Sharma', gender: Gender.MALE,
      universityId: kuk.id, departmentId: kukDepts['Department of English & Foreign Languages'].id,
      subject: 'English', category: Category.GENERAL, categorySelection: Category.GENERAL,
      postType: PostType.BUDGETED, employeeClassification: EmployeeClassification.TEACHING,
      designationAppointed: 'Associate Professor', designationPresent: 'Professor',
      retirementDate: new Date('2027-06-30'), dateOfJoining: new Date('2003-11-01'),
      employmentStatus: EmploymentStatus.ACTIVE,
    },
    {
      employeeId: 'MDU-001', name: 'Dr. Sohan Lal', gender: Gender.MALE,
      universityId: mdu.id, departmentId: otherDepts['MDU-Physics'].id,
      subject: 'Physics', category: Category.BCB, categorySelection: Category.GENERAL,
      postType: PostType.CONTRACTUAL, employeeClassification: EmployeeClassification.TEACHING,
      designationAppointed: 'Assistant Professor', designationPresent: 'Assistant Professor',
      retirementDate: new Date('2030-05-01'), dateOfJoining: new Date('2018-01-10'),
      employmentStatus: EmploymentStatus.ACTIVE,
    },
    {
      employeeId: 'CDLU-001', name: 'Dr. Anand Kumar', gender: Gender.FEMALE,
      universityId: cdlu.id, departmentId: otherDepts['CDLU-History'].id,
      subject: 'History', category: Category.EWS, categorySelection: Category.GENERAL,
      postType: PostType.BUDGETED, employeeClassification: EmployeeClassification.TEACHING,
      designationAppointed: 'Assistant Professor', designationPresent: 'Assistant Professor',
      retirementDate: new Date('2029-05-01'), dateOfJoining: new Date('2015-03-20'),
      employmentStatus: EmploymentStatus.ACTIVE,
    },
  ];

  for (const emp of employees) {
    await prisma.employee.upsert({ where: { employeeId: emp.employeeId }, update: {}, create: emp });
  }

  // ─── Sample Sanctioned Posts (KUK) ─────────────────────
  const sanctionedPosts = [
    { universityId: kuk.id, departmentId: kukDepts['Department of Physics'].id, designation: 'Professor', category: Category.GENERAL, sanctionedCount: 3 },
    { universityId: kuk.id, departmentId: kukDepts['Department of Physics'].id, designation: 'Associate Professor', category: Category.GENERAL, sanctionedCount: 5 },
    { universityId: kuk.id, departmentId: kukDepts['Department of Physics'].id, designation: 'Assistant Professor', category: Category.SC, sanctionedCount: 2 },
    { universityId: kuk.id, departmentId: kukDepts['Department of Chemistry'].id, designation: 'Professor', category: Category.GENERAL, sanctionedCount: 3 },
    { universityId: kuk.id, departmentId: kukDepts['Department of Chemistry'].id, designation: 'Associate Professor', category: Category.BCA, sanctionedCount: 4 },
    { universityId: kuk.id, departmentId: kukDepts['Department of Mathematics'].id, designation: 'Professor', category: Category.GENERAL, sanctionedCount: 2 },
    { universityId: kuk.id, departmentId: kukDepts['Department of Mathematics'].id, designation: 'Assistant Professor', category: Category.EWS, sanctionedCount: 3 },
    { universityId: kuk.id, departmentId: kukDepts['Department of Computer Science & Applications'].id, designation: 'Professor', category: Category.GENERAL, sanctionedCount: 2 },
    { universityId: kuk.id, departmentId: kukDepts['Department of Computer Science & Applications'].id, designation: 'Associate Professor', category: Category.GENERAL, sanctionedCount: 4 },
    { universityId: kuk.id, departmentId: kukDepts['Department of Computer Science & Applications'].id, designation: 'Assistant Professor', category: Category.GENERAL, sanctionedCount: 6 },
    { universityId: mdu.id, departmentId: otherDepts['MDU-Physics'].id, designation: 'Professor', category: Category.GENERAL, sanctionedCount: 4 },
    { universityId: mdu.id, departmentId: otherDepts['MDU-Physics'].id, designation: 'Assistant Professor', category: Category.GENERAL, sanctionedCount: 6 },
    { universityId: cdlu.id, departmentId: otherDepts['CDLU-History'].id, designation: 'Assistant Professor', category: Category.GENERAL, sanctionedCount: 3 },
  ];

  for (const sp of sanctionedPosts) {
    await prisma.sanctionedPost.create({ data: sp });
  }

  console.log('Seed completed successfully');
  console.log('---');
  console.log('Logins (password: admin123):');
  console.log('  Super Admin:  admin@he.haryana.gov.in');
  console.log('  State User:   state@he.haryana.gov.in');
  console.log('  KUK Admin:    admin@kuk.ac.in');
  console.log('  MDU Admin:    admin@mdu.ac.in');
  console.log('  CDLU Admin:   admin@cdlu.ac.in');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
