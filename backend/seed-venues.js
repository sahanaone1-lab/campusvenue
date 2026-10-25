/**
 * Seed script to populate 25 curated college campus venues permanently in Supabase PostgreSQL.
 * Uses .env.render for secure production credentials.
 * Preserves all existing records (safe idempotent insertion via ON CONFLICT).
 */

require('dotenv').config({ path: '.env.render' });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

const VENUES_DATA = [
  {
    name: 'Dr. APJ Abdul Kalam Grand Auditorium',
    building: 'Administrative Block A',
    location: 'Ground Floor, Main Quadrangle',
    capacity: 800,
    description: 'Premier campus auditorium designed for convocation ceremonies, national conferences, and distinguished guest lectures with full acoustic treatment.',
    facilities: ['Central Air Conditioning', 'Dolby 7.1 Surround Sound', 'Dual 4K Laser Projectors', 'Stage Lighting & Spotlights', 'Podium', 'Locker & Green Room Access', 'Wheelchair Accessible'],
  },
  {
    name: 'Sir C.V. Raman Science Seminar Hall',
    building: 'Science Block B',
    location: '2nd Floor, West Wing, Room 204',
    capacity: 180,
    description: 'Tiered acoustic seminar hall suitable for scientific symposiums, inter-college paper presentations, and guest lectures.',
    facilities: ['Central Air Conditioning', 'Dual 4K Laser Projectors', 'Sound System', 'Microphone', 'Interactive Digital Smartboard', 'High-Speed Wi-Fi 6', 'Podium'],
  },
  {
    name: 'Alan Turing Advanced Computing Lab',
    building: 'Computing Science Center',
    location: '1st Floor, Room CS-102',
    capacity: 75,
    description: 'State-of-the-art computational lab equipped with high-performance workstations for hackathons, competitive programming, and AI/ML workshops.',
    facilities: ['High-Performance Workstations (GPU)', 'High-Speed Wi-Fi 6', 'AC', 'Projector', 'Smart Board'],
  },
  {
    name: 'Swami Vivekananda Multi-Purpose Convention Hall',
    building: 'Student Activity Center',
    location: '1st Floor, Central Wing',
    capacity: 500,
    description: 'Spacious multi-purpose hall for student club activities, cultural festivals, orientation sessions, and youth summits.',
    facilities: ['Stage', 'Sound System', 'Stage Lighting & Spotlights', 'Microphone', 'AC', 'Projector', 'Podium', 'Wheelchair Accessible'],
  },
  {
    name: 'Srinivasa Ramanujan Mathematical Theatre',
    building: 'Academic Block C',
    location: '3rd Floor, Room AC-301',
    capacity: 120,
    description: 'Interactive lecture theatre equipped with digital touch smartboards and tiered seating for intensive academic lectures and seminars.',
    facilities: ['Interactive Digital Smartboard', 'AC', 'Projector', 'Sound System', 'Microphone', 'Wi-Fi'],
  },
  {
    name: 'Sarojini Naidu Conference Hall',
    building: 'Administrative Block A',
    location: '2nd Floor, East Wing, Room A-210',
    capacity: 60,
    description: 'Executive boardroom with hybrid teleconferencing setup for academic council meetings, board of studies discussions, and faculty development programs.',
    facilities: ['Video Conferencing Unit (Polycom/Zoom)', 'Central Air Conditioning', 'High-Speed Wi-Fi 6', 'Smart Board', 'Microphone'],
  },
  {
    name: 'Ada Lovelace Innovation Studio',
    building: 'Research & Innovation Hub',
    location: '2nd Floor, Tech Wing, Room RI-205',
    capacity: 50,
    description: 'Collaborative workspace designed for student startup ideation, project pitching, and incubation bootcamps.',
    facilities: ['High-Speed Wi-Fi 6', 'Interactive Digital Smartboard', 'High-Performance Workstations (GPU)', 'Projector', 'AC'],
  },
  {
    name: 'Rabindranath Tagore Open-Air Amphitheatre',
    building: 'Student Activity Center',
    location: 'Outdoor Plaza, Adjacent to SAC',
    capacity: 1200,
    description: 'Large open-air stepped amphitheatre for annual cultural fests, acoustic musical nights, street plays, and convocation rehearsals.',
    facilities: ['Stage', 'Sound System', 'Stage Lighting & Spotlights', 'Locker & Green Room Access'],
  },
  {
    name: 'Dr. Vikram Sarabhai Aerospace & Robotics Hall',
    building: 'Research & Innovation Hub',
    location: 'Ground Floor, Room RI-012',
    capacity: 100,
    description: 'Specialized presentation and demonstration hall equipped for robotics competitions, tech exhibitions, and engineering workshops.',
    facilities: ['Projector', 'Sound System', 'High-Speed Wi-Fi 6', 'AC', 'Wheelchair Accessible'],
  },
  {
    name: 'Visvesvaraya Engineering Design Studio',
    building: 'Mechanical Engineering Wing',
    location: '1st Floor, Room ME-108',
    capacity: 65,
    description: 'CAD/CAM and mechanical design facility with specialized projection systems for technical design seminars and project defenses.',
    facilities: ['High-Performance Workstations (GPU)', 'Dual 4K Laser Projectors', 'AC', 'Interactive Digital Smartboard', 'High-Speed Wi-Fi 6'],
  },
  {
    name: 'Aryabhata Astronomy & Physics Colloquium Room',
    building: 'Science Block B',
    location: '4th Floor, Room B-402',
    capacity: 90,
    description: 'Darkened projection room with high-lumen laser projectors for astrophysics presentations, departmental seminars, and guest talks.',
    facilities: ['Dual 4K Laser Projectors', 'AC', 'Sound System', 'Microphone', 'Podium'],
  },
  {
    name: 'Central Library Digital Learning Commons',
    building: 'Central Library Building',
    location: '2nd Floor, North Wing',
    capacity: 110,
    description: 'Quiet multimedia learning hall for digital research training, scholarly database webinars, and online certification drives.',
    facilities: ['High-Speed Wi-Fi 6', 'Central Air Conditioning', 'Projector', 'Sound System', 'Wheelchair Accessible'],
  },
  {
    name: 'Campus Indoor Sports Arena & Hall',
    building: 'Sports & Recreation Complex',
    location: 'Ground Floor, West Pavilion',
    capacity: 600,
    description: 'Enclosed wooden-floor sports arena suitable for inter-collegiate tournaments, martial arts exhibitions, yoga camps, and large student assemblies.',
    facilities: ['Sound System', 'Microphone', 'Locker & Green Room Access', 'Wheelchair Accessible'],
  },
  {
    name: 'Homi Bhabha Nuclear Science Lecture Hall',
    building: 'Science Block B',
    location: '1st Floor, Room B-115',
    capacity: 150,
    description: 'Spacious lecture hall with wide projection screen and advanced public address system for foundational science lectures and tests.',
    facilities: ['Projector', 'Sound System', 'Microphone', 'Podium', 'AC'],
  },
  {
    name: 'John von Neumann AI & Data Science Lab',
    building: 'Computing Science Center',
    location: '3rd Floor, Room CS-305',
    capacity: 80,
    description: 'High-density workstation lab dedicated to deep learning workshops, hackathons, and enterprise certification examinations.',
    facilities: ['High-Performance Workstations (GPU)', 'High-Speed Wi-Fi 6', 'Central Air Conditioning', 'Dual 4K Laser Projectors'],
  },
  {
    name: 'Chanakya Management & Case Study Room',
    building: 'Academic Block C',
    location: '2nd Floor, Room AC-215',
    capacity: 70,
    description: 'U-shaped Harvard-style discussion amphitheatre optimized for case-study debates, mock GDs, and campus placement interviews.',
    facilities: ['Interactive Digital Smartboard', 'Video Conferencing Unit (Polycom/Zoom)', 'Central Air Conditioning', 'Microphone', 'Wi-Fi'],
  },
  {
    name: 'South Campus Community Plaza Hall',
    building: 'South Campus Commons',
    location: 'Ground Floor, Pavilion Block',
    capacity: 350,
    description: 'Welcoming communal hall for campus club exhibitions, alumni meets, book fairs, and student association elections.',
    facilities: ['Stage', 'Sound System', 'Microphone', 'Podium', 'Wheelchair Accessible', 'Wi-Fi'],
  },
  {
    name: 'Prof. Satish Dhawan Aerospace Seminar Hall',
    building: 'Mechanical Engineering Wing',
    location: '2nd Floor, Aero Wing, Room ME-220',
    capacity: 140,
    description: 'Dedicated engineering symposium hall with digital audio-visual setup for aerospace, industrial, and manufacturing seminars.',
    facilities: ['Dual 4K Laser Projectors', 'AC', 'Sound System', 'Microphone', 'Podium', 'High-Speed Wi-Fi 6'],
  },
  {
    name: 'Grace Hopper Collaborative Tech Studio',
    building: 'Computing Science Center',
    location: '2nd Floor, Room CS-210',
    capacity: 55,
    description: 'Modular cluster-seating studio designed for agile hackathons, peer code reviews, and tech club meetups.',
    facilities: ['Interactive Digital Smartboard', 'High-Speed Wi-Fi 6', 'AC', 'Projector'],
  },
  {
    name: 'Subhash Chandra Bose Memorial Hall',
    building: 'Academic Block C',
    location: 'Ground Floor, Main Foyer',
    capacity: 250,
    description: 'Traditional ceremonial auditorium for college council inaugurations, national day celebrations, and inter-departmental quizzes.',
    facilities: ['Stage', 'Sound System', 'Microphone', 'Podium', 'Central Air Conditioning', 'Projector', 'Wheelchair Accessible'],
  },
  {
    name: 'Mother Teresa Social Outreach Center',
    building: 'South Campus Commons',
    location: '1st Floor, Room SC-104',
    capacity: 85,
    description: 'Multi-purpose training hall for NSS, NCC, blood donation camps, and community development workshops.',
    facilities: ['Projector', 'Sound System', 'Microphone', 'AC', 'Wheelchair Accessible'],
  },
  {
    name: 'Biotechnology & Genomic Research Hall',
    building: 'Science Block B',
    location: '3rd Floor, Bio Wing, Room B-310',
    capacity: 95,
    description: 'Modern seminar venue dedicated to life sciences symposia, bio-ethics workshops, and clinical research lectures.',
    facilities: ['Dual 4K Laser Projectors', 'AC', 'Sound System', 'Interactive Digital Smartboard', 'Wi-Fi'],
  },
  {
    name: 'Dean of Student Affairs Conference Room',
    building: 'Administrative Block A',
    location: '1st Floor, Room A-105',
    capacity: 35,
    description: 'Executive meeting room for student council grievance hearings, discipline committee sessions, and event coordination.',
    facilities: ['Video Conferencing Unit (Polycom/Zoom)', 'Smart Board', 'AC', 'High-Speed Wi-Fi 6'],
  },
  {
    name: 'Robotics & Mechatronics Testing Arena',
    building: 'Mechanical Engineering Wing',
    location: 'Basement Lab, Room ME-B01',
    capacity: 100,
    description: 'Open-floor testing arena with safety netting and viewing gallery for drone flight tests and automated rover demonstrations.',
    facilities: ['High-Speed Wi-Fi 6', 'Sound System', 'Projector', 'Wheelchair Accessible'],
  },
  {
    name: 'Campus Central Gymnasium & Yoga Pavilion',
    building: 'Sports & Recreation Complex',
    location: '1st Floor, Wellness Wing',
    capacity: 150,
    description: 'Well-ventilated serene pavilion with wooden flooring for morning yoga sessions, mental wellness workshops, and table tennis tournaments.',
    facilities: ['Sound System', 'Locker & Green Room Access', 'Wheelchair Accessible', 'Wi-Fi'],
  },
];

async function seedVenues() {
  console.log('Connecting to Supabase PostgreSQL database...');
  const client = await pool.connect();
  try {
    const initialCountRes = await client.query('SELECT COUNT(*) AS total FROM public.venues');
    console.log(`Current venues count in Supabase: ${initialCountRes.rows[0].total}`);

    console.log(`Starting insertion of ${VENUES_DATA.length} curated venues...`);
    let inserted = 0;
    let skipped = 0;

    for (const v of VENUES_DATA) {
      const res = await client.query(
        `INSERT INTO public.venues (name, building, location, capacity, description, facilities, is_active)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, true)
         ON CONFLICT (name) DO NOTHING
         RETURNING id, name;`,
        [v.name, v.building, v.location, v.capacity, v.description, JSON.stringify(v.facilities)]
      );

      if (res.rows.length > 0) {
        inserted++;
        console.log(`  [+] Inserted [Venue #${res.rows[0].id}]: "${res.rows[0].name}"`);
      } else {
        skipped++;
        console.log(`  [=] Skipped (already exists): "${v.name}"`);
      }
    }

    const finalCountRes = await client.query('SELECT COUNT(*) AS total FROM public.venues');
    console.log('\n==================================================');
    console.log(`Seeding Complete!`);
    console.log(`New venues added: ${inserted}`);
    console.log(`Skipped existing: ${skipped}`);
    console.log(`Total venues in Supabase PostgreSQL: ${finalCountRes.rows[0].total}`);
    console.log('==================================================');
  } catch (error) {
    console.error('Failed to seed venues:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

seedVenues();
