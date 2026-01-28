import { PrismaClient, UserRole, DayOfWeek, BookingStatus, ReviewStatus, LeadStatus, QuoteStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with comprehensive data...');

  // Clear existing data
  console.log('Clearing existing data...');
  await prisma.businessAnalytics.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.message.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.quoteRequest.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.reviewResponse.deleteMany();
  await prisma.reviewPhoto.deleteMany();
  await prisma.review.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.chatSession.deleteMany();
  await prisma.advertisement.deleteMany();
  await prisma.service.deleteMany();
  await prisma.serviceArea.deleteMany();
  await prisma.businessHours.deleteMany();
  await prisma.businessVideo.deleteMany();
  await prisma.businessPhoto.deleteMany();
  await prisma.business.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  // ============================================
  // CATEGORIES (20+ categories)
  // ============================================
  console.log('Creating categories...');

  const mainCategories = await Promise.all([
    prisma.category.create({
      data: { name: 'Home Services', slug: 'home-services', description: 'All home-related services', icon: 'Home' },
    }),
    prisma.category.create({
      data: { name: 'Auto Services', slug: 'auto-services', description: 'Automotive repair and maintenance', icon: 'Car' },
    }),
    prisma.category.create({
      data: { name: 'Health & Wellness', slug: 'health-wellness', description: 'Health and wellness services', icon: 'Heart' },
    }),
    prisma.category.create({
      data: { name: 'Professional Services', slug: 'professional-services', description: 'Professional and business services', icon: 'Briefcase' },
    }),
    prisma.category.create({
      data: { name: 'Events & Entertainment', slug: 'events-entertainment', description: 'Event planning and entertainment', icon: 'Music' },
    }),
    prisma.category.create({
      data: { name: 'Pet Services', slug: 'pet-services', description: 'Pet care and grooming', icon: 'PawPrint' },
    }),
    prisma.category.create({
      data: { name: 'Beauty & Personal Care', slug: 'beauty-personal-care', description: 'Beauty and personal care services', icon: 'Sparkles' },
    }),
    prisma.category.create({
      data: { name: 'Education & Tutoring', slug: 'education-tutoring', description: 'Educational services and tutoring', icon: 'GraduationCap' },
    }),
    prisma.category.create({
      data: { name: 'Technology Services', slug: 'technology-services', description: 'IT and tech support services', icon: 'Laptop' },
    }),
    prisma.category.create({
      data: { name: 'Moving & Storage', slug: 'moving-storage', description: 'Moving and storage solutions', icon: 'Truck' },
    }),
  ]);

  // Subcategories for Home Services
  const homeServicesCategory = mainCategories[0];
  const homeSubcategories = await Promise.all([
    prisma.category.create({ data: { name: 'Plumbing', slug: 'plumbing', description: 'Plumbing repair and installation', icon: 'Wrench', parentId: homeServicesCategory.id } }),
    prisma.category.create({ data: { name: 'Electrical', slug: 'electrical', description: 'Electrical services', icon: 'Zap', parentId: homeServicesCategory.id } }),
    prisma.category.create({ data: { name: 'HVAC', slug: 'hvac', description: 'Heating, ventilation, and air conditioning', icon: 'Wind', parentId: homeServicesCategory.id } }),
    prisma.category.create({ data: { name: 'Cleaning', slug: 'cleaning', description: 'House cleaning services', icon: 'Sparkle', parentId: homeServicesCategory.id } }),
    prisma.category.create({ data: { name: 'Landscaping', slug: 'landscaping', description: 'Lawn care and landscaping', icon: 'Trees', parentId: homeServicesCategory.id } }),
    prisma.category.create({ data: { name: 'Roofing', slug: 'roofing', description: 'Roof repair and installation', icon: 'Home', parentId: homeServicesCategory.id } }),
    prisma.category.create({ data: { name: 'Painting', slug: 'painting', description: 'Interior and exterior painting', icon: 'Paintbrush', parentId: homeServicesCategory.id } }),
    prisma.category.create({ data: { name: 'Handyman', slug: 'handyman', description: 'General handyman services', icon: 'Hammer', parentId: homeServicesCategory.id } }),
    prisma.category.create({ data: { name: 'Carpentry', slug: 'carpentry', description: 'Woodworking and carpentry', icon: 'Hammer', parentId: homeServicesCategory.id } }),
    prisma.category.create({ data: { name: 'Flooring', slug: 'flooring', description: 'Flooring installation and repair', icon: 'Grid', parentId: homeServicesCategory.id } }),
  ]);

  // Subcategories for Auto Services
  const autoServicesCategory = mainCategories[1];
  await Promise.all([
    prisma.category.create({ data: { name: 'Auto Repair', slug: 'auto-repair', description: 'General auto repair', icon: 'Wrench', parentId: autoServicesCategory.id } }),
    prisma.category.create({ data: { name: 'Oil Change', slug: 'oil-change', description: 'Oil change services', icon: 'Droplet', parentId: autoServicesCategory.id } }),
    prisma.category.create({ data: { name: 'Tire Services', slug: 'tire-services', description: 'Tire repair and replacement', icon: 'Circle', parentId: autoServicesCategory.id } }),
    prisma.category.create({ data: { name: 'Auto Detailing', slug: 'auto-detailing', description: 'Car wash and detailing', icon: 'Sparkles', parentId: autoServicesCategory.id } }),
  ]);

  // ============================================
  // USERS (20+ users)
  // ============================================
  console.log('Creating users...');

  const hashedPassword = await bcrypt.hash('password123', 10);

  // Consumer users
  const consumers = await Promise.all([
    prisma.user.create({ data: { email: 'consumer@example.com', password: hashedPassword, name: 'John Consumer', phone: '555-100-0001', role: UserRole.CONSUMER } }),
    prisma.user.create({ data: { email: 'jane.doe@example.com', password: hashedPassword, name: 'Jane Doe', phone: '555-100-0002', role: UserRole.CONSUMER } }),
    prisma.user.create({ data: { email: 'bob.wilson@example.com', password: hashedPassword, name: 'Bob Wilson', phone: '555-100-0003', role: UserRole.CONSUMER } }),
    prisma.user.create({ data: { email: 'alice.smith@example.com', password: hashedPassword, name: 'Alice Smith', phone: '555-100-0004', role: UserRole.CONSUMER } }),
    prisma.user.create({ data: { email: 'charlie.brown@example.com', password: hashedPassword, name: 'Charlie Brown', phone: '555-100-0005', role: UserRole.CONSUMER } }),
    prisma.user.create({ data: { email: 'diana.ross@example.com', password: hashedPassword, name: 'Diana Ross', phone: '555-100-0006', role: UserRole.CONSUMER } }),
    prisma.user.create({ data: { email: 'edward.jones@example.com', password: hashedPassword, name: 'Edward Jones', phone: '555-100-0007', role: UserRole.CONSUMER } }),
    prisma.user.create({ data: { email: 'fiona.green@example.com', password: hashedPassword, name: 'Fiona Green', phone: '555-100-0008', role: UserRole.CONSUMER } }),
    prisma.user.create({ data: { email: 'george.white@example.com', password: hashedPassword, name: 'George White', phone: '555-100-0009', role: UserRole.CONSUMER } }),
    prisma.user.create({ data: { email: 'hannah.black@example.com', password: hashedPassword, name: 'Hannah Black', phone: '555-100-0010', role: UserRole.CONSUMER } }),
  ]);

  // Business owner users
  const businessOwners = await Promise.all([
    prisma.user.create({ data: { email: 'plumber@example.com', password: hashedPassword, name: 'Mike Johnson', phone: '555-200-0001', role: UserRole.BUSINESS_OWNER } }),
    prisma.user.create({ data: { email: 'electrician@example.com', password: hashedPassword, name: 'Sarah Smith', phone: '555-200-0002', role: UserRole.BUSINESS_OWNER } }),
    prisma.user.create({ data: { email: 'cleaner@example.com', password: hashedPassword, name: 'Emily Davis', phone: '555-200-0003', role: UserRole.BUSINESS_OWNER } }),
    prisma.user.create({ data: { email: 'hvac@example.com', password: hashedPassword, name: 'Robert Brown', phone: '555-200-0004', role: UserRole.BUSINESS_OWNER } }),
    prisma.user.create({ data: { email: 'landscaper@example.com', password: hashedPassword, name: 'Jennifer Miller', phone: '555-200-0005', role: UserRole.BUSINESS_OWNER } }),
    prisma.user.create({ data: { email: 'roofer@example.com', password: hashedPassword, name: 'David Wilson', phone: '555-200-0006', role: UserRole.BUSINESS_OWNER } }),
    prisma.user.create({ data: { email: 'painter@example.com', password: hashedPassword, name: 'Lisa Anderson', phone: '555-200-0007', role: UserRole.BUSINESS_OWNER } }),
    prisma.user.create({ data: { email: 'handyman@example.com', password: hashedPassword, name: 'James Taylor', phone: '555-200-0008', role: UserRole.BUSINESS_OWNER } }),
    prisma.user.create({ data: { email: 'mechanic@example.com', password: hashedPassword, name: 'Patricia Moore', phone: '555-200-0009', role: UserRole.BUSINESS_OWNER } }),
    prisma.user.create({ data: { email: 'petgroomer@example.com', password: hashedPassword, name: 'Christopher Lee', phone: '555-200-0010', role: UserRole.BUSINESS_OWNER } }),
    prisma.user.create({ data: { email: 'tutor@example.com', password: hashedPassword, name: 'Amanda Garcia', phone: '555-200-0011', role: UserRole.BUSINESS_OWNER } }),
    prisma.user.create({ data: { email: 'photographer@example.com', password: hashedPassword, name: 'Daniel Martinez', phone: '555-200-0012', role: UserRole.BUSINESS_OWNER } }),
    prisma.user.create({ data: { email: 'caterer@example.com', password: hashedPassword, name: 'Nancy Robinson', phone: '555-200-0013', role: UserRole.BUSINESS_OWNER } }),
    prisma.user.create({ data: { email: 'flooring@example.com', password: hashedPassword, name: 'Kevin Clark', phone: '555-200-0014', role: UserRole.BUSINESS_OWNER } }),
    prisma.user.create({ data: { email: 'carpenter@example.com', password: hashedPassword, name: 'Betty Lewis', phone: '555-200-0015', role: UserRole.BUSINESS_OWNER } }),
  ]);

  // Admin user
  await prisma.user.create({ data: { email: 'admin@example.com', password: hashedPassword, name: 'Admin User', role: UserRole.ADMIN } });

  // ============================================
  // BUSINESSES (15+ businesses)
  // ============================================
  console.log('Creating businesses...');

  const businessData = [
    {
      owner: businessOwners[0], name: 'Quick Fix Plumbing', slug: 'quick-fix-plumbing',
      description: 'Professional plumbing services for residential and commercial properties. We handle everything from minor repairs to major installations with guaranteed satisfaction.',
      shortDescription: 'Expert plumbing services with 24/7 emergency support',
      phone: '555-200-0001', email: 'plumber@example.com', website: 'https://quickfixplumbing.example.com',
      address: '123 Main Street', city: 'San Francisco', state: 'CA', zipCode: '94102',
      latitude: 37.7749, longitude: -122.4194, serviceRadius: 25, priceRange: 2, yearEstablished: 2010,
      licenseNumber: 'PLM-12345', insured: true, verified: true, featured: true, avgRating: 4.8, reviewCount: 156,
      category: homeSubcategories[0]
    },
    {
      owner: businessOwners[1], name: 'Bright Spark Electric', slug: 'bright-spark-electric',
      description: 'Licensed electricians providing safe and reliable electrical services. From panel upgrades to smart home installations.',
      shortDescription: 'Licensed electricians for all your electrical needs',
      phone: '555-200-0002', email: 'electrician@example.com', website: 'https://brightsparkelectric.example.com',
      address: '456 Oak Avenue', city: 'San Francisco', state: 'CA', zipCode: '94103',
      latitude: 37.7751, longitude: -122.4180, serviceRadius: 30, priceRange: 3, yearEstablished: 2015,
      licenseNumber: 'ELE-67890', insured: true, verified: true, featured: false, avgRating: 4.6, reviewCount: 89,
      category: homeSubcategories[1]
    },
    {
      owner: businessOwners[2], name: 'Sparkle Clean Services', slug: 'sparkle-clean-services',
      description: 'Professional house cleaning services. We use eco-friendly products and provide thorough cleaning for homes and offices.',
      shortDescription: 'Eco-friendly cleaning for homes and offices',
      phone: '555-200-0003', email: 'cleaner@example.com', website: 'https://sparkleclean.example.com',
      address: '789 Pine Street', city: 'San Francisco', state: 'CA', zipCode: '94104',
      latitude: 37.7855, longitude: -122.4090, serviceRadius: 20, priceRange: 2, yearEstablished: 2018,
      insured: true, verified: true, featured: true, avgRating: 4.9, reviewCount: 234,
      category: homeSubcategories[3]
    },
    {
      owner: businessOwners[3], name: 'Cool Breeze HVAC', slug: 'cool-breeze-hvac',
      description: 'Complete HVAC services including installation, repair, and maintenance for heating and cooling systems.',
      shortDescription: 'Expert HVAC installation and repair',
      phone: '555-200-0004', email: 'hvac@example.com', website: 'https://coolbreezehvac.example.com',
      address: '321 Elm Road', city: 'Oakland', state: 'CA', zipCode: '94601',
      latitude: 37.8044, longitude: -122.2712, serviceRadius: 35, priceRange: 3, yearEstablished: 2012,
      licenseNumber: 'HVAC-11111', insured: true, verified: true, featured: true, avgRating: 4.7, reviewCount: 178,
      category: homeSubcategories[2]
    },
    {
      owner: businessOwners[4], name: 'Green Thumb Landscaping', slug: 'green-thumb-landscaping',
      description: 'Full-service landscaping company offering lawn care, garden design, irrigation systems, and outdoor living spaces.',
      shortDescription: 'Transform your outdoor space with expert landscaping',
      phone: '555-200-0005', email: 'landscaper@example.com', website: 'https://greenthumbland.example.com',
      address: '567 Garden Way', city: 'Berkeley', state: 'CA', zipCode: '94702',
      latitude: 37.8716, longitude: -122.2727, serviceRadius: 25, priceRange: 2, yearEstablished: 2014,
      insured: true, verified: true, featured: false, avgRating: 4.5, reviewCount: 92,
      category: homeSubcategories[4]
    },
    {
      owner: businessOwners[5], name: 'Top Notch Roofing', slug: 'top-notch-roofing',
      description: 'Professional roofing contractors specializing in new installations, repairs, and inspections for all roof types.',
      shortDescription: 'Quality roofing services you can trust',
      phone: '555-200-0006', email: 'roofer@example.com', website: 'https://topnotchroofing.example.com',
      address: '890 Roof Lane', city: 'Daly City', state: 'CA', zipCode: '94014',
      latitude: 37.6879, longitude: -122.4702, serviceRadius: 40, priceRange: 4, yearEstablished: 2008,
      licenseNumber: 'ROOF-22222', insured: true, verified: true, featured: true, avgRating: 4.8, reviewCount: 145,
      category: homeSubcategories[5]
    },
    {
      owner: businessOwners[6], name: 'Perfect Finish Painting', slug: 'perfect-finish-painting',
      description: 'Interior and exterior painting services with attention to detail. We use premium paints and expert techniques.',
      shortDescription: 'Professional painting with perfect results',
      phone: '555-200-0007', email: 'painter@example.com', website: 'https://perfectfinish.example.com',
      address: '234 Color Street', city: 'San Francisco', state: 'CA', zipCode: '94105',
      latitude: 37.7897, longitude: -122.3972, serviceRadius: 20, priceRange: 2, yearEstablished: 2016,
      insured: true, verified: true, featured: false, avgRating: 4.6, reviewCount: 67,
      category: homeSubcategories[6]
    },
    {
      owner: businessOwners[7], name: 'Handy Helper Services', slug: 'handy-helper-services',
      description: 'Your go-to handyman for all household repairs. From furniture assembly to minor plumbing and electrical fixes.',
      shortDescription: 'Reliable handyman for all your home repairs',
      phone: '555-200-0008', email: 'handyman@example.com', website: 'https://handyhelper.example.com',
      address: '456 Fix-It Ave', city: 'South San Francisco', state: 'CA', zipCode: '94080',
      latitude: 37.6547, longitude: -122.4077, serviceRadius: 15, priceRange: 1, yearEstablished: 2019,
      insured: true, verified: true, featured: false, avgRating: 4.4, reviewCount: 43,
      category: homeSubcategories[7]
    },
    {
      owner: businessOwners[8], name: 'Precision Auto Care', slug: 'precision-auto-care',
      description: 'Complete automotive repair and maintenance services. ASE certified technicians with state-of-the-art equipment.',
      shortDescription: 'Expert auto repair with guaranteed satisfaction',
      phone: '555-200-0009', email: 'mechanic@example.com', website: 'https://precisionauto.example.com',
      address: '789 Motor Road', city: 'San Francisco', state: 'CA', zipCode: '94107',
      latitude: 37.7650, longitude: -122.3950, serviceRadius: 30, priceRange: 2, yearEstablished: 2011,
      licenseNumber: 'AUTO-33333', insured: true, verified: true, featured: true, avgRating: 4.7, reviewCount: 198,
      category: mainCategories[1]
    },
    {
      owner: businessOwners[9], name: 'Pampered Paws Pet Grooming', slug: 'pampered-paws-grooming',
      description: 'Professional pet grooming services for dogs and cats. We treat your furry friends with love and care.',
      shortDescription: 'Loving care for your furry friends',
      phone: '555-200-0010', email: 'petgroomer@example.com', website: 'https://pamperedpaws.example.com',
      address: '123 Pet Lane', city: 'Oakland', state: 'CA', zipCode: '94602',
      latitude: 37.8199, longitude: -122.2341, serviceRadius: 15, priceRange: 2, yearEstablished: 2017,
      insured: true, verified: true, featured: false, avgRating: 4.9, reviewCount: 212,
      category: mainCategories[5]
    },
    {
      owner: businessOwners[10], name: 'Smart Start Tutoring', slug: 'smart-start-tutoring',
      description: 'Personalized tutoring services for students of all ages. Math, science, English, and test prep specialists.',
      shortDescription: 'Personalized tutoring for academic success',
      phone: '555-200-0011', email: 'tutor@example.com', website: 'https://smartstart.example.com',
      address: '456 Learning Way', city: 'Berkeley', state: 'CA', zipCode: '94703',
      latitude: 37.8753, longitude: -122.2656, serviceRadius: 20, priceRange: 3, yearEstablished: 2013,
      verified: true, featured: true, avgRating: 4.8, reviewCount: 134,
      category: mainCategories[7]
    },
    {
      owner: businessOwners[11], name: 'Capture Moments Photography', slug: 'capture-moments-photography',
      description: 'Professional photography for weddings, events, portraits, and commercial needs. Creating lasting memories.',
      shortDescription: 'Professional photography for all occasions',
      phone: '555-200-0012', email: 'photographer@example.com', website: 'https://capturemoments.example.com',
      address: '789 Photo Street', city: 'San Francisco', state: 'CA', zipCode: '94108',
      latitude: 37.7920, longitude: -122.4080, serviceRadius: 50, priceRange: 3, yearEstablished: 2015,
      insured: true, verified: true, featured: false, avgRating: 4.7, reviewCount: 89,
      category: mainCategories[4]
    },
    {
      owner: businessOwners[12], name: 'Delicious Bites Catering', slug: 'delicious-bites-catering',
      description: 'Full-service catering for events of all sizes. Custom menus, professional staff, and exceptional taste.',
      shortDescription: 'Exceptional catering for memorable events',
      phone: '555-200-0013', email: 'caterer@example.com', website: 'https://deliciousbites.example.com',
      address: '321 Catering Court', city: 'San Francisco', state: 'CA', zipCode: '94109',
      latitude: 37.7870, longitude: -122.4210, serviceRadius: 40, priceRange: 3, yearEstablished: 2014,
      insured: true, verified: true, featured: true, avgRating: 4.8, reviewCount: 167,
      category: mainCategories[4]
    },
    {
      owner: businessOwners[13], name: 'Floor Masters Installation', slug: 'floor-masters-installation',
      description: 'Expert flooring installation and repair. Hardwood, laminate, tile, carpet, and more.',
      shortDescription: 'Expert flooring for beautiful homes',
      phone: '555-200-0014', email: 'flooring@example.com', website: 'https://floormasters.example.com',
      address: '654 Floor Avenue', city: 'San Francisco', state: 'CA', zipCode: '94110',
      latitude: 37.7484, longitude: -122.4156, serviceRadius: 25, priceRange: 3, yearEstablished: 2016,
      licenseNumber: 'FLR-44444', insured: true, verified: true, featured: false, avgRating: 4.5, reviewCount: 78,
      category: homeSubcategories[9]
    },
    {
      owner: businessOwners[14], name: 'Master Woodworks Carpentry', slug: 'master-woodworks-carpentry',
      description: 'Custom carpentry and woodworking. Cabinets, furniture, decks, and custom millwork.',
      shortDescription: 'Custom carpentry and fine woodworking',
      phone: '555-200-0015', email: 'carpenter@example.com', website: 'https://masterwoodworks.example.com',
      address: '987 Wood Lane', city: 'Oakland', state: 'CA', zipCode: '94603',
      latitude: 37.7673, longitude: -122.1866, serviceRadius: 30, priceRange: 3, yearEstablished: 2009,
      licenseNumber: 'CARP-55555', insured: true, verified: true, featured: false, avgRating: 4.9, reviewCount: 98,
      category: homeSubcategories[8]
    },
  ];

  const businesses: any[] = [];
  for (const data of businessData) {
    const business = await prisma.business.create({
      data: {
        ownerId: data.owner.id,
        name: data.name,
        slug: data.slug,
        description: data.description,
        shortDescription: data.shortDescription,
        phone: data.phone,
        email: data.email,
        website: data.website,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        latitude: data.latitude,
        longitude: data.longitude,
        serviceRadius: data.serviceRadius,
        priceRange: data.priceRange,
        yearEstablished: data.yearEstablished,
        licenseNumber: data.licenseNumber,
        insured: data.insured,
        verified: data.verified,
        featured: data.featured,
        active: true,
        avgRating: data.avgRating,
        reviewCount: data.reviewCount,
        categories: {
          connect: [{ id: homeServicesCategory.id }, { id: data.category.id }],
        },
      },
    });
    businesses.push(business);
  }

  // ============================================
  // BUSINESS HOURS (for all businesses)
  // ============================================
  console.log('Creating business hours...');

  const daysOfWeek = [DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY, DayOfWeek.SUNDAY];

  for (const business of businesses) {
    for (const day of daysOfWeek) {
      await prisma.businessHours.create({
        data: {
          businessId: business.id,
          dayOfWeek: day,
          openTime: day === DayOfWeek.SUNDAY ? null : '08:00',
          closeTime: day === DayOfWeek.SUNDAY ? null : (day === DayOfWeek.SATURDAY ? '14:00' : '18:00'),
          isClosed: day === DayOfWeek.SUNDAY,
        },
      });
    }
  }

  // ============================================
  // SERVICE AREAS (for all businesses)
  // ============================================
  console.log('Creating service areas...');

  const cities = ['San Francisco', 'Oakland', 'Berkeley', 'Daly City', 'South San Francisco', 'Alameda', 'San Mateo', 'Fremont'];
  for (const business of businesses) {
    for (const city of cities) {
      await prisma.serviceArea.create({
        data: { businessId: business.id, city, state: 'CA' },
      });
    }
  }

  // ============================================
  // SERVICES (15+ per business type = 50+ total)
  // ============================================
  console.log('Creating services...');

  const servicesData = [
    // Plumbing services
    { businessIdx: 0, name: 'Drain Cleaning', description: 'Professional drain cleaning to remove clogs', price: 150, priceType: 'fixed', duration: 60, categoryIdx: 0 },
    { businessIdx: 0, name: 'Pipe Repair', description: 'Repair of leaking or damaged pipes', price: 200, priceType: 'fixed', duration: 90, categoryIdx: 0 },
    { businessIdx: 0, name: 'Water Heater Installation', description: 'Install new water heater', price: null, priceType: 'quote', duration: 180, categoryIdx: 0 },
    { businessIdx: 0, name: 'Toilet Repair', description: 'Fix running or clogged toilets', price: 125, priceType: 'fixed', duration: 45, categoryIdx: 0 },
    { businessIdx: 0, name: 'Faucet Installation', description: 'Install new faucets', price: 100, priceType: 'fixed', duration: 60, categoryIdx: 0 },
    { businessIdx: 0, name: 'Garbage Disposal Repair', description: 'Fix or replace garbage disposal', price: 175, priceType: 'fixed', duration: 60, categoryIdx: 0 },
    { businessIdx: 0, name: 'Sewer Line Inspection', description: 'Camera inspection of sewer lines', price: 250, priceType: 'fixed', duration: 90, categoryIdx: 0 },
    { businessIdx: 0, name: 'Emergency Plumbing', description: '24/7 emergency plumbing service', price: 300, priceType: 'fixed', duration: 120, categoryIdx: 0 },
    // Electrical services
    { businessIdx: 1, name: 'Outlet Installation', description: 'Install new electrical outlets', price: 100, priceType: 'fixed', duration: 45, categoryIdx: 1 },
    { businessIdx: 1, name: 'Panel Upgrade', description: 'Upgrade electrical panel', price: null, priceType: 'quote', duration: 240, categoryIdx: 1 },
    { businessIdx: 1, name: 'Lighting Installation', description: 'Install new lighting fixtures', price: 75, priceType: 'hourly', duration: 60, categoryIdx: 1 },
    { businessIdx: 1, name: 'Ceiling Fan Installation', description: 'Install ceiling fans', price: 150, priceType: 'fixed', duration: 90, categoryIdx: 1 },
    { businessIdx: 1, name: 'Smoke Detector Installation', description: 'Install smoke and CO detectors', price: 50, priceType: 'fixed', duration: 30, categoryIdx: 1 },
    { businessIdx: 1, name: 'EV Charger Installation', description: 'Install electric vehicle charger', price: null, priceType: 'quote', duration: 180, categoryIdx: 1 },
    { businessIdx: 1, name: 'Whole House Surge Protection', description: 'Install surge protection', price: 350, priceType: 'fixed', duration: 120, categoryIdx: 1 },
    // Cleaning services
    { businessIdx: 2, name: 'Standard House Cleaning', description: 'Regular house cleaning', price: 120, priceType: 'fixed', duration: 120, categoryIdx: 3 },
    { businessIdx: 2, name: 'Deep Cleaning', description: 'Thorough deep cleaning', price: 250, priceType: 'fixed', duration: 240, categoryIdx: 3 },
    { businessIdx: 2, name: 'Move-out Cleaning', description: 'Complete cleaning for moving', price: 350, priceType: 'fixed', duration: 300, categoryIdx: 3 },
    { businessIdx: 2, name: 'Office Cleaning', description: 'Commercial office cleaning', price: 200, priceType: 'fixed', duration: 180, categoryIdx: 3 },
    { businessIdx: 2, name: 'Carpet Cleaning', description: 'Professional carpet cleaning', price: 150, priceType: 'fixed', duration: 90, categoryIdx: 3 },
    { businessIdx: 2, name: 'Window Cleaning', description: 'Interior and exterior windows', price: 175, priceType: 'fixed', duration: 120, categoryIdx: 3 },
    { businessIdx: 2, name: 'Post-Construction Cleaning', description: 'Clean up after construction', price: null, priceType: 'quote', duration: 360, categoryIdx: 3 },
    // HVAC services
    { businessIdx: 3, name: 'AC Repair', description: 'Air conditioning repair', price: 175, priceType: 'fixed', duration: 90, categoryIdx: 2 },
    { businessIdx: 3, name: 'Furnace Repair', description: 'Heating system repair', price: 175, priceType: 'fixed', duration: 90, categoryIdx: 2 },
    { businessIdx: 3, name: 'AC Installation', description: 'New air conditioning system', price: null, priceType: 'quote', duration: 480, categoryIdx: 2 },
    { businessIdx: 3, name: 'Duct Cleaning', description: 'Air duct cleaning service', price: 300, priceType: 'fixed', duration: 180, categoryIdx: 2 },
    { businessIdx: 3, name: 'Thermostat Installation', description: 'Smart thermostat setup', price: 150, priceType: 'fixed', duration: 60, categoryIdx: 2 },
    { businessIdx: 3, name: 'Seasonal Maintenance', description: 'HVAC tune-up service', price: 125, priceType: 'fixed', duration: 60, categoryIdx: 2 },
    // Landscaping services
    { businessIdx: 4, name: 'Lawn Mowing', description: 'Weekly lawn maintenance', price: 50, priceType: 'fixed', duration: 60, categoryIdx: 4 },
    { businessIdx: 4, name: 'Tree Trimming', description: 'Professional tree care', price: 200, priceType: 'fixed', duration: 120, categoryIdx: 4 },
    { businessIdx: 4, name: 'Irrigation Installation', description: 'Sprinkler system setup', price: null, priceType: 'quote', duration: 360, categoryIdx: 4 },
    { businessIdx: 4, name: 'Garden Design', description: 'Custom garden planning', price: 500, priceType: 'fixed', duration: 180, categoryIdx: 4 },
    { businessIdx: 4, name: 'Mulching & Fertilizing', description: 'Soil enrichment', price: 100, priceType: 'fixed', duration: 90, categoryIdx: 4 },
    // Roofing services
    { businessIdx: 5, name: 'Roof Inspection', description: 'Complete roof assessment', price: 150, priceType: 'fixed', duration: 60, categoryIdx: 5 },
    { businessIdx: 5, name: 'Shingle Repair', description: 'Repair damaged shingles', price: 300, priceType: 'fixed', duration: 120, categoryIdx: 5 },
    { businessIdx: 5, name: 'Full Roof Replacement', description: 'Complete roof replacement', price: null, priceType: 'quote', duration: 1440, categoryIdx: 5 },
    { businessIdx: 5, name: 'Gutter Installation', description: 'New gutter system', price: null, priceType: 'quote', duration: 240, categoryIdx: 5 },
    { businessIdx: 5, name: 'Leak Repair', description: 'Emergency leak fix', price: 250, priceType: 'fixed', duration: 90, categoryIdx: 5 },
    // Painting services
    { businessIdx: 6, name: 'Interior Room Painting', description: 'Single room painting', price: 300, priceType: 'fixed', duration: 240, categoryIdx: 6 },
    { businessIdx: 6, name: 'Exterior Painting', description: 'Full exterior painting', price: null, priceType: 'quote', duration: 960, categoryIdx: 6 },
    { businessIdx: 6, name: 'Cabinet Painting', description: 'Kitchen cabinet refinishing', price: null, priceType: 'quote', duration: 480, categoryIdx: 6 },
    { businessIdx: 6, name: 'Deck Staining', description: 'Deck restoration', price: 400, priceType: 'fixed', duration: 360, categoryIdx: 6 },
    // Handyman services
    { businessIdx: 7, name: 'Furniture Assembly', description: 'Assemble any furniture', price: 75, priceType: 'hourly', duration: 60, categoryIdx: 7 },
    { businessIdx: 7, name: 'TV Mounting', description: 'Mount TV on wall', price: 100, priceType: 'fixed', duration: 60, categoryIdx: 7 },
    { businessIdx: 7, name: 'Door Repair', description: 'Fix or replace doors', price: 125, priceType: 'fixed', duration: 90, categoryIdx: 7 },
    { businessIdx: 7, name: 'Drywall Repair', description: 'Patch drywall holes', price: 100, priceType: 'fixed', duration: 60, categoryIdx: 7 },
    { businessIdx: 7, name: 'Pressure Washing', description: 'Power wash exterior', price: 150, priceType: 'fixed', duration: 120, categoryIdx: 7 },
    // Auto services
    { businessIdx: 8, name: 'Oil Change', description: 'Standard oil change', price: 50, priceType: 'fixed', duration: 30, categoryIdx: 0 },
    { businessIdx: 8, name: 'Brake Service', description: 'Brake pad replacement', price: 200, priceType: 'fixed', duration: 90, categoryIdx: 0 },
    { businessIdx: 8, name: 'Engine Diagnostic', description: 'Computer diagnostic', price: 100, priceType: 'fixed', duration: 60, categoryIdx: 0 },
    { businessIdx: 8, name: 'Tire Rotation', description: 'Rotate all tires', price: 40, priceType: 'fixed', duration: 30, categoryIdx: 0 },
    { businessIdx: 8, name: 'AC Recharge', description: 'Car AC service', price: 150, priceType: 'fixed', duration: 60, categoryIdx: 0 },
    // Pet grooming
    { businessIdx: 9, name: 'Full Dog Grooming', description: 'Bath, cut, and styling', price: 75, priceType: 'fixed', duration: 90, categoryIdx: 0 },
    { businessIdx: 9, name: 'Cat Grooming', description: 'Gentle cat grooming', price: 60, priceType: 'fixed', duration: 60, categoryIdx: 0 },
    { businessIdx: 9, name: 'Nail Trimming', description: 'Pet nail care', price: 20, priceType: 'fixed', duration: 15, categoryIdx: 0 },
    { businessIdx: 9, name: 'Teeth Cleaning', description: 'Pet dental care', price: 30, priceType: 'fixed', duration: 20, categoryIdx: 0 },
    // Tutoring
    { businessIdx: 10, name: 'Math Tutoring', description: 'All levels of math', price: 60, priceType: 'hourly', duration: 60, categoryIdx: 0 },
    { businessIdx: 10, name: 'SAT Prep', description: 'SAT test preparation', price: 80, priceType: 'hourly', duration: 90, categoryIdx: 0 },
    { businessIdx: 10, name: 'Science Tutoring', description: 'Biology, Chemistry, Physics', price: 65, priceType: 'hourly', duration: 60, categoryIdx: 0 },
    { businessIdx: 10, name: 'Essay Writing Help', description: 'College application essays', price: 75, priceType: 'hourly', duration: 60, categoryIdx: 0 },
    // Photography
    { businessIdx: 11, name: 'Portrait Session', description: '1-hour portrait session', price: 200, priceType: 'fixed', duration: 60, categoryIdx: 0 },
    { businessIdx: 11, name: 'Wedding Photography', description: 'Full day coverage', price: 3000, priceType: 'fixed', duration: 480, categoryIdx: 0 },
    { businessIdx: 11, name: 'Event Photography', description: 'Corporate events', price: 500, priceType: 'fixed', duration: 180, categoryIdx: 0 },
    { businessIdx: 11, name: 'Product Photography', description: 'E-commerce photos', price: 50, priceType: 'fixed', duration: 30, categoryIdx: 0 },
    // Catering
    { businessIdx: 12, name: 'Corporate Lunch', description: 'Business lunch catering', price: 25, priceType: 'fixed', duration: 0, categoryIdx: 0 },
    { businessIdx: 12, name: 'Wedding Catering', description: 'Full wedding menu', price: null, priceType: 'quote', duration: 0, categoryIdx: 0 },
    { businessIdx: 12, name: 'Private Dinner Party', description: 'Intimate dinner catering', price: 75, priceType: 'fixed', duration: 0, categoryIdx: 0 },
    { businessIdx: 12, name: 'Cocktail Reception', description: 'Appetizers and drinks', price: 35, priceType: 'fixed', duration: 0, categoryIdx: 0 },
    // Flooring
    { businessIdx: 13, name: 'Hardwood Installation', description: 'Solid hardwood flooring', price: null, priceType: 'quote', duration: 480, categoryIdx: 9 },
    { businessIdx: 13, name: 'Tile Installation', description: 'Ceramic or porcelain tile', price: null, priceType: 'quote', duration: 480, categoryIdx: 9 },
    { businessIdx: 13, name: 'Laminate Flooring', description: 'Laminate floor install', price: 5, priceType: 'fixed', duration: 360, categoryIdx: 9 },
    { businessIdx: 13, name: 'Floor Refinishing', description: 'Sand and refinish floors', price: null, priceType: 'quote', duration: 480, categoryIdx: 9 },
    // Carpentry
    { businessIdx: 14, name: 'Custom Cabinets', description: 'Built-in cabinetry', price: null, priceType: 'quote', duration: 0, categoryIdx: 8 },
    { businessIdx: 14, name: 'Deck Building', description: 'Custom deck construction', price: null, priceType: 'quote', duration: 0, categoryIdx: 8 },
    { businessIdx: 14, name: 'Crown Molding', description: 'Crown molding installation', price: 15, priceType: 'fixed', duration: 0, categoryIdx: 8 },
    { businessIdx: 14, name: 'Custom Furniture', description: 'Handcrafted furniture', price: null, priceType: 'quote', duration: 0, categoryIdx: 8 },
  ];

  const services: any[] = [];
  for (const data of servicesData) {
    const service = await prisma.service.create({
      data: {
        businessId: businesses[data.businessIdx].id,
        categoryId: homeSubcategories[data.categoryIdx]?.id || homeSubcategories[0].id,
        name: data.name,
        description: data.description,
        price: data.price,
        priceType: data.priceType,
        duration: data.duration,
      },
    });
    services.push(service);
  }

  // ============================================
  // BUSINESS PHOTOS (for all businesses)
  // ============================================
  console.log('Creating business photos...');

  for (let i = 0; i < businesses.length; i++) {
    await prisma.businessPhoto.createMany({
      data: [
        { businessId: businesses[i].id, url: `/images/${businesses[i].slug}-1.jpg`, caption: 'Our team at work', isPrimary: true, order: 1 },
        { businessId: businesses[i].id, url: `/images/${businesses[i].slug}-2.jpg`, caption: 'Quality workmanship', order: 2 },
        { businessId: businesses[i].id, url: `/images/${businesses[i].slug}-3.jpg`, caption: 'Happy customers', order: 3 },
      ],
    });
  }

  // ============================================
  // REVIEWS (20+ reviews)
  // ============================================
  console.log('Creating reviews...');

  const reviewsData = [
    { businessIdx: 0, userIdx: 0, rating: 5, title: 'Excellent service!', content: 'Mike was professional, on time, and fixed our clogged drain quickly. Highly recommend!', pros: 'Fast, professional, fair pricing', cons: 'None' },
    { businessIdx: 0, userIdx: 1, rating: 5, title: 'Fixed my water heater', content: 'Came same day for emergency water heater issue. Very knowledgeable and efficient.', pros: 'Quick response, expert work', cons: 'None' },
    { businessIdx: 0, userIdx: 2, rating: 4, title: 'Good plumber', content: 'Did a great job on my bathroom pipes. A bit pricey but worth it.', pros: 'Quality work', cons: 'Slightly expensive' },
    { businessIdx: 1, userIdx: 0, rating: 4, title: 'Great electrical work', content: 'Sarah installed new outlets in our kitchen. Work was done well.', pros: 'Quality work, knowledgeable', cons: 'Had to wait a week for appointment' },
    { businessIdx: 1, userIdx: 3, rating: 5, title: 'Panel upgrade', content: 'Upgraded our electrical panel. Very professional and clean work.', pros: 'Expert, clean, efficient', cons: 'None' },
    { businessIdx: 2, userIdx: 0, rating: 5, title: 'Best cleaning service ever!', content: 'My house has never been this clean! Thorough and friendly team.', pros: 'Thorough, eco-friendly products, friendly staff', cons: 'None at all' },
    { businessIdx: 2, userIdx: 4, rating: 5, title: 'Amazing deep clean', content: 'Hired for a deep clean before a party. The house sparkled!', pros: 'Attention to detail, great products', cons: 'None' },
    { businessIdx: 2, userIdx: 5, rating: 4, title: 'Regular cleaning', content: 'Been using them weekly for 6 months. Consistently good.', pros: 'Reliable, consistent quality', cons: 'Sometimes run a bit late' },
    { businessIdx: 3, userIdx: 1, rating: 5, title: 'AC fixed perfectly', content: 'Our AC died in a heat wave. They came same day and fixed it!', pros: 'Emergency service, expert repair', cons: 'None' },
    { businessIdx: 3, userIdx: 6, rating: 4, title: 'Good HVAC service', content: 'Annual maintenance done well. Very thorough inspection.', pros: 'Detailed inspection, helpful tips', cons: 'Pricey for maintenance' },
    { businessIdx: 4, userIdx: 2, rating: 5, title: 'Beautiful yard transformation', content: 'They completely redesigned our backyard. Absolutely stunning!', pros: 'Creative design, quality work', cons: 'Project took longer than expected' },
    { businessIdx: 5, userIdx: 3, rating: 5, title: 'New roof looks amazing', content: 'Professional team replaced our entire roof in 2 days.', pros: 'Fast, clean work, beautiful result', cons: 'None' },
    { businessIdx: 6, userIdx: 4, rating: 4, title: 'Interior painting', content: 'Painted 3 rooms. Good quality but took a bit longer than quoted.', pros: 'Great finish, neat work', cons: 'Slightly over time estimate' },
    { businessIdx: 7, userIdx: 5, rating: 5, title: 'Helpful handyman', content: 'Fixed multiple things around the house efficiently.', pros: 'Versatile, efficient, fair pricing', cons: 'None' },
    { businessIdx: 8, userIdx: 6, rating: 5, title: 'Honest mechanic!', content: 'Finally found an honest mechanic. They only fixed what was needed.', pros: 'Honest, fair prices, quality work', cons: 'None' },
    { businessIdx: 9, userIdx: 7, rating: 5, title: 'My dog loves them!', content: 'Best grooming experience. My pup came out looking fabulous.', pros: 'Gentle, skilled, patient with pets', cons: 'None' },
    { businessIdx: 10, userIdx: 8, rating: 5, title: 'SAT score improved!', content: 'My son\'s SAT score went up 200 points! Amazing tutors.', pros: 'Effective methods, patient, encouraging', cons: 'None' },
    { businessIdx: 11, userIdx: 9, rating: 5, title: 'Wedding photos are stunning', content: 'Captured our special day perfectly. Every photo is a treasure.', pros: 'Creative, professional, timely delivery', cons: 'None' },
    { businessIdx: 12, userIdx: 0, rating: 5, title: 'Corporate event catering', content: 'Catered our company event. Food was delicious and presentation was excellent.', pros: 'Delicious food, professional service', cons: 'None' },
    { businessIdx: 13, userIdx: 1, rating: 4, title: 'New hardwood floors', content: 'Beautiful hardwood installation. Some scheduling issues initially.', pros: 'Beautiful result, quality materials', cons: 'Initial scheduling confusion' },
    { businessIdx: 14, userIdx: 2, rating: 5, title: 'Custom built-ins', content: 'Built amazing custom bookshelves. True craftsmen!', pros: 'Expert craftsmanship, attention to detail', cons: 'None' },
  ];

  for (const data of reviewsData) {
    await prisma.review.create({
      data: {
        businessId: businesses[data.businessIdx].id,
        userId: consumers[data.userIdx].id,
        rating: data.rating,
        title: data.title,
        content: data.content,
        pros: data.pros,
        cons: data.cons,
        status: ReviewStatus.APPROVED,
        isVerified: true,
        aiSentiment: data.rating >= 4 ? 'positive' : data.rating >= 3 ? 'neutral' : 'negative',
        aiScore: data.rating / 5,
      },
    });
  }

  // ============================================
  // BOOKINGS (20+ bookings)
  // ============================================
  console.log('Creating bookings...');

  const bookingStatuses = [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.COMPLETED, BookingStatus.CANCELLED];

  for (let i = 0; i < 20; i++) {
    const businessIdx = i % businesses.length;
    const userIdx = i % consumers.length;
    const serviceIdx = businessIdx * 4 + (i % 4);
    const daysAhead = i - 5;
    const date = new Date();
    date.setDate(date.getDate() + daysAhead);
    const status = daysAhead < -2 ? BookingStatus.COMPLETED : daysAhead < 0 ? BookingStatus.CONFIRMED : bookingStatuses[i % 4];

    await prisma.booking.create({
      data: {
        businessId: businesses[businessIdx].id,
        userId: consumers[userIdx].id,
        serviceId: services[serviceIdx % services.length]?.id,
        date,
        startTime: `${9 + (i % 8)}:00`,
        endTime: `${10 + (i % 8)}:00`,
        status,
        totalPrice: 100 + (i * 25),
        notes: `Booking ${i + 1} notes`,
      },
    });
  }

  // ============================================
  // QUOTE REQUESTS (15+ quotes)
  // ============================================
  console.log('Creating quote requests...');

  const quoteDescriptions = [
    'Water heater replacement needed',
    'Full house rewiring project',
    'Move-out deep cleaning',
    'New AC installation for 2000 sqft home',
    'Complete backyard landscaping',
    'Full roof replacement',
    'Exterior house painting',
    'Kitchen cabinet refinishing',
    'Engine rebuild',
    'Wedding photography package',
    'Corporate event catering for 100 guests',
    'Whole house hardwood flooring',
    'Custom home office built-ins',
    'Bathroom plumbing renovation',
    'Smart home electrical setup',
  ];

  for (let i = 0; i < 15; i++) {
    const businessIdx = i % businesses.length;
    const userIdx = i % consumers.length;

    const quoteRequest = await prisma.quoteRequest.create({
      data: {
        businessId: businesses[businessIdx].id,
        userId: consumers[userIdx].id,
        serviceDescription: quoteDescriptions[i],
        details: `Detailed description for ${quoteDescriptions[i]}. Looking for professional service and competitive pricing.`,
        budget: `$${1000 + (i * 500)}-${2000 + (i * 500)}`,
        preferredDate: new Date(Date.now() + (7 + i) * 24 * 60 * 60 * 1000),
        aiEstimate: 1500 + (i * 300),
      },
    });

    // Add quotes for some requests
    if (i < 10) {
      await prisma.quote.create({
        data: {
          quoteRequestId: quoteRequest.id,
          price: 1500 + (i * 250),
          description: `Professional quote for ${quoteDescriptions[i]}`,
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    }
  }

  // ============================================
  // LEADS (20+ leads)
  // ============================================
  console.log('Creating leads...');

  const leadNames = [
    'Tom Wilson', 'Lisa Brown', 'James Miller', 'Sarah Johnson', 'Michael Davis',
    'Jennifer Lee', 'Robert Taylor', 'Maria Garcia', 'David Anderson', 'Emily White',
    'Chris Martin', 'Amanda Clark', 'Kevin Robinson', 'Rachel Green', 'Daniel Scott',
    'Laura Hill', 'Steven King', 'Nicole Adams', 'Brian Nelson', 'Ashley Moore',
  ];

  const leadSources = ['search', 'referral', 'ad', 'social', 'direct'];
  const leadStatuses = [LeadStatus.NEW, LeadStatus.CONTACTED, LeadStatus.QUALIFIED, LeadStatus.CONVERTED, LeadStatus.LOST];

  for (let i = 0; i < 20; i++) {
    const businessIdx = i % businesses.length;

    await prisma.lead.create({
      data: {
        businessId: businesses[businessIdx].id,
        name: leadNames[i],
        email: `${leadNames[i].toLowerCase().replace(' ', '.')}@example.com`,
        phone: `555-${300 + i}-${1000 + i}`,
        source: leadSources[i % leadSources.length],
        status: leadStatuses[i % leadStatuses.length],
        notes: `Interested in ${businesses[businessIdx].name} services`,
        aiScore: 0.5 + (Math.random() * 0.5),
      },
    });
  }

  // ============================================
  // FAVORITES (15+ favorites)
  // ============================================
  console.log('Creating favorites...');

  for (let i = 0; i < 15; i++) {
    const userIdx = i % consumers.length;
    const businessIdx = (i * 2) % businesses.length;

    await prisma.favorite.create({
      data: {
        userId: consumers[userIdx].id,
        businessId: businesses[businessIdx].id,
      },
    });
  }

  // ============================================
  // NOTIFICATIONS (20+ notifications)
  // ============================================
  console.log('Creating notifications...');

  const notificationTypes = ['booking', 'review', 'lead', 'quote', 'message'];
  const notificationTitles = {
    booking: 'New Booking',
    review: 'New Review',
    lead: 'New Lead',
    quote: 'Quote Request',
    message: 'New Message',
  };

  for (let i = 0; i < 20; i++) {
    const type = notificationTypes[i % notificationTypes.length];
    const userIdx = i < 10 ? i % consumers.length : i % businessOwners.length;
    const user = i < 10 ? consumers[userIdx] : businessOwners[userIdx];

    await prisma.notification.create({
      data: {
        userId: user.id,
        type,
        title: notificationTitles[type as keyof typeof notificationTitles],
        message: `You have a new ${type} notification. Check your dashboard for details.`,
        link: i < 10 ? '/my-bookings' : '/dashboard',
        read: i % 3 === 0,
      },
    });
  }

  // ============================================
  // MESSAGES (20+ messages)
  // ============================================
  console.log('Creating messages...');

  for (let i = 0; i < 20; i++) {
    const consumerIdx = i % consumers.length;
    const businessOwnerIdx = i % businessOwners.length;
    const businessIdx = businessOwnerIdx;

    await prisma.message.create({
      data: {
        senderId: i % 2 === 0 ? consumers[consumerIdx].id : businessOwners[businessOwnerIdx].id,
        receiverId: i % 2 === 0 ? businessOwners[businessOwnerIdx].id : consumers[consumerIdx].id,
        businessId: businesses[businessIdx].id,
        content: i % 2 === 0
          ? `Hi, I'm interested in your services. Can you provide more information?`
          : `Thank you for reaching out! We'd be happy to help. What specific service are you looking for?`,
        read: i % 3 === 0,
      },
    });
  }

  // ============================================
  // ANALYTICS (30 days for all businesses)
  // ============================================
  console.log('Creating analytics...');

  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    for (const business of businesses) {
      await prisma.businessAnalytics.create({
        data: {
          businessId: business.id,
          date,
          views: Math.floor(Math.random() * 100) + 20,
          searches: Math.floor(Math.random() * 50) + 10,
          clicks: Math.floor(Math.random() * 30) + 5,
          calls: Math.floor(Math.random() * 10) + 1,
          bookings: Math.floor(Math.random() * 5),
          quoteRequests: Math.floor(Math.random() * 3),
        },
      });
    }
  }

  console.log('Database seeded successfully with comprehensive data!');
  console.log(`
Summary:
- Categories: ${mainCategories.length + homeSubcategories.length + 4} total
- Users: ${consumers.length + businessOwners.length + 1} total
- Businesses: ${businesses.length}
- Services: ${services.length}
- Reviews: ${reviewsData.length}
- Bookings: 20
- Quote Requests: 15
- Leads: 20
- Favorites: 15
- Notifications: 20
- Messages: 20
- Analytics: ${30 * businesses.length} records
  `);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
