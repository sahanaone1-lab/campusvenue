import dayjs from 'dayjs';

/**
 * Sample realistic data for the Student Module (Phase 3).
 * Venues, Events, and Availability slots with comprehensive details.
 */

export const STUDENT_VENUES = [
  {
    id: 'V1',
    name: 'Main University Auditorium',
    location: 'Administrative Block A, Ground Floor',
    capacity: 850,
    facilities: [
      'Dolby 7.1 Surround Sound',
      'Dual 4K Laser Projectors',
      'Central Air Conditioning',
      'Stage Lighting & Spotlights',
      'Green Rooms (2)',
      'Wheelchair Accessible',
      'High-Speed Wi-Fi 6',
      'Motorized Acoustic Curtains',
    ],
    currentStatus: 'Available',
    currentEvent: null,
    description:
      'Premier campus auditorium designed for grand convocations, national symposiums, inter-collegiate cultural fests, and keynote lectures. Features tiered theater seating, cutting-edge acoustic engineering, and complete audiovisual support.',
    imageUrl: null,
    upcomingBookings: [
      {
        id: 'BK-101',
        eventName: 'Inter-College Debate Championship 2026',
        department: 'Literary Society & Dept of English',
        date: '2026-10-12',
        startTime: '10:00 AM',
        endTime: '02:00 PM',
        status: 'Booked',
        type: 'Cultural / Academic',
      },
      {
        id: 'BK-102',
        eventName: 'Annual University Convocation Ceremony',
        department: 'Academic Registrar Office',
        date: '2026-10-26',
        startTime: '09:00 AM',
        endTime: '04:00 PM',
        status: 'Booked',
        type: 'Institutional',
      },
      {
        id: 'BK-103',
        eventName: 'Global Tech Leadership Summit',
        department: 'Department of Computer Science',
        date: '2026-11-04',
        startTime: '01:30 PM',
        endTime: '06:00 PM',
        status: 'Booked',
        type: 'Conference',
      },
    ],
  },
  {
    id: 'V2',
    name: 'Sir C.V. Raman Seminar Hall',
    location: 'Science Block B, 2nd Floor, Room B-204',
    capacity: 220,
    facilities: [
      'Smart Interactive Touch Board',
      'Ceiling Array Microphones',
      'Dual HD Displays',
      'Central Air Conditioning',
      'Video Conferencing Unit (Polycom)',
      'Podium with Teleprompter',
      'Surround Sound',
    ],
    currentStatus: 'Occupied',
    currentEvent: {
      name: 'National Conference on Renewable Energy & Grid Storage',
      department: 'Department of Electrical & Electronics Engineering',
      organizer: 'IEEE Student Branch',
      startTime: '09:00 AM',
      endTime: '04:30 PM',
      speaker: 'Dr. Ramesh Sharma (IIT Delhi)',
    },
    description:
      'State-of-the-art tiered seminar hall ideal for guest lectures, doctoral defenses, research symposiums, and departmental seminars. Equipped with interactive digital presentation tools and hybrid video conferencing.',
    imageUrl: null,
    upcomingBookings: [
      {
        id: 'BK-201',
        eventName: 'National Conference on Renewable Energy',
        department: 'Department of Electrical Engineering',
        date: '2026-09-28',
        startTime: '09:00 AM',
        endTime: '04:30 PM',
        status: 'Booked',
        type: 'Conference',
      },
      {
        id: 'BK-202',
        eventName: 'Annual Technical Hackathon 2026 - Orientation',
        department: 'Coding & Robotics Club',
        date: '2026-10-05',
        startTime: '09:00 AM',
        endTime: '01:00 PM',
        status: 'Booked',
        type: 'Technical Club',
      },
      {
        id: 'BK-203',
        eventName: 'Quantum Computing Fundamentals Seminar',
        department: 'Department of Physics & Math',
        date: '2026-10-14',
        startTime: '02:00 PM',
        endTime: '05:00 PM',
        status: 'Booked',
        type: 'Lecture',
      },
    ],
  },
  {
    id: 'V3',
    name: 'Turing Computer Lab 04',
    location: 'IT & CS Block C, 3rd Floor, Room C-312',
    capacity: 70,
    facilities: [
      '65 High-End Workstations (Core i9, 32GB RAM, RTX 4070)',
      'Gigabit Ethernet LAN',
      'Dual Ceiling Projectors',
      'Whiteboard & Smart Stylus',
      'Dedicated UPS Power Backup',
      'Central Air Conditioning',
      'Developer Toolchain Pre-installed',
    ],
    currentStatus: 'Occupied',
    currentEvent: {
      name: 'Cloud Native DevOps & Kubernetes Masterclass',
      department: 'Department of Computer Science & Engineering',
      organizer: 'Developer Student Club (DSC)',
      startTime: '01:30 PM',
      endTime: '05:30 PM',
      speaker: 'Er. Priya Natarajan (Cloud Architect, AWS)',
    },
    description:
      'Advanced computing laboratory optimized for hands-on software development workshops, algorithmic hackathons, machine learning labs, and competitive programming contests.',
    imageUrl: null,
    upcomingBookings: [
      {
        id: 'BK-301',
        eventName: 'Cloud Native DevOps & Kubernetes Masterclass',
        department: 'Department of Computer Science',
        date: '2026-09-28',
        startTime: '01:30 PM',
        endTime: '05:30 PM',
        status: 'Booked',
        type: 'Hands-on Lab',
      },
      {
        id: 'BK-302',
        eventName: 'AI & Data Science Hands-on Guest Workshop',
        department: 'Department of Computer Science',
        date: '2026-10-19',
        startTime: '02:00 PM',
        endTime: '04:30 PM',
        status: 'Booked',
        type: 'Workshop',
      },
      {
        id: 'BK-303',
        eventName: 'ACM ICPC Regional Qualifier Mock Contest',
        department: 'Coding Club',
        date: '2026-10-28',
        startTime: '10:00 AM',
        endTime: '03:00 PM',
        status: 'Booked',
        type: 'Competition',
      },
    ],
  },
  {
    id: 'V4',
    name: 'Indoor Sports Complex & Arena',
    location: 'Sports & Student Activity Complex, South Campus',
    capacity: 450,
    facilities: [
      'Maple Hardwood Badminton & Basketball Courts',
      'Electronic Multi-Sport Scoreboard',
      'Retractable Bleacher Seating',
      'Locker Rooms & Shower Facilities',
      'High-Bay LED Sports Floodlights',
      'Digital PA & Announcements System',
      'First Aid & Physio Corner',
    ],
    currentStatus: 'Available',
    currentEvent: null,
    description:
      'Multi-purpose indoor sports pavilion catering to badminton, basketball, volleyball, table tennis tournaments, martial arts exhibitions, and annual university sports meets.',
    imageUrl: null,
    upcomingBookings: [
      {
        id: 'BK-401',
        eventName: 'Inter-Department Badminton Invitational Tournament',
        department: 'Sports Board & Physical Education',
        date: '2026-10-09',
        startTime: '08:30 AM',
        endTime: '06:00 PM',
        status: 'Booked',
        type: 'Sports',
      },
      {
        id: 'BK-402',
        eventName: 'Yoga & Mental Wellness Student Session',
        department: 'Student Welfare Cell',
        date: '2026-10-16',
        startTime: '06:30 AM',
        endTime: '08:30 AM',
        status: 'Booked',
        type: 'Wellness',
      },
    ],
  },
  {
    id: 'V5',
    name: 'Mechanical Engineering Workshop',
    location: 'Engineering Block D, Ground Floor, Bay 2',
    capacity: 90,
    facilities: [
      '5-Axis CNC Milling Machines',
      'Industrial 3D Printing Lab',
      'Welding & Fabrication Stations',
      'Safety Eyewash & Fire Suppression System',
      'Overhead Gantry Crane (2 Ton)',
      'Dust Extraction System',
      'Tool Crib & Storage Lockers',
    ],
    currentStatus: 'Maintenance',
    currentEvent: null,
    description:
      'Heavy engineering and manufacturing facility for prototyping, fabrication, machining, and formula student vehicle construction. Currently undergoing scheduled bi-annual calibration of precision machinery.',
    imageUrl: null,
    upcomingBookings: [
      {
        id: 'BK-501',
        eventName: 'Formula Student Chassis Fabrication',
        department: 'Department of Mechanical Engineering',
        date: '2026-10-08',
        startTime: '09:00 AM',
        endTime: '04:00 PM',
        status: 'Booked',
        type: 'Project Work',
      },
    ],
  },
  {
    id: 'V6',
    name: 'Dr. A.P.J. Abdul Kalam Conference Center',
    location: 'Executive Academic Complex E, 4th Floor',
    capacity: 160,
    facilities: [
      'Roundtable Executive Seating with Delegate Mics',
      'Dual 85" Ultra-HD Video Walls',
      'Simultaneous Translation Cabins',
      'Executive Dining & Pantry Lounge',
      'Secure High-Speed Wi-Fi',
      'Acoustic Paneling & Sound Isolation',
      'Press Briefing Stage',
    ],
    currentStatus: 'Available',
    currentEvent: null,
    description:
      'Executive conference hall modeled for university governing council meetings, international academic treaties, faculty recruitments, and corporate industry advisory board summits.',
    imageUrl: null,
    upcomingBookings: [
      {
        id: 'BK-601',
        eventName: 'Industry-Academia Partnership Council Meeting',
        department: 'Placement & Industry Relations Cell',
        date: '2026-10-15',
        startTime: '10:00 AM',
        endTime: '01:30 PM',
        status: 'Booked',
        type: 'Official Meeting',
      },
      {
        id: 'BK-602',
        eventName: 'Research Paper Peer Review Board',
        department: 'Dean of Research & Development',
        date: '2026-10-23',
        startTime: '02:00 PM',
        endTime: '05:30 PM',
        status: 'Booked',
        type: 'Academic Review',
      },
    ],
  },
  {
    id: 'V7',
    name: 'Biotechnology Innovation Lab',
    location: 'Life Sciences Block, 1st Floor, Room L-108',
    capacity: 45,
    facilities: [
      'Biosafety Level 2 Cabinets',
      'Real-Time PCR & Gel Electrophoresis Units',
      'Cold Storage (-80°C Freezers)',
      'Centrifuges & Autoclaves',
      'Inverted Fluorescence Microscopes',
      'Hazardous Material Disposal Station',
    ],
    currentStatus: 'Occupied',
    currentEvent: {
      name: 'Bioinformatics & Genomic Sequencing Practical Class',
      department: 'Department of Biotechnology & Life Sciences',
      organizer: 'BioTech Scholars Association',
      startTime: '10:00 AM',
      endTime: '01:00 PM',
      speaker: 'Dr. Sunita Deshmukh',
    },
    description:
      'Specialized research wet lab equipped for gene editing, microbiology cultures, pharmaceutical biochemistry testing, and undergraduate research honors projects.',
    imageUrl: null,
    upcomingBookings: [
      {
        id: 'BK-701',
        eventName: 'Bioinformatics & Genomic Sequencing Practical Class',
        department: 'Department of Biotechnology',
        date: '2026-09-28',
        startTime: '10:00 AM',
        endTime: '01:00 PM',
        status: 'Booked',
        type: 'Lab Practical',
      },
      {
        id: 'BK-702',
        eventName: 'Microbial Culture Isolation Workshop',
        department: 'Department of Biotechnology',
        date: '2026-10-12',
        startTime: '09:30 AM',
        endTime: '03:30 PM',
        status: 'Booked',
        type: 'Workshop',
      },
    ],
  },
  {
    id: 'V8',
    name: 'Centenary Open-Air Amphitheatre',
    location: 'Central University Quadrangle, Arts Lawn',
    capacity: 600,
    facilities: [
      'Stepped Stone Open-Air Seating',
      'Circular Performance Stage',
      'Outdoor Weather-Resistant PA System',
      'Floodlight Towers for Night Events',
      'Green Dressing Gazebos',
      'Lawn Buffer & Open Space',
    ],
    currentStatus: 'Available',
    currentEvent: null,
    description:
      'Vibrant open-air Greek-style amphitheatre nestled among central lawns, reserved for street plays (Nukkad Natak), rock band concerts, poetry open mics, and student club orientations.',
    imageUrl: null,
    upcomingBookings: [
      {
        id: 'BK-801',
        eventName: 'Campus Acoustic Jam & Poetry Evening',
        department: 'Music & Fine Arts Club',
        date: '2026-10-02',
        startTime: '05:00 PM',
        endTime: '08:30 PM',
        status: 'Booked',
        type: 'Cultural Event',
      },
      {
        id: 'BK-802',
        eventName: 'Diwali Cultural Night & Folk Dance Festival',
        department: 'Student Council Cultural Committee',
        date: '2026-10-31',
        startTime: '06:00 PM',
        endTime: '10:00 PM',
        status: 'Booked',
        type: 'Festival Celebration',
      },
    ],
  },
];

export const STUDENT_EVENTS = [
  {
    id: 'EV-101',
    name: 'National Conference on Renewable Energy & Grid Storage',
    department: 'Department of Electrical & Electronics Engineering',
    venue: 'Sir C.V. Raman Seminar Hall',
    venueId: 'V2',
    date: '2026-09-28',
    startTime: '09:00 AM',
    endTime: '04:30 PM',
    description:
      'A national symposium gathering renewable energy researchers, solar microgrid engineers, and academic faculty to discuss battery storage innovations and clean power grids.',
    organizer: 'IEEE Student Branch',
    category: 'Conference',
    status: 'Ongoing',
  },
  {
    id: 'EV-102',
    name: 'Cloud Native DevOps & Kubernetes Masterclass',
    department: 'Department of Computer Science & Engineering',
    venue: 'Turing Computer Lab 04',
    venueId: 'V3',
    date: '2026-09-28',
    startTime: '01:30 PM',
    endTime: '05:30 PM',
    description:
      'Intensive hands-on lab covering containerization with Docker, Kubernetes cluster orchestration, and CI/CD automated deployment pipelines with GitOps.',
    organizer: 'Developer Student Club (DSC)',
    category: 'Workshop',
    status: 'Ongoing',
  },
  {
    id: 'EV-103',
    name: 'Bioinformatics & Genomic Sequencing Practical Class',
    department: 'Department of Biotechnology & Life Sciences',
    venue: 'Biotechnology Innovation Lab',
    venueId: 'V7',
    date: '2026-09-28',
    startTime: '10:00 AM',
    endTime: '01:00 PM',
    description:
      'Laboratory practical on next-generation gene sequencing tools, computational sequence alignments, and molecular phylogenetic trees.',
    organizer: 'BioTech Scholars Association',
    category: 'Academic',
    status: 'Ongoing',
  },
  {
    id: 'EV-104',
    name: 'Campus Acoustic Jam & Poetry Evening',
    department: 'Department of Humanities & Cultural Club',
    venue: 'Centenary Open-Air Amphitheatre',
    venueId: 'V8',
    date: '2026-10-02',
    startTime: '05:00 PM',
    endTime: '08:30 PM',
    description:
      'Open-air unplugged musical performances and original poetry recitals beneath the campus twilight. Open to all students and faculty.',
    organizer: 'Music & Fine Arts Club',
    category: 'Cultural',
    status: 'Upcoming',
  },
  {
    id: 'EV-105',
    name: 'Annual Technical Hackathon 2026',
    department: 'Department of Computer Science & Engineering',
    venue: 'Sir C.V. Raman Seminar Hall',
    venueId: 'V2',
    date: '2026-10-05',
    startTime: '09:00 AM',
    endTime: '05:00 PM',
    description:
      'The flagship 36-hour collegiate hackathon featuring tracks in Generative AI, Sustainable Tech, Smart Healthcare, and FinTech with cash prizes.',
    organizer: 'Coding & Robotics Club',
    category: 'Competition',
    status: 'Upcoming',
  },
  {
    id: 'EV-106',
    name: 'Formula Student Chassis Fabrication & Design Review',
    department: 'Department of Mechanical Engineering',
    venue: 'Mechanical Engineering Workshop',
    venueId: 'V5',
    date: '2026-10-08',
    startTime: '09:00 AM',
    endTime: '04:00 PM',
    description:
      'Rigorous structural telemetry testing and tubular spaceframe welding session for the national student electric race vehicle challenge.',
    organizer: 'Society of Automotive Engineers (SAE)',
    category: 'Technical',
    status: 'Upcoming',
  },
  {
    id: 'EV-107',
    name: 'Inter-Department Badminton Invitational Tournament',
    department: 'Department of Physical Education & Sports',
    venue: 'Indoor Sports Complex & Arena',
    venueId: 'V4',
    date: '2026-10-09',
    startTime: '08:30 AM',
    endTime: '06:00 PM',
    description:
      'Annual men’s and women’s singles and doubles tournament between all university academic departments with trophy presentations.',
    organizer: 'University Sports Board',
    category: 'Sports',
    status: 'Upcoming',
  },
  {
    id: 'EV-108',
    name: 'Inter-College Debate Championship 2026',
    department: 'Department of Humanities & Social Sciences',
    venue: 'Main University Auditorium',
    venueId: 'V1',
    date: '2026-10-12',
    startTime: '10:00 AM',
    endTime: '02:00 PM',
    description:
      'Parliamentary style collegiate debate featuring 24 participating university delegations discussing ethical dimensions of artificial intelligence in governance.',
    organizer: 'Literary Society',
    category: 'Cultural',
    status: 'Upcoming',
  },
  {
    id: 'EV-109',
    name: 'Quantum Computing Fundamentals & Algorithms Seminar',
    department: 'Department of Physics & Mathematical Sciences',
    venue: 'Sir C.V. Raman Seminar Hall',
    venueId: 'V2',
    date: '2026-10-14',
    startTime: '02:00 PM',
    endTime: '05:00 PM',
    description:
      'Specialist academic lecture introducing qubits, quantum superposition, Shor’s algorithm, and current cryogenic hardware developments.',
    organizer: 'Physics Department Faculty',
    category: 'Academic',
    status: 'Upcoming',
  },
  {
    id: 'EV-110',
    name: 'Industry-Academia Partnership Council Meeting',
    department: 'Placement & Industry Relations Cell',
    venue: 'Dr. A.P.J. Abdul Kalam Conference Center',
    venueId: 'V6',
    date: '2026-10-15',
    startTime: '10:00 AM',
    endTime: '01:30 PM',
    description:
      'High-level advisory board conference on upcoming placement drives, curriculum modernization, and funded corporate research fellowships.',
    organizer: 'Career Services Directorate',
    category: 'Official',
    status: 'Upcoming',
  },
  {
    id: 'EV-111',
    name: 'AI & Data Science Hands-on Guest Workshop',
    department: 'Department of Computer Science & Engineering',
    venue: 'Turing Computer Lab 04',
    venueId: 'V3',
    date: '2026-10-19',
    startTime: '02:00 PM',
    endTime: '04:30 PM',
    description:
      'Interactive tutorial on fine-tuning open-source LLMs, retrieval augmented generation (RAG) pipelines, and vector database embeddings.',
    organizer: 'Association for Computing Machinery (ACM)',
    category: 'Workshop',
    status: 'Upcoming',
  },
  {
    id: 'EV-112',
    name: 'Annual University Convocation Ceremony 2026',
    department: 'Academic Registrar & University Directorate',
    venue: 'Main University Auditorium',
    venueId: 'V1',
    date: '2026-10-26',
    startTime: '09:00 AM',
    endTime: '04:00 PM',
    description:
      'Graduation ceremony conferring degrees to the passing batch of undergraduate, postgraduate, and doctoral scholars with distinguished guest address.',
    organizer: 'Academic Secretariat',
    category: 'Institutional',
    status: 'Upcoming',
  },
  {
    id: 'EV-113',
    name: 'Diwali Cultural Night & Folk Dance Festival',
    department: 'Student Welfare & Cultural Affairs',
    venue: 'Centenary Open-Air Amphitheatre',
    venueId: 'V8',
    date: '2026-10-31',
    startTime: '06:00 PM',
    endTime: '10:00 PM',
    description:
      'Grand festive celebration highlighting traditional music, classical dance forms, drama sketches, and lantern displays.',
    organizer: 'Student Council Cultural Committee',
    category: 'Cultural',
    status: 'Upcoming',
  },
];

/**
 * Standard university slot schedule intervals for live availability filtering.
 */
export const AVAILABILITY_TIME_SLOTS = [
  { key: 'slot-1', label: '08:00 AM - 10:00 AM', start: '08:00', end: '10:00', period: 'Morning' },
  { key: 'slot-2', label: '10:00 AM - 12:00 PM', start: '10:00', end: '12:00', period: 'Morning' },
  { key: 'slot-3', label: '12:00 PM - 02:00 PM', start: '12:00', end: '14:00', period: 'Afternoon' },
  { key: 'slot-4', label: '02:00 PM - 04:00 PM', start: '14:00', end: '16:00', period: 'Afternoon' },
  { key: 'slot-5', label: '04:00 PM - 06:00 PM', start: '16:00', end: '18:00', period: 'Evening' },
  { key: 'slot-6', label: '06:00 PM - 08:00 PM', start: '18:00', end: '20:00', period: 'Evening' },
];

/**
 * Pre-populated schedule matrix by date and venue for realistic availability lookups.
 * If a date/venue isn't explicitly listed, it computes deterministic slot availability.
 */
export const KNOWN_BOOKINGS_MAP = {
  '2026-09-28': {
    V2: [
      { slotKey: 'slot-1', status: 'Booked', event: 'National Conference on Renewable Energy' },
      { slotKey: 'slot-2', status: 'Booked', event: 'National Conference on Renewable Energy' },
      { slotKey: 'slot-3', status: 'Booked', event: 'National Conference on Renewable Energy' },
      { slotKey: 'slot-4', status: 'Booked', event: 'National Conference on Renewable Energy' },
      { slotKey: 'slot-5', status: 'Available' },
      { slotKey: 'slot-6', status: 'Available' },
    ],
    V3: [
      { slotKey: 'slot-1', status: 'Available' },
      { slotKey: 'slot-2', status: 'Available' },
      { slotKey: 'slot-3', status: 'Available' },
      { slotKey: 'slot-4', status: 'Booked', event: 'Cloud Native DevOps & Kubernetes Masterclass' },
      { slotKey: 'slot-5', status: 'Booked', event: 'Cloud Native DevOps & Kubernetes Masterclass' },
      { slotKey: 'slot-6', status: 'Available' },
    ],
    V7: [
      { slotKey: 'slot-1', status: 'Available' },
      { slotKey: 'slot-2', status: 'Booked', event: 'Bioinformatics & Genomic Sequencing Practical' },
      { slotKey: 'slot-3', status: 'Booked', event: 'Bioinformatics & Genomic Sequencing Practical' },
      { slotKey: 'slot-4', status: 'Available' },
      { slotKey: 'slot-5', status: 'Available' },
      { slotKey: 'slot-6', status: 'Available' },
    ],
    V5: [
      { slotKey: 'slot-1', status: 'Maintenance', reason: 'Machinery Calibration' },
      { slotKey: 'slot-2', status: 'Maintenance', reason: 'Machinery Calibration' },
      { slotKey: 'slot-3', status: 'Maintenance', reason: 'Machinery Calibration' },
      { slotKey: 'slot-4', status: 'Maintenance', reason: 'Machinery Calibration' },
      { slotKey: 'slot-5', status: 'Maintenance', reason: 'Machinery Calibration' },
      { slotKey: 'slot-6', status: 'Maintenance', reason: 'Machinery Calibration' },
    ],
  },
  '2026-10-02': {
    V8: [
      { slotKey: 'slot-1', status: 'Available' },
      { slotKey: 'slot-2', status: 'Available' },
      { slotKey: 'slot-3', status: 'Available' },
      { slotKey: 'slot-4', status: 'Available' },
      { slotKey: 'slot-5', status: 'Booked', event: 'Campus Acoustic Jam & Poetry Evening' },
      { slotKey: 'slot-6', status: 'Booked', event: 'Campus Acoustic Jam & Poetry Evening' },
    ],
  },
  '2026-10-05': {
    V2: [
      { slotKey: 'slot-1', status: 'Booked', event: 'Annual Technical Hackathon 2026' },
      { slotKey: 'slot-2', status: 'Booked', event: 'Annual Technical Hackathon 2026' },
      { slotKey: 'slot-3', status: 'Booked', event: 'Annual Technical Hackathon 2026' },
      { slotKey: 'slot-4', status: 'Booked', event: 'Annual Technical Hackathon 2026' },
      { slotKey: 'slot-5', status: 'Booked', event: 'Annual Technical Hackathon 2026' },
      { slotKey: 'slot-6', status: 'Available' },
    ],
  },
  '2026-10-08': {
    V5: [
      { slotKey: 'slot-1', status: 'Booked', event: 'Formula Student Chassis Fabrication' },
      { slotKey: 'slot-2', status: 'Booked', event: 'Formula Student Chassis Fabrication' },
      { slotKey: 'slot-3', status: 'Booked', event: 'Formula Student Chassis Fabrication' },
      { slotKey: 'slot-4', status: 'Booked', event: 'Formula Student Chassis Fabrication' },
      { slotKey: 'slot-5', status: 'Available' },
      { slotKey: 'slot-6', status: 'Available' },
    ],
  },
  '2026-10-09': {
    V4: [
      { slotKey: 'slot-1', status: 'Booked', event: 'Inter-Department Badminton Invitational Tournament' },
      { slotKey: 'slot-2', status: 'Booked', event: 'Inter-Department Badminton Invitational Tournament' },
      { slotKey: 'slot-3', status: 'Booked', event: 'Inter-Department Badminton Invitational Tournament' },
      { slotKey: 'slot-4', status: 'Booked', event: 'Inter-Department Badminton Invitational Tournament' },
      { slotKey: 'slot-5', status: 'Booked', event: 'Inter-Department Badminton Invitational Tournament' },
      { slotKey: 'slot-6', status: 'Available' },
    ],
  },
  '2026-10-12': {
    V1: [
      { slotKey: 'slot-1', status: 'Available' },
      { slotKey: 'slot-2', status: 'Booked', event: 'Inter-College Debate Championship 2026' },
      { slotKey: 'slot-3', status: 'Booked', event: 'Inter-College Debate Championship 2026' },
      { slotKey: 'slot-4', status: 'Available' },
      { slotKey: 'slot-5', status: 'Available' },
      { slotKey: 'slot-6', status: 'Available' },
    ],
  },
  '2026-10-14': {
    V2: [
      { slotKey: 'slot-1', status: 'Available' },
      { slotKey: 'slot-2', status: 'Available' },
      { slotKey: 'slot-3', status: 'Available' },
      { slotKey: 'slot-4', status: 'Booked', event: 'Quantum Computing Fundamentals Seminar' },
      { slotKey: 'slot-5', status: 'Booked', event: 'Quantum Computing Fundamentals Seminar' },
      { slotKey: 'slot-6', status: 'Available' },
    ],
  },
  '2026-10-15': {
    V6: [
      { slotKey: 'slot-1', status: 'Available' },
      { slotKey: 'slot-2', status: 'Booked', event: 'Industry-Academia Partnership Council Meeting' },
      { slotKey: 'slot-3', status: 'Booked', event: 'Industry-Academia Partnership Council Meeting' },
      { slotKey: 'slot-4', status: 'Available' },
      { slotKey: 'slot-5', status: 'Available' },
      { slotKey: 'slot-6', status: 'Available' },
    ],
  },
  '2026-10-19': {
    V3: [
      { slotKey: 'slot-1', status: 'Available' },
      { slotKey: 'slot-2', status: 'Available' },
      { slotKey: 'slot-3', status: 'Available' },
      { slotKey: 'slot-4', status: 'Booked', event: 'AI & Data Science Hands-on Guest Workshop' },
      { slotKey: 'slot-5', status: 'Booked', event: 'AI & Data Science Hands-on Guest Workshop' },
      { slotKey: 'slot-6', status: 'Available' },
    ],
  },
  '2026-10-26': {
    V1: [
      { slotKey: 'slot-1', status: 'Booked', event: 'Annual University Convocation Ceremony 2026' },
      { slotKey: 'slot-2', status: 'Booked', event: 'Annual University Convocation Ceremony 2026' },
      { slotKey: 'slot-3', status: 'Booked', event: 'Annual University Convocation Ceremony 2026' },
      { slotKey: 'slot-4', status: 'Booked', event: 'Annual University Convocation Ceremony 2026' },
      { slotKey: 'slot-5', status: 'Available' },
      { slotKey: 'slot-6', status: 'Available' },
    ],
  },
};

/**
 * Helper to compute slots for any given date and venue
 */
export const getVenueSlotsForDate = (venueId, dateStr) => {
  // Requirement 1 & 7: Venues are NOT available on Sundays
  if (dayjs(dateStr).day() === 0) {
    return AVAILABILITY_TIME_SLOTS.map((slotDef) => ({
      ...slotDef,
      slotKey: slotDef.key,
      status: 'Unavailable',
      reason: 'College Venues Closed on Sundays',
      event: 'Closed on Sundays',
    }));
  }

  const dateMap = KNOWN_BOOKINGS_MAP[dateStr];
  if (dateMap && dateMap[venueId]) {
    return dateMap[venueId].map((item) => {
      const slotDef = AVAILABILITY_TIME_SLOTS.find((s) => s.key === item.slotKey);
      return {
        ...slotDef,
        ...item,
      };
    });
  }

  // Default: check if venue itself is in maintenance
  const venue = STUDENT_VENUES.find((v) => v.id === venueId);
  const isMaintenance = venue?.currentStatus === 'Maintenance';

  return AVAILABILITY_TIME_SLOTS.map((slotDef, index) => {
    if (isMaintenance) {
      return {
        ...slotDef,
        slotKey: slotDef.key,
        status: 'Maintenance',
        reason: 'Scheduled Facility Maintenance',
      };
    }
    // Simulate realistic open availability with occasional afternoon booking based on day
    const dayNum = parseInt(dateStr.slice(-2), 10) || 1;
    const isBooked = (dayNum + index) % 7 === 0;
    return {
      ...slotDef,
      slotKey: slotDef.key,
      status: isBooked ? 'Booked' : 'Available',
      event: isBooked ? 'Department Academic Session' : undefined,
    };
  });
};
