export const TYPES = ['lost', 'found'];

export const CATEGORIES = [
  'Electronics',
  'Books & Notes',
  'Clothing',
  'Accessories',
  'ID & Cards',
  'Keys',
  'Bags',
  'Sports',
  'Other'
];

export const LOCATION_GROUPS = [
  {
    label: 'ACADEMIC BLOCK 1 (AB1)',
    locations: [
      'AB1-101', 'AB1-102', 'AB1-103', 'AB1-104', 'AB1-201',
      'COMPUTER LAB', 'AI LAB', 'BIOTECH LAB',
      'FACULTY ROOM 1', 'FACULTY ROOM 2', 'FACULTY ROOM 3', 'FACULTY ROOM 4', 'FACULTY ROOM 5',
      'MOOT COURT', 'AB1 - LIBRARY', 'AB1 BACKSIDE', 'AB1 RECEPTION'
    ]
  },
  {
    label: 'ACADEMIC BLOCK 2 (AB2)',
    locations: [
      'AB2-101',
      'AB2-201', 'AB2-202', 'AB2-203', 'AB2-204', 'AB2-205',
      'AB2-206', 'AB2-207', 'AB2-208', 'AB2-209', 'AB2-210', 'AB2-211',
      'HOMELESS AREA', 'RECEPTION', 'CONFERENCE ROOM 1', 'CONFERENCE ROOM 2',
      'FACULTY CONFERENCE ROOM', 'DEAN CORRIDOR', 'BESIDE 207', 'AB2 - LIBRARY',
      'DRONE & UAV LAB', 'STUDENT LOUNGE - OPP. STUDENT REGISTRY', 'FACULTY LOUNGE',
      'MINI AUDITORIUM', 'DINING AREA', 'TUCK STORE', 'GYM'
    ]
  },
  {
    label: 'OUTSIDE THE BLOCKS',
    locations: ['RUNNING TRACK', 'PARKING AREA', 'BABA TEMPLE', 'SPORTS COMPLEX']
  }
];

export const LOCATIONS = LOCATION_GROUPS.flatMap((group) => group.locations);

export const STATUSES = ['active', 'claimed', 'resolved', 'archived'];
